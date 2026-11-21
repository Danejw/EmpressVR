-- Close cross-module relationship gaps identified in the schema audit.
-- Additive migration: preserve the eight previously validated migrations.
-- Business catalogs remain unpublished until explicitly approved.

-- Paid bookings reference a priced offering and an order line.
alter table public.offerings
  add column price_minor bigint not null default 0
    check (price_minor between 0 and 1000000000),
  add column currency varchar(3) not null default 'GBP'
    check (currency ~ '^[A-Z]{3}$');
alter table public.orders drop constraint orders_kind_check;
alter table public.orders add constraint orders_kind_check
  check (kind in ('product','donation','membership','booking'));
alter table public.order_items
  add column offering_id uuid references public.offerings(id) on delete restrict;
alter table public.order_items drop constraint order_line_exactly_one_catalog_ref;
alter table public.order_items add constraint order_line_exactly_one_catalog_ref
  check (num_nonnulls(product_id,campaign_id,membership_plan_id,offering_id) = 1);
create index idx_order_items_offering on public.order_items(offering_id)
  where offering_id is not null;

-- Product entitlements cannot point to a different product than the purchased line.
alter table public.order_items add constraint order_items_id_product_id_unique
  unique (id, product_id);
alter table public.entitlements add constraint entitlement_purchased_product_fk
  foreign key (order_item_id, product_id)
  references public.order_items(id, product_id) on delete restrict;

-- Download binaries are stored in private Supabase Storage; metadata stays in SQL.
create table public.product_downloads (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  storage_bucket text not null default 'paid-downloads'
    check (storage_bucket = 'paid-downloads'),
  storage_key text not null unique check (length(storage_key) between 1 and 1024),
  filename text not null check (length(filename) between 1 and 255),
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_product_downloads_product on public.product_downloads(product_id);

-- Optional customer contact details; guest booking contact is stored separately.
-- Both tables are server-only because they contain personally identifiable data.
alter table public.customers
  add column contact_email text
    check (contact_email is null or
           (length(contact_email) between 3 and 254 and
            contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),
  add column display_name text
    check (display_name is null or length(display_name) between 1 and 200);
alter table public.bookings
  add column customer_id uuid references public.customers(id) on delete set null;
create index idx_bookings_customer on public.bookings(customer_id)
  where customer_id is not null;

create table public.booking_contacts (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  email text not null
    check (length(email) between 3 and 254 and
           email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  display_name text check (display_name is null or length(display_name) between 1 and 200),
  created_at timestamptz not null default now()
);

-- Recurring invoices and exceptional payment events need separate auditable records.
-- Provider webhooks and reconciliation remain future server integration work.
create table public.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete restrict,
  order_id uuid unique references public.orders(id) on delete restrict,
  stripe_invoice_id text not null unique check (length(stripe_invoice_id) > 0),
  amount_due_minor bigint not null check (amount_due_minor between 0 and 1000000000),
  amount_paid_minor bigint not null default 0
    check (amount_paid_minor between 0 and amount_due_minor),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  status text not null check (status in ('draft','open','paid','uncollectible','void')),
  period_start timestamptz,
  period_end timestamptz,
  updated_at timestamptz not null default now(),
  constraint invoice_period_order check (
    period_start is null or period_end is null or period_end > period_start
  )
);
create index idx_subscription_invoices_subscription
  on public.subscription_invoices(subscription_id,updated_at desc);

create table public.payment_adjustments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  stripe_event_id text not null unique check (length(stripe_event_id) between 1 and 255),
  stripe_object_id text,
  kind text not null check (kind in (
    'partial_refund','full_refund','dispute_opened','dispute_won','dispute_lost'
  )),
  amount_minor bigint not null check (amount_minor between 0 and 1000000000),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now()
);
create index idx_payment_adjustments_order
  on public.payment_adjustments(order_id,created_at desc);

-- The public slot catalog must not advertise suspended/unbookable offerings.
drop policy "public future slots" on public.booking_slots;
create policy "public future slots" on public.booking_slots
  for select to anon,authenticated using (
    available and starts_at > now() and exists (
      select 1 from public.offerings o
      where o.id = offering_id
        and o.published and o.accepting_bookings
        and o.kind <> 'informational'
    )
  );

alter table public.product_downloads enable row level security;
alter table public.booking_contacts enable row level security;
alter table public.subscription_invoices enable row level security;
alter table public.payment_adjustments enable row level security;
revoke all on public.product_downloads,public.booking_contacts,
  public.subscription_invoices,public.payment_adjustments from anon,authenticated;
grant all on public.product_downloads,public.booking_contacts,
  public.subscription_invoices,public.payment_adjustments to service_role;
