-- Staff authorization and explicit API grants for the existing content schema.
-- No browser role may create, edit, or delete content directly.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'admin')),
  assigned_at timestamptz not null default now()
);
alter table public.staff_roles enable row level security;
revoke all on public.staff_roles from anon, authenticated;
grant select on public.staff_roles to authenticated;
grant all on public.staff_roles to service_role;
create policy "staff can read own role" on public.staff_roles
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.media_assets, public.site_pages, public.projects,
  public.team_members, public.products, public.events, public.blog_posts,
  public.site_media, public.page_media, public.project_media, public.product_media
  from anon, authenticated;
grant select on public.media_assets, public.site_pages, public.projects,
  public.team_members, public.products, public.events, public.blog_posts,
  public.site_media, public.page_media, public.project_media, public.product_media
  to anon, authenticated;
grant all on public.media_assets, public.site_pages, public.projects,
  public.team_members, public.products, public.events, public.blog_posts,
  public.site_media, public.page_media, public.project_media, public.product_media
  to service_role;
