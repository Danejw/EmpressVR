-- EVR-17 staff blog management and protected image uploads.
-- Existing published-content public read policies remain in place.
alter table public.blog_posts alter column id set default gen_random_uuid();
alter table public.blog_posts
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by uuid references auth.users(id) on delete set null;

-- Staff can view drafts only with TOTP MFA (AAL2).
create policy "mfa staff read all blog posts" on public.blog_posts
  for select to authenticated using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff create blog posts" on public.blog_posts
  for insert to authenticated with check (
    created_by = (select auth.uid()) and updated_by = (select auth.uid())
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff update blog posts" on public.blog_posts
  for update to authenticated
  using (
    (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  )
  with check (
    updated_by = (select auth.uid())
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
revoke insert,update,delete on public.blog_posts from anon,authenticated;
grant insert (slug,title,excerpt,body_markdown,status,published_at,featured_media_id,author_id,created_by,updated_by,updated_at)
  on public.blog_posts to authenticated;
grant update (slug,title,excerpt,body_markdown,status,published_at,featured_media_id,author_id,updated_by,updated_at)
  on public.blog_posts to authenticated;

create policy "mfa staff register blog media" on public.media_assets
  for insert to authenticated with check (
    status = 'imported'
    and storage_key ~ '^blog/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](png|jpg|jpeg|webp|gif|avif)$'
    and source_key = 'blog:' || id::text
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
grant insert (id,source_key,source_url,storage_key,alt_text,mime_type,byte_size,status)
  on public.media_assets to authenticated;

create policy "mfa staff insert blog storage files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'site-media'
    and name ~ '^blog/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}[.](png|jpg|jpeg|webp|gif|avif)$'
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff see blog storage files" on storage.objects
  for select to authenticated using (
    bucket_id = 'site-media' and name like 'blog/%'
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff remove blog storage files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'site-media' and name like 'blog/%'
    and (select auth.jwt() ->> 'aal') = 'aal2'
    and exists(select 1 from public.staff_roles sr
      where sr.user_id = (select auth.uid()) and sr.role in ('admin','editor'))
  );