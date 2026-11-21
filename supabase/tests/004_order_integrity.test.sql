begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select plan(5);

select throws_ok($$
  insert into public.orders(kind,amount_minor,currency)
  values ('booking',2500,'GBP')
$$, '23514', null, 'A booking checkout must reference a reserved booking');

insert into public.offerings(id,slug,title,kind,published,accepting_bookings,price_minor)
values
  ('60000000-0000-4000-8000-000000000001','pgtest-booked-class','Booked class','class',true,true,2500),
  ('60000000-0000-4000-8000-000000000002','pgtest-other-class','Other class','class',true,true,2500);
insert into public.booking_slots(
  id,offering_id,starts_at,ends_at,time_zone,capacity,max_seats_per_booking,available,requires_payment
) values (
  '60000000-0000-4000-8000-000000000003',
  '60000000-0000-4000-8000-000000000001',
  now()+interval '2 days',now()+interval '2 days 1 hour','Europe/London',1,1,true,true
);
select private.reserve_booking_hold(
  '60000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000003',
  'testbooker',1,'bookingorderkey000001',15
);
insert into public.orders(id,booking_id,kind,amount_minor,currency)
select '60000000-0000-4000-8000-000000000004',id,'booking',2500,'GBP'
from public.bookings where idempotency_key='bookingorderkey000001';

select lives_ok($$
  insert into public.order_items(order_id,offering_id,quantity,unit_amount_minor)
  values ('60000000-0000-4000-8000-000000000004',
          '60000000-0000-4000-8000-000000000001',1,2500)
$$, 'A booking order can purchase its actual reserved offering');

select throws_ok($$
  insert into public.order_items(order_id,offering_id,quantity,unit_amount_minor)
  values ('60000000-0000-4000-8000-000000000004',
          '60000000-0000-4000-8000-000000000002',1,2500)
$$, 'P0001', 'Booking order offering does not match reserved offering',
  'Booking order cannot charge for another class');

insert into public.orders(id,kind,amount_minor,currency)
values ('60000000-0000-4000-8000-000000000005','product',2500,'GBP');
select throws_ok($$
  insert into public.order_items(order_id,offering_id,quantity,unit_amount_minor)
  values ('60000000-0000-4000-8000-000000000005',
          '60000000-0000-4000-8000-000000000001',1,2500)
$$, 'P0001', 'Product order requires a product line',
  'Product order cannot silently reference a booking');

select throws_ok($$
  insert into public.customers(contact_email)
  values ('invalid@')
$$, '23514', null, 'Contact email must pass basic validation');

select * from finish();
rollback;
