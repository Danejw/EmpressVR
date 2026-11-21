-- A page now has a typed presentation model. Markdown stays available for older edits
-- and as a rollback-compatible source during the progressive migration.
alter table public.site_pages
  add column if not exists body_sections jsonb;

alter table public.site_pages
  add constraint site_pages_body_sections_array check (
    body_sections is null or jsonb_typeof(body_sections) = 'array'
  );

comment on column public.site_pages.body_sections is
  'Ordered public page components: rich_text, gallery, cta. Prefer this to captured Squarespace markup.';
