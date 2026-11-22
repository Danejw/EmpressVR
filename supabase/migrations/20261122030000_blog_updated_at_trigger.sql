-- Keep blog audit timestamps accurate for all writes, including ones outside the CMS.
-- This is a SECURITY INVOKER trigger, with no elevated role or public RPC.
create function public.set_blog_post_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_blog_post_updated_at
before update on public.blog_posts
for each row execute function public.set_blog_post_updated_at();
