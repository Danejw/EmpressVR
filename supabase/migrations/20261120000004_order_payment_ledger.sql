-- Server-owned checkout, Stripe event ledger, fulfillment outbox and entitlements.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete restrict,
  booking_id uuid unique references public.bookings(id) on delete restrict,
  kind text not null check (kind in ('product','donation','membership')),
  provider_session_id text unique,
  amount_minor bigint not null check (amount_minor between 1 and 1000000000),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment','paid','failed','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.bookings add constraint booking_payment_order_fk
  foreign key (payment_order_id) references public.orders(id) on delete set null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  campaign_id uuid references public.donation_campaigns(id) on delete restrict,
  membership_plan_id uuid references public.membership_plans(id) on delete restrict,
  quantity integer not null default 1 check (quantity between 1 and 10000),
  unit_amount_minor bigint not null check (unit_amount_minor between 0 and 1000000000),
  cadence text not null default 'once'
    check (cadence in ('once','weekly','monthly','quarterly','yearly')),
  created_at timestamptz not null default now(),
  constraint order_line_exactly_one_catalog_ref
    check (num_nonnulls(product_id, campaign_id, membership_plan_id) = 1)
);
create index idx_order_items_order on public.order_items(order_id);
create index idx_orders_customer on public.orders(customer_id, created_at desc);
create index idx_orders_status on public.orders(status, created_at);

create table public.payment_events (
  event_id text primary key check (length(event_id) between 1 and 255),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider_session_id text not null,
  kind text not null check (kind in ('paid','failed','full_refund')),
  amount_minor bigint not null check (amount_minor between 1 and 1000000000),
  currency varchar(3) not null check (currency ~ '^[A-Z]{3}$'),
  received_at timestamptz not null default now()
);
create index idx_payment_events_order on public.payment_events(order_id);

create table public.outbox_jobs (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique check (length(dedupe_key) between 1 and 255),
  kind text not null check (kind in ('order_paid','booking_confirmed','booking_cancelled')),
  order_id uuid references public.orders(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_outbox_next on public.outbox_jobs(status, available_at);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  status text not null default 'active' check (status in ('active','revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;
alter table public.outbox_jobs enable row level security;
alter table public.entitlements enable row level security;
revoke all on public.customers, public.orders, public.order_items, public.payment_events,
  public.outbox_jobs, public.entitlements from anon, authenticated;
grant all on public.customers, public.orders, public.order_items, public.payment_events,
  public.outbox_jobs, public.entitlements to service_role;
