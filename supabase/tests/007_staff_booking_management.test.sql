-- Booking management access checks. Run with supabase test db.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(14);
select ok(not has_table_privilege('anon','public.bookings','select'),'Visitors cannot read bookings');
select ok(not has_table_privilege('anon','public.booking_contacts','select'),'Visitors cannot read attendee contacts');
select ok(not has_table_privilege('anon','public.booking_admin_audit','select'),'Visitors cannot read audit history');
select ok(not has_table_privilege('authenticated','public.bookings','delete'),'Users cannot delete reservations');
select ok(not has_table_privilege('authenticated','public.booking_admin_audit','insert'),'Users cannot forge audit history');
select ok(not has_function_privilege('anon','public.admin_reserve_free_booking(uuid,text,text,integer,text)','execute'),'Visitors cannot book through admin endpoint');
select ok(not has_function_privilege('anon','public.admin_cancel_free_booking(uuid)','execute'),'Visitors cannot cancel through admin endpoint');
select ok(not (select prosecdef from pg_proc where oid='public.admin_reserve_free_booking(uuid,text,text,integer,text)'::regprocedure),'Reservation RPC runs with caller privileges');
select ok(not (select prosecdef from pg_proc where oid='public.admin_cancel_free_booking(uuid)'::regprocedure),'Cancellation RPC runs with caller privileges');
select is((select count(*)::integer from pg_trigger where tgname='booking_admin_guard_insert' and not tgisinternal),1,'Capacity guard installed');
select is((select count(*)::integer from pg_trigger where tgname='booking_admin_guard_cancel' and not tgisinternal),1,'Cancellation guard installed');
select is((select count(*)::integer from pg_trigger where tgname='booking_admin_log_cancel' and not tgisinternal),1,'Cancellation audit trigger installed');
select ok((select count(*) from pg_policies where schemaname='public' and tablename='booking_contacts' and policyname='mfa admins read attendee contacts')=1,'Contact RLS enabled for admins');
-- Real transactional exercise using synthetic identities and a local free slot.
-- In production, all such QA fixtures must be rolled back.
insert into auth.users(id,email,email_confirmed_at)
values('10000000-0000-4000-8000-000000000139','booking-admin-qa@example.invalid',now());
insert into public.staff_roles(user_id,role)
values('10000000-0000-4000-8000-000000000139','admin');
insert into public.offerings(id,slug,title,kind,published,accepting_bookings,price_minor,currency)
values('10000000-0000-4000-8000-000000000131','admin-booking-qa','Booking admin QA','class',false,false,0,'GBP');
insert into public.booking_slots(id,offering_id,starts_at,ends_at,time_zone,capacity,max_seats_per_booking,available,requires_payment)
values('10000000-0000-4000-8000-000000000132',
 '10000000-0000-4000-8000-000000000131',now()+interval '3 days',
 now()+interval '3 days 1 hour','Europe/London',1,1,true,false);

set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"10000000-0000-4000-8000-000000000139","role":"authenticated","aal":"aal2"}',true);
do $qa$
declare
 v_id uuid;
 v_retry uuid;
 v_blocked boolean;
begin
 v_id:=public.admin_reserve_free_booking('10000000-0000-4000-8000-000000000132',
   'QA Attendee','qa-attendee@example.invalid',1,'bookingadminqaexample001');
 v_retry:=public.admin_reserve_free_booking('10000000-0000-4000-8000-000000000132',
   'QA Attendee','qa-attendee@example.invalid',1,'bookingadminqaexample001');
 if v_retry<>v_id then raise exception 'Free reservation was not idempotent';end if;
 if not exists(select 1 from public.booking_contacts bc
   where bc.booking_id=v_id and bc.email='qa-attendee@example.invalid') then
   raise exception 'Attendee contact not saved atomically';end if;

 v_blocked:=false;
 begin
   perform public.admin_reserve_free_booking('10000000-0000-4000-8000-000000000132',
     'Another Attendee','another@example.invalid',1,'bookingadminqaexample002');
 exception when others then v_blocked:=true;
 end;
 if not v_blocked then raise exception 'Oversold available seats';end if;

 v_blocked:=false;
 begin
   insert into public.bookings(id,offering_id,slot_id,attendee_ref,seats,status,idempotency_key,
     requires_payment,expires_at,confirmed_at)
   values(gen_random_uuid(),'10000000-0000-4000-8000-000000000131',
     '10000000-0000-4000-8000-000000000132','manual_qa',1,'confirmed',
     'bookingadminqaexample003',false,now()+interval '3 days',now());
 exception when others then v_blocked:=true;
 end;
 if not v_blocked then raise exception 'Direct booking insert bypassed capacity';end if;

 v_blocked:=false;
 begin
   update public.booking_slots set starts_at=starts_at+interval '30 minutes'
     where id='10000000-0000-4000-8000-000000000132';
 exception when others then v_blocked:=true;
 end;
 if not v_blocked then raise exception 'Rescheduled an occupied slot';end if;
 update public.booking_slots set available=false
   where id='10000000-0000-4000-8000-000000000132';

 if not public.admin_cancel_free_booking(v_id) then raise exception 'Cancellation failed';end if;
 if (select count(*) from public.booking_admin_audit where booking_id=v_id)<>2 then
   raise exception 'Expected manual booking and cancellation audit history';end if;

 -- No staff membership, even with aal2, must be denied.
 perform set_config('request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000138","role":"authenticated","aal":"aal2"}',true);
 if exists(select 1 from public.bookings where id=v_id) then
   raise exception 'Regular member could read booking details';end if;
 v_blocked:=false;
 begin
   perform public.admin_cancel_free_booking(v_id);
 exception when others then v_blocked:=true;
 end;
 if not v_blocked then raise exception 'Regular member accessed booking RPC';end if;

 -- Admin without second factor must also be denied.
 perform set_config('request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000139","role":"authenticated","aal":"aal1"}',true);
 if exists(select 1 from public.bookings where id=v_id) then
   raise exception 'Admin without MFA read booking details';end if;
end; $qa$;
reset role;
select is((select count(*) from public.outbox_jobs
 where booking_id in (select id from public.bookings
   where idempotency_key='bookingadminqaexample001'))::integer,
 2, 'Free booking and cancellation create two deduplicated outbox jobs');

select * from finish();
rollback;
