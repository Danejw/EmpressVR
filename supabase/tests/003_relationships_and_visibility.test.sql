-- Relationship and actual visitor-role visibility tests.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select plan(13);

select ok(not has_table_privilege('anon','public.booking_contacts','select'),
  'Visitor cannot read guest booking contact details');
select ok(not has_table_privilege('authenticated','public.product_downloads','select'),
  'Browser session cannot enumerate purchased downloadable files');
select ok(not has_table_privilege('anon','public.subscription_invoices','select'),
  'Visitor cannot read recurring invoices');
select ok(not has_table_privilege('authenticated','public.payment_adjustments','select'),
  'Browser session cannot inspect refunds or disputes');
select ok(
  exists(select 1 from pg_constraint where conname='entitlement_purchased_product_fk'),
  'Entitlement product must match the purchased line');
select ok(
  exists(select 1 from pg_constraint where conname='order_line_exactly_one_catalog_ref'),
  'Order items have one catalog reference');
select ok(
  exists(select 1 from pg_constraint where conname='subscription_invoices_stripe_invoice_id_key'),
  'Stripe invoices have unique provider IDs');

insert into public.offerings(id,slug,title,kind,published,accepting_bookings,price_minor)
values ('30000000-0000-4000-8000-000000000001','pgtest-offering',
        'Audit course','class',true,false,500);
insert into public.booking_slots (
  id,offering_id,starts_at,ends_at,time_zone,capacity,max_seats_per_booking,available,requires_payment
) values (
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000001',
  now()+interval '1 day',now()+interval '1 day 1 hour',
  'Europe/London',3,1,true,true
);

set local role anon;
select is(
  (select count(*) from public.booking_slots
   where id='30000000-0000-4000-8000-000000000002')::integer,
  0, 'Unbookable offerings must not expose slots to visitors'
);
reset role;

update public.offerings set accepting_bookings=true
where id='30000000-0000-4000-8000-000000000001';
set local role anon;
select is(
  (select count(*) from public.booking_slots
   where id='30000000-0000-4000-8000-000000000002')::integer,
  1, 'Open published offering exposes its future available slot'
);
reset role;

insert into public.products(
  id,slug,title,price_minor,currency,status
) values
  ('40000000-0000-4000-8000-000000000001','pgtest-product-a','Test file A',500,'GBP','active'),
  ('40000000-0000-4000-8000-000000000002','pgtest-product-b','Test file B',500,'GBP','active');
insert into public.orders(
  id,kind,provider_session_id,amount_minor,currency
) values (
  '40000000-0000-4000-8000-000000000003','product','cs_test_relationships',500,'GBP'
);
insert into public.order_items(
  id,order_id,product_id,quantity,unit_amount_minor,cadence
) values (
  '40000000-0000-4000-8000-000000000004',
  '40000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000001',1,500,'once'
);
select lives_ok($$
  insert into public.entitlements(order_item_id,product_id)
  values ('40000000-0000-4000-8000-000000000004',
          '40000000-0000-4000-8000-000000000001')
$$, 'Purchased product can receive an entitlement');
select throws_ok($$
  insert into public.entitlements(order_item_id,product_id)
  values ('40000000-0000-4000-8000-000000000004',
          '40000000-0000-4000-8000-000000000002')
$$, '23503', null, 'Entitlement cannot grant an unpurchased product');

select lives_ok($$
  insert into public.product_downloads(product_id,storage_key,filename,available)
  values ('40000000-0000-4000-8000-000000000001',
          'test/test-mask.stl','test-mask.stl',false)
$$, 'Purchased download maps to a product and private storage key');
select throws_ok($$
  insert into public.product_downloads(product_id,storage_bucket,storage_key,filename)
  values ('40000000-0000-4000-8000-000000000001',
          'site-media','test/public-download.stl','test.stl')
$$, '23514', null, 'Paid digital file cannot live in the public Storage bucket');

select * from finish();
rollback;
