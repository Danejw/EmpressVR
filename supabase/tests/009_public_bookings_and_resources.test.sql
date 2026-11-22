-- Public free booking, privacy, idempotency, capacity and cross-offering resource conflicts.
-- pgTAP runs in a rollback-only transaction.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(13);
select has_table('public','booking_resources','Shared resources table exists');
select ok((select relrowsecurity from pg_class where oid='public.booking_resources'::regclass),
  'Shared resources have RLS');
select ok(not has_table_privilege('anon','public.bookings','insert'),
  'Visitors cannot insert directly into the reservation ledger');
select ok(not has_function_privilege('anon',
  'public.reserve_public_free_booking(uuid,text,integer,text)','execute'),
  'Anonymous visitors cannot submit free reservations');
select ok(has_function_privilege('anon',
  'public.public_free_booking_slots()','execute'),
  'Public availability feed is readable without logging in');

insert into public.booking_resources(id,name,active)
values('30000000-0000-4000-8000-000000000001','QA Shared Resource',true);
insert into public.offerings(
  id,slug,title,kind,published,accepting_bookings,price_minor,currency
) values
('30000000-0000-4000-8000-000000000011','public-booking-qa-first',
 'Consultation A','appointment',true,true,0,'GBP'),
('30000000-0000-4000-8000-000000000012','public-booking-qa-second',
 'Consultation B','appointment',true,true,0,'GBP');
insert into public.booking_slots(
  id,offering_id,starts_at,ends_at,time_zone,capacity,
  max_seats_per_booking,available,requires_payment,resource_id
) values
('30000000-0000-4000-8000-000000000021',
 '30000000-0000-4000-8000-000000000011',now()+interval '5 days',
 now()+interval '5 days 1 hour','Europe/London',1,1,true,false,
 '30000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000022',
 '30000000-0000-4000-8000-000000000012',now()+interval '5 days 30 minutes',
 now()+interval '5 days 90 minutes','Europe/London',1,1,true,false,
 '30000000-0000-4000-8000-000000000001');

insert into auth.users(id,email,email_confirmed_at)
values
('30000000-0000-4000-8000-000000000031','qa-booker-1@example.invalid',now()),
('30000000-0000-4000-8000-000000000032','qa-booker-2@example.invalid',now()),
('30000000-0000-4000-8000-000000000033','qa-booker-unverified@example.invalid',null);

set local role anon;
select is((select count(*)::integer from public.public_free_booking_slots()
  where id in ('30000000-0000-4000-8000-000000000021',
    '30000000-0000-4000-8000-000000000022')),2,
  'Two overlapping candidate slots are visible before a booking');

set local role authenticated;
select set_config('request.jwt.claims',
 '{"sub":"30000000-0000-4000-8000-000000000031","role":"authenticated","aal":"aal1"}',true);
do $verify$
declare v_id uuid;v_retry uuid;v_blocked boolean;
begin
 v_id:=public.reserve_public_free_booking('30000000-0000-4000-8000-000000000021',
   'QA Booker One',1,'bookingQaIdempotency00001');
 v_retry:=public.reserve_public_free_booking('30000000-0000-4000-8000-000000000021',
   'QA Booker One',1,'bookingQaIdempotency00001');
 if v_retry<>v_id then raise exception 'Reservation retry created a duplicate';end if;
 if not exists(select 1 from public.my_free_bookings() where id=v_id) then
   raise exception 'Customer could not read own booking'; end if;
 if (select count(*) from public.public_free_booking_slots()
   where id in ('30000000-0000-4000-8000-000000000021',
    '30000000-0000-4000-8000-000000000022'))<>0 then
   raise exception 'Overlapping times still shown as available';end if;
 v_blocked:=false;
 begin
   perform public.reserve_public_free_booking('30000000-0000-4000-8000-000000000022',
     'QA Booker One',1,'bookingQaIdempotency00002');
 exception when others then v_blocked:=true;
 end;
 if not v_blocked then raise exception 'Conflicting second offering was booked';end if;
 if not public.cancel_my_free_booking(v_id) then
   raise exception 'Owner cancellation failed'; end if;
 if (select count(*) from public.public_free_booking_slots()
  where id in ('30000000-0000-4000-8000-000000000021',
    '30000000-0000-4000-8000-000000000022'))<>2 then
   raise exception 'Cancellation failed to release availability';end if;
end;$verify$;
select ok(true,'Idempotency, owner history, resource blocks and cancellation work');

select set_config('request.jwt.claims',
 '{"sub":"30000000-0000-4000-8000-000000000032","role":"authenticated","aal":"aal1"}',true);
do $verify$
declare v_id uuid;v_blocked boolean;
begin
 v_id:=public.reserve_public_free_booking('30000000-0000-4000-8000-000000000022',
   'QA Booker Two',1,'bookingQaIdempotency00003');
 if v_id is null then raise exception 'Free booking failed';end if;
 if (select count(*) from public.my_free_bookings())<>1 then
   raise exception 'Customer read another account booking';end if;
 v_blocked:=false;
 begin
   perform public.cancel_my_free_booking(
     (select id from public.bookings where idempotency_key='bookingQaIdempotency00001'));
 exception when others then v_blocked:=true;
 end;
 if not v_blocked then raise exception 'Other user could cancel booking';end if;
end;$verify$;
select ok(true,'Second customer sees only own bookings and cannot cancel others');

select set_config('request.jwt.claims',
 '{"sub":"30000000-0000-4000-8000-000000000033","role":"authenticated","aal":"aal1"}',true);
do $verify$
declare blocked boolean:=false;
begin
 begin
   perform public.reserve_public_free_booking('30000000-0000-4000-8000-000000000021',
     'QA Unverified',1,'bookingQaIdempotency00004');
 exception when others then blocked:=position('Verify your email' in SQLERRM)>0;
 end;
 if not blocked then raise exception 'Unverified account created booking';end if;
end;$verify$;
select ok(true,'Unverified email cannot create a reservation');

reset role;
select is((select count(*)::integer from public.booking_contacts
 where email like 'qa-booker-%@example.invalid'),2,
 'Attendee contacts are written atomically and cancellations retain audit contact');
select is((select count(*)::integer from public.bookings
 where idempotency_key in ('bookingQaIdempotency00001','bookingQaIdempotency00003')),2,
 'Exactly one reservation per idempotency key');
select is((select count(*)::integer from public.outbox_jobs
 where booking_id in (select id from public.bookings
   where idempotency_key in ('bookingQaIdempotency00001','bookingQaIdempotency00003'))),3,
 'Confirmation and cancellation events are deduplicated');
select is((select count(*)::integer from public.booking_admin_audit
 where booking_id in (select id from public.bookings
   where idempotency_key in ('bookingQaIdempotency00001','bookingQaIdempotency00003'))),0,
 'Customer actions do not impersonate staff audit entries');
select * from finish();
rollback;
