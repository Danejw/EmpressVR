-- Events CMS authorization and transactional staff editorial lifecycle.
-- Supabase local pgTAP runs in a transaction. No data persists.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(16);
select ok(not has_table_privilege('anon','public.events','insert'),'Visitors cannot insert events');
select ok(not has_table_privilege('anon','public.events','update'),'Visitors cannot update events');
select ok(not has_table_privilege('anon','public.events','delete'),'Visitors cannot delete events');
select ok(not has_function_privilege('anon',
  'public.save_staff_event(uuid,text,text,text,text,timestamptz,timestamptz,boolean,text,boolean,text,text,uuid)',
  'execute'),'Visitors cannot call the staff event RPC');
select ok(not (select prosecdef from pg_proc where oid=
  'public.save_staff_event(uuid,text,text,text,text,timestamptz,timestamptz,boolean,text,boolean,text,text,uuid)'::regprocedure),
  'Event RPC runs with caller privileges');
select is((select count(*)::integer from pg_policies where schemaname='public'
  and tablename='events' and policyname like 'mfa staff %'),3,'MFA staff RLS policies installed');
select ok(not has_column_privilege('authenticated','public.events','slug','update'),
  'Event slugs cannot be modified directly');
select ok(has_column_privilege('authenticated','public.events','title','update'),
  'Editor title field can be updated subject to RLS');
do $qa$
declare blocked boolean:=false;
begin
 begin
   insert into public.events(id,slug,title,status,date_review_required)
   values(gen_random_uuid(),'invalid-published-event','Cannot publish','published',true);
 exception when others then blocked:=true;
 end;
 if not blocked then raise exception 'Unverified event was published';end if;
end;$qa$;
select ok(true,'Publishing without reviewed dates is refused by the database');

insert into auth.users(id,email,email_confirmed_at)
 values('20000000-0000-4000-8000-000000000080','staff-events-qa@example.invalid',now());
insert into public.staff_roles(user_id,role)
 values('20000000-0000-4000-8000-000000000080','editor');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000080","role":"authenticated","aal":"aal2"}',true);
select ok(public.save_staff_event(
  null,'qa-calendar-event','QA Calendar','Original description','draft',
  null,null,true,'Europe/London',false,null,null,null
) is not null,'MFA editor can create a draft');
select is((select count(*)::integer from public.events where slug='qa-calendar-event'
  and status='draft'),1,'Draft event was saved');
select is((select count(*)::integer from public.site_pages where source_key like 'staff_event__%'
  and title='QA Calendar'),1,'Event description saved in linked CMS page');
select ok(public.save_staff_event(
  (select id from public.events where slug='qa-calendar-event'),
  'qa-calendar-event','QA Calendar','Updated description','published',
  now()+interval '3 days',now()+interval '3 days 1 hour',false,
  'Europe/London',false,'Online','https://example.org/join',null
) is not null,'MFA editor can publish a dated event');
select is((select count(*)::integer from public.site_pages where source_key like 'staff_event__%'
  and title='QA Calendar'),1,'Editing reused the original staff-owned content page');

select set_config('request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000080","role":"authenticated","aal":"aal1"}',true);
do $qa$
declare blocked boolean:=false;
begin
 begin
   perform public.save_staff_event(null,'qa-events-denied','Untrusted','',
     'draft',null,null,true,'Europe/London',false,null,null,null);
 exception when others then
   blocked:=position('Staff access and MFA' in SQLERRM)>0;
 end;
 if not blocked then raise exception 'AAL1 editor bypassed MFA';end if;
end;$qa$;
select ok(true,'Staff write RPC blocks a user without MFA');

reset role;
set local role anon;
select is((select count(*)::integer from public.events where slug='qa-calendar-event'),
  1,'Published event is publicly visible');
select * from finish();
rollback;
