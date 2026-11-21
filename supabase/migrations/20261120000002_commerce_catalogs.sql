-- Catalogs drive quotes; historical site prices are not automatically live.
create table public.donation_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(slug) between 1 and 128),
  title text not null check (length(title) > 0),
  description text not null default '',
  currency varchar(3) not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  minimum_minor bigint not null default 100 check (minimum_minor between 1 and 1000000000),
  maximum_minor bigint not null default 1000000 check (maximum_minor between minimum_minor and 1000000000),
  allowed_cadences text[] not null default array['once']::text[]
    check (cardinality(allowed_cadences) between 1 and 5 and
           allowed_cadences <@ array['once','weekly','monthly','quarterly','yearly']::text[]),
  published boolean not null default false,
  accepting_contributions boolean not null default false,
  stripe_product_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(slug) between 1 and 128),
  title text not null check (length(title) > 0),
  description text not null default '',
  currency varchar(3) not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  joining_fee_minor bigint not null default 0 check (joining_fee_minor between 0 and 1000000000),
  quarterly_amount_minor bigint not null default 0 check (quarterly_amount_minor between 0 and 1000000000),
  published boolean not null default false,
  accepting_applications boolean not null default false,
  stripe_product_id text unique,
  stripe_price_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paid_plan_has_charge check (joining_fee_minor > 0 or quarterly_amount_minor > 0)
);
create index idx_campaigns_public on public.donation_campaigns(published, accepting_contributions);
create index idx_membership_plans_public on public.membership_plans(published, accepting_applications);

alter table public.donation_campaigns enable row level security;
alter table public.membership_plans enable row level security;
revoke all on public.donation_campaigns, public.membership_plans from anon, authenticated;
grant select on public.donation_campaigns, public.membership_plans to anon, authenticated;
grant all on public.donation_campaigns, public.membership_plans to service_role;
create policy "public published campaigns" on public.donation_campaigns
  for select to anon, authenticated using (published);
create policy "public published membership plans" on public.membership_plans
  for select to anon, authenticated using (published);
