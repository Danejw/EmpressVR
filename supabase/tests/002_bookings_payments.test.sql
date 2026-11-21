-- pgTAP behavior tests execute inside a transaction that always rolls back.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(11);

insert into public.offerings (id,slug,title,kind,published,accepting_bookings)
values ('10000000-0000-4000-8000-000000000001','test-slot','Test Slot','class',true,true);
insert into public.booking_slots (
  id,offering_id,starts_at,ends_at,time_zone,capacity,max_seats_per_booking,available,requires_payment
) values (
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  now()+interval '2 days',now()+interval '2 days 1 hour',
  'Europe/London',1,1,true,false
);
select is(
  (private.reserve_booking_hold(
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'attendee0001',1,'idempotencykey000001',15
  )).status,
  'held'::text, 'First available seat is held'
);
select is(
  (select count(*) from public.bookings where slot_id='10000000-0000-4000-8000-000000000002')::integer,
  1, 'Only one hold exists after first attempt'
);
-- Retrying the same request must return the original record.
select is(
  (private.reserve_booking_hold(
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'attendee0001',1,'idempotencykey000001',15
  )).id,
  (select id from public.bookings where idempotency_key='idempotencykey000001'),
  'Identical idempotent retry returns the original booking'
);
select throws_ok(
  $$select private.reserve_booking_hold(
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'attendee0002',1,'idempotencykey000002',15
  )$$,
  'P0001', 'Booking capacity exceeded', 'Second booking cannot oversell the slot'
);
select is(
  (private.confirm_booking(
    (select id from public.bookings where idempotency_key='idempotencykey000001')
  )).status,
  'confirmed'::text, 'Free booking can be confirmed'
);
select is(
  (private.cancel_booking(
    (select id from public.bookings where idempotency_key='idempotencykey000001')
  )).status,
  'cancelled'::text, 'Confirmed booking can be cancelled'
);

insert into public.orders (id,kind,provider_session_id,amount_minor,currency)
values ('20000000-0000-4000-8000-000000000001','product','cs_test_empress0001',500,'GBP');
select is(
  (private.apply_verified_payment(
    'evt_test_payment1','20000000-0000-4000-8000-000000000001',
    'cs_test_empress0001','paid',500,'GBP'
  )).status,
  'paid'::text, 'Signed payment outcome can mark a matching order paid'
);
select is(
  (private.apply_verified_payment(
    'evt_test_payment1','20000000-0000-4000-8000-000000000001',
    'cs_test_empress0001','paid',500,'GBP'
  )).status,
  'paid'::text, 'Duplicate event is safely idempotent'
);
select is(
  (select count(*) from public.outbox_jobs
   where dedupe_key='order_paid:20000000-0000-4000-8000-000000000001')::integer,
  1, 'Paid event creates one fulfillment outbox job'
);
select is(
  (private.apply_verified_payment(
    'evt_test_refund1','20000000-0000-4000-8000-000000000001',
    'cs_test_empress0001','full_refund',500,'GBP'
  )).status,
  'refunded'::text, 'Full refund moves a paid order to refunded'
);
select is(
  (select count(*) from public.outbox_jobs
   where dedupe_key='order_refunded:20000000-0000-4000-8000-000000000001')::integer,
  1, 'Refund creates one revocation/reconciliation outbox job'
);

select * from finish();
rollback;
