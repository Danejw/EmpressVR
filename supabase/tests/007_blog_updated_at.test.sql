-- Ensure the blog audit timestamp trigger is present in a fresh database.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select plan(1);
select ok(
  exists(select 1 from pg_trigger
    where tgrelid = 'public.blog_posts'::regclass
      and tgname = 'set_blog_post_updated_at'
      and not tgisinternal),
  'Blog updates are timestamped by the database'
);
select * from finish();
rollback;
