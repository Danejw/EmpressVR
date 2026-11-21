-- pgTAP schema/security smoke test. Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(10);

select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind='r' and c.relname = any(array[
     'media_assets','site_pages','projects','team_members','products','events','blog_posts',
     'site_media','page_media','project_media','product_media','staff_roles',
     'donation_campaigns','membership_plans','offerings','booking_slots','bookings',
     'customers','orders','order_items','payment_events','outbox_jobs','entitlements',
     'membership_applications','memberships','subscriptions',
       'product_downloads','booking_contacts','subscription_invoices','payment_adjustments'
   ]))::integer,
  30, 'All 30 required EmpressVR public tables exist'
);
select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relkind='r' and c.relrowsecurity
     and c.relname = any(array[
       'media_assets','site_pages','projects','team_members','products','events','blog_posts',
       'site_media','page_media','project_media','product_media','staff_roles',
       'donation_campaigns','membership_plans','offerings','booking_slots','bookings',
       'customers','orders','order_items','payment_events','outbox_jobs','entitlements',
       'membership_applications','memberships','subscriptions',
       'product_downloads','booking_contacts','subscription_invoices','payment_adjustments'
     ]))::integer,
  30, 'RLS is enabled on all 30 public tables'
);
select ok(has_table_privilege('anon','public.site_pages','select'),
  'Anonymous visitors can query published content subject to RLS');
select ok(not has_table_privilege('anon','public.site_pages','insert'),
  'Anonymous visitors have no content write grant');
select ok(not has_table_privilege('authenticated','public.orders','select'),
  'Authenticated browser clients cannot query payment orders directly');
select ok(not has_table_privilege('anon','public.bookings','insert'),
  'Anonymous visitors cannot insert bookings directly');
select ok(not has_function_privilege('anon',
  'private.reserve_booking_hold(uuid,uuid,text,integer,text,integer)','execute'),
  'Anonymous clients cannot invoke reservation function');
select ok(not has_function_privilege('authenticated',
  'private.apply_verified_payment(text,uuid,text,text,bigint,text)','execute'),
  'Authenticated clients cannot invoke provider event handler');
select is((select public from storage.buckets where id='site-media'), true,
  'Public site images have a public Storage bucket');
select is((select public from storage.buckets where id='paid-downloads'), false,
  'Purchased downloads are stored in a private bucket');

select * from finish();
rollback;
