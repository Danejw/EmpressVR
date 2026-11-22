-- Events CMS built on the existing events + site_pages tables.
-- ASVS 2.1.2 / 2.2.2: editor/admin + AAL2 for every write, including direct REST.
-- No Google API connection, scheduled sync or public booking is enabled.

alter table public.events
  add column time_zone text not null default 'Europe/London',
  add column all_day boolean not null default false,
  add column location text,
  add column external_url text;

alter table public.events
  add constraint event_time_zone_length check (length(time_zone) between 1 and 80),
  add constraint event_location_length check (location is null or length(location)<=300),
  add constraint event_external_url_valid check (
    external_url is null or
    (length(external_url) <= 500 and external_url ~ '^https://[^[:space:]]+$')
  ),
  add constraint event_dates_valid check (
    start_at is null or end_at is null or end_at > start_at
  ),
  add constraint event_publish_requires_verified_dates check (
    status <> 'published' or
      (start_at is not null and end_at is not null
        and end_at > start_at and date_review_required = false)
  );

alter table public.events enable row level security;

create policy "mfa staff read events" on public.events
  for select to authenticated using (
    (select auth.jwt()->>'aal') = 'aal2'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id=(select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff create events" on public.events
  for insert to authenticated with check (
    (select auth.jwt()->>'aal') = 'aal2'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id=(select auth.uid()) and sr.role in ('admin','editor'))
  );
create policy "mfa staff edit events" on public.events
  for update to authenticated using (
    (select auth.jwt()->>'aal') = 'aal2'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id=(select auth.uid()) and sr.role in ('admin','editor'))
  ) with check (
    (select auth.jwt()->>'aal') = 'aal2'
    and exists (select 1 from public.staff_roles sr
      where sr.user_id=(select auth.uid()) and sr.role in ('admin','editor'))
  );

-- Explicitly restrict writes to authorized fields, in addition to row-level checks.
revoke insert, update, delete on public.events from anon, authenticated;
grant insert (id,slug,title,start_at,end_at,status,date_review_required,
  featured_media_id,updated_at,time_zone,all_day,location,external_url,page_id)
  on public.events to authenticated;
grant update (title,start_at,end_at,status,date_review_required,
  featured_media_id,updated_at,time_zone,all_day,location,external_url,page_id)
  on public.events to authenticated;

-- Atomic save: event row and its CMS page move together. Existing imported pages
-- are preserved: only pages with a generated staff_event__ source key are modified.
-- SECURITY INVOKER keeps all writes under existing MFA staff RLS.
create function public.save_staff_event(
  p_id uuid, p_slug text, p_title text, p_description text,
  p_status text, p_start_at timestamptz, p_end_at timestamptz,
  p_date_review_required boolean, p_time_zone text, p_all_day boolean,
  p_location text, p_external_url text, p_featured_media_id uuid
) returns uuid language plpgsql security invoker set search_path='' as $$
declare
  v_id uuid := coalesce(p_id,gen_random_uuid());
  v_old public.events%rowtype;
  v_page public.site_pages%rowtype;
  v_page_id uuid;
  v_source_key text := 'staff_event__' || v_id::text;
begin
  if (select auth.jwt()->>'aal') is distinct from 'aal2'
    or not exists(select 1 from public.staff_roles sr where
      sr.user_id=(select auth.uid()) and sr.role in ('editor','admin')) then
    raise exception 'Staff access and MFA are required';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug)>96
    or p_title is null or length(trim(p_title)) not between 1 and 160
    or p_description is null or length(p_description)>12000
    or p_status not in ('draft','published','archived')
    or p_date_review_required is null or p_time_zone is null
    or length(p_time_zone) not between 1 and 80 or p_all_day is null
    or (p_location is not null and length(p_location)>300)
    or (p_external_url is not null and
        (length(p_external_url)>500 or p_external_url !~ '^https://[^[:space:]]+$'))
    or ((p_start_at is null) <> (p_end_at is null))
    or (p_start_at is not null and p_end_at <= p_start_at)
    or (p_status='published' and
       (p_start_at is null or p_end_at is null or p_date_review_required)) then
    raise exception 'Invalid event details';
  end if;

  if p_id is not null then
    select * into v_old from public.events where id=p_id for update;
    if not found then raise exception 'Event not found'; end if;
    if v_old.slug <> p_slug then
      raise exception 'Event URLs cannot be changed after creation';
    end if;
  end if;

  if p_id is null then
    insert into public.events(
      id,slug,title,start_at,end_at,status,date_review_required,
      featured_media_id,time_zone,all_day,location,external_url
    ) values (
      v_id,p_slug,trim(p_title),p_start_at,p_end_at,p_status,
      p_date_review_required,p_featured_media_id,p_time_zone,p_all_day,
      p_location,p_external_url
    );
  else
    update public.events set
      title=trim(p_title),start_at=p_start_at,end_at=p_end_at,
      status=p_status,date_review_required=p_date_review_required,
      featured_media_id=p_featured_media_id,time_zone=p_time_zone,
      all_day=p_all_day,location=p_location,external_url=p_external_url,
      updated_at=clock_timestamp()
    where id=v_id;
  end if;

  if v_old.page_id is not null then
    select * into v_page from public.site_pages where id=v_old.page_id for update;
    if v_page.source_key = v_source_key then v_page_id:=v_page.id; end if;
  end if;
  if v_page_id is not null then
    update public.site_pages set title=trim(p_title),
      body_markdown=p_description,published=(p_status='published'),
      updated_at=clock_timestamp() where id=v_page_id;
  elsif length(trim(p_description))>0 then
    v_page_id:=gen_random_uuid();
    insert into public.site_pages(
      id,path,source_key,title,body_markdown,published
    ) values (
      v_page_id,'/event-content/' || v_id::text,v_source_key,
      trim(p_title),p_description,(p_status='published')
    );
    update public.events set page_id=v_page_id where id=v_id;
  end if;
  return v_id;
end; $$;

revoke execute on function public.save_staff_event(
  uuid,text,text,text,text,timestamptz,timestamptz,boolean,text,boolean,text,text,uuid
) from public,anon,authenticated;
grant execute on function public.save_staff_event(
  uuid,text,text,text,text,timestamptz,timestamptz,boolean,text,boolean,text,text,uuid
) to authenticated;
