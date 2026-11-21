-- Membership approval is independent of a successful payment.
create table public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  plan_id uuid references public.membership_plans(id) on delete restrict,
  kind text not null check (kind in ('community','co_op')),
  order_id uuid unique references public.orders(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','withdrawn')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint co_op_has_plan check (
    (kind = 'community' and plan_id is null) or
    (kind = 'co_op' and plan_id is not null)
  ),
  constraint only_reviewed_applications_have_reviewers check (
    status in ('pending','withdrawn') or reviewed_at is not null
  )
);
create index idx_membership_applications_customer on public.membership_applications(customer_id);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.membership_applications(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  plan_id uuid references public.membership_plans(id) on delete restrict,
  status text not null default 'active'
    check (status in ('active','suspended','ended')),
  approved_at timestamptz not null,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_memberships_customer on public.memberships(customer_id,status);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  membership_id uuid references public.memberships(id) on delete restrict,
  campaign_id uuid references public.donation_campaigns(id) on delete restrict,
  stripe_subscription_id text not null unique,
  cadence text not null check (cadence in ('weekly','monthly','quarterly','yearly')),
  status text not null check (status in ('incomplete','trialing','active','past_due','paused','unpaid','canceled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_exactly_one_purpose check (num_nonnulls(membership_id,campaign_id) = 1),
  constraint subscription_period_order check (
    current_period_start is null or current_period_end is null or
    current_period_end > current_period_start
  )
);
create index idx_subscriptions_customer on public.subscriptions(customer_id,status);

alter table public.membership_applications enable row level security;
alter table public.memberships enable row level security;
alter table public.subscriptions enable row level security;
revoke all on public.membership_applications, public.memberships, public.subscriptions from anon,authenticated;
grant all on public.membership_applications, public.memberships, public.subscriptions to service_role;
