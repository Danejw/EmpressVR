-- EmpressVR content/media foundation. Apply only after selecting the intended Supabase project.
-- Generated records retain their stable UUIDs; binary media lives in Storage, never bytea columns.

create table if not exists public.media_assets (
  id uuid primary key,
  source_key text not null unique,
  source_url text not null,
  storage_key text,
  alt_text text not null default '',
  mime_type text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  byte_size bigint check (byte_size is null or byte_size >= 0),
  sha256 text,
  status text not null default 'remote' check (status in ('remote','imported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_pages (
  id uuid primary key,
  path text not null unique,
  source_key text not null unique,
  title text not null,
  body_markdown text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key,
  page_id uuid references public.site_pages(id) on delete set null,
  slug text not null unique,
  title text not null,
  subtitle text not null default '',
  featured_media_id uuid references public.media_assets(id) on delete set null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key,
  page_id uuid references public.site_pages(id) on delete set null,
  name text not null,
  slug text unique,
  external_url text,
  roles jsonb not null default '[]'::jsonb check (jsonb_typeof(roles) = 'array'),
  group_name text not null check (group_name in ('current','other','past')),
  headshot_media_id uuid references public.media_assets(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key,
  page_id uuid references public.site_pages(id) on delete set null,
  slug text not null unique,
  title text not null,
  description text not null default '',
  price_minor integer not null check (price_minor >= 0),
  currency varchar(3) not null default 'GBP',
  sold_out boolean not null default false,
  status text not null default 'draft' check (status in ('draft','active','sold_out','archived')),
  featured_media_id uuid references public.media_assets(id) on delete set null,
  sort_order integer not null default 0,
  stripe_product_id text,
  stripe_price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Stored prices are display-only until a verified Stripe integration is live.

create table if not exists public.events (
  id uuid primary key,
  page_id uuid references public.site_pages(id) on delete set null,
  slug text not null unique,
  title text not null,
  start_at timestamptz,
  end_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  date_review_required boolean not null default true,
  featured_media_id uuid references public.media_assets(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_dates_ordered check (start_at is null or end_at is null or end_at >= start_at)
);

create table if not exists public.blog_posts (
  id uuid primary key,
  page_id uuid references public.site_pages(id) on delete set null,
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body_markdown text not null default '',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  featured_media_id uuid references public.media_assets(id) on delete set null,
  author_id uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_media (
  slot text primary key,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict
);
create table if not exists public.page_media (
  id uuid primary key,
  page_id uuid not null references public.site_pages(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  position integer not null check (position >= 0),
  role text not null default 'body',
  unique (page_id,role,position)
);
create table if not exists public.project_media (
  id uuid primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  position integer not null check (position >= 0),
  unique (project_id,position)
);
create table if not exists public.product_media (
  id uuid primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  position integer not null check (position >= 0),
  unique (product_id,position)
);

create index if not exists idx_project_media_asset on public.project_media(media_asset_id);
create index if not exists idx_page_media_asset on public.page_media(media_asset_id);
create index if not exists idx_product_media_asset on public.product_media(media_asset_id);
create index if not exists idx_events_start on public.events(start_at);

-- RLS permits public reads of published site content. No public writes.
alter table public.media_assets enable row level security;
alter table public.site_pages enable row level security;
alter table public.projects enable row level security;
alter table public.team_members enable row level security;
alter table public.products enable row level security;
alter table public.events enable row level security;
alter table public.blog_posts enable row level security;
alter table public.site_media enable row level security;
alter table public.page_media enable row level security;
alter table public.project_media enable row level security;
alter table public.product_media enable row level security;

create policy "public read imported media" on public.media_assets
  for select to anon,authenticated using (status = 'imported' and storage_key is not null);
create policy "public read published pages" on public.site_pages
  for select to anon,authenticated using (published);
create policy "public read projects" on public.projects
  for select to anon,authenticated using (status = 'published');
create policy "public read team directory" on public.team_members
  for select to anon,authenticated using (true);
create policy "public read products" on public.products
  for select to anon,authenticated using (status in ('active','sold_out'));
create policy "public read events" on public.events
  for select to anon,authenticated using (status in ('published','archived'));
create policy "public read blog" on public.blog_posts
  for select to anon,authenticated using (status = 'published');
create policy "public read public image slots" on public.site_media
  for select to anon,authenticated using (exists (
    select 1 from public.media_assets m where m.id=media_asset_id and m.status='imported'
  ));
create policy "public read published page galleries" on public.page_media
  for select to anon,authenticated using (exists (
    select 1 from public.site_pages p where p.id=page_id and p.published
  ));
create policy "public read published project galleries" on public.project_media
  for select to anon,authenticated using (exists (
    select 1 from public.projects p where p.id=project_id and p.status='published'
  ));
create policy "public read public product galleries" on public.product_media
  for select to anon,authenticated using (exists (
    select 1 from public.products p where p.id=product_id and p.status in ('active','sold_out')
  ));

-- Supabase Storage bucket. The file upload task comes later, after project connection.
-- Use a distinct private bucket with server-side authorization for purchased digital files.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('site-media','site-media',true,23068672,array['image/png','image/jpeg','image/webp','image/gif','image/avif'])
on conflict (id) do nothing;
