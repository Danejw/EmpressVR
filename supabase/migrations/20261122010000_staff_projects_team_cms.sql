-- MFA-gated editor/admin CMS for projects, project galleries, team biographies, and content media.
-- Public read policies from the initial content migration are preserved.
-- ASVS 2.2.2 and 6.5: protected writes require trusted staff roles and AAL2.
alter table public.projects enable row level security;
alter table public.team_members enable row level security;
alter table public.project_media enable row level security;
alter table public.site_pages enable row level security;

create policy "mfa staff read all projects" on public.projects
  for select to authenticated using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff create projects" on public.projects
  for insert to authenticated with check (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff update projects" on public.projects
  for update to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor')))
  with check ((select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor')));
grant insert (id,slug,title,subtitle,status,sort_order,featured_media_id,updated_at)
  on public.projects to authenticated;
grant update (title,subtitle,status,sort_order,featured_media_id,page_id,updated_at)
  on public.projects to authenticated;

create policy "mfa staff create team profiles" on public.team_members
  for insert to authenticated with check (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff update team profiles" on public.team_members
  for update to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor')))
  with check ((select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor')));
grant insert (id,slug,name,roles,group_name,external_url,headshot_media_id,sort_order,updated_at)
  on public.team_members to authenticated;
grant update (slug,name,roles,group_name,external_url,headshot_media_id,sort_order,page_id,updated_at)
  on public.team_members to authenticated;

create policy "mfa staff read project galleries" on public.project_media
  for select to authenticated using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff add project gallery items" on public.project_media
  for insert to authenticated with check (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff order project gallery items" on public.project_media
  for update to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor')))
  with check ((select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor')));
create policy "mfa staff remove project gallery items" on public.project_media
  for delete to authenticated using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
grant insert (id,project_id,media_asset_id,position) on public.project_media to authenticated;
grant update (position) on public.project_media to authenticated;
grant delete on public.project_media to authenticated;

create policy "mfa staff read all linked pages" on public.site_pages
  for select to authenticated using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff add linked pages" on public.site_pages
  for insert to authenticated with check (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff edit linked pages" on public.site_pages
  for update to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor')))
  with check ((select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor')));
grant insert (id,source_key,path,title,body_markdown,published,updated_at)
  on public.site_pages to authenticated;
grant update (title,body_markdown,published,updated_at)
  on public.site_pages to authenticated;

create policy "mfa staff register content media" on public.media_assets
  for insert to authenticated with check (
    status = 'imported'
    and storage_key ~ '^content/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](png|jpg|jpeg|webp|gif|avif)$'
    and source_key = 'content:' || id::text
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
grant insert (id,source_key,source_url,storage_key,alt_text,mime_type,byte_size,status)
  on public.media_assets to authenticated;
create policy "mfa staff upload content storage" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'site-media'
    and name ~ '^content/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](png|jpg|jpeg|webp|gif|avif)$'
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff see content storage" on storage.objects
  for select to authenticated using (
    bucket_id = 'site-media' and name like 'content/%'
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff remove content storage" on storage.objects
  for delete to authenticated using (
    bucket_id = 'site-media' and name like 'content/%'
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
