-- Staff CMS grants and policy existence; full impersonation tests need real MFA JWTs.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public,extensions;
select plan(8);
select ok(not has_table_privilege('anon','public.projects','insert,update,delete'), 'Anonymous cannot edit projects');
select ok(not has_table_privilege('anon','public.team_members','insert,update,delete'), 'Anonymous cannot edit team');
select ok(not has_table_privilege('anon','public.project_media','insert,update,delete'), 'Anonymous cannot edit galleries');
select ok(not has_table_privilege('anon','public.site_pages','insert,update,delete'), 'Anonymous cannot edit pages');
select ok((select count(*) from pg_policies where schemaname = 'public' and tablename = 'projects' and policyname like 'mfa staff %') = 3, 'Project CMS RLS is installed');
select ok((select count(*) from pg_policies where schemaname = 'public' and tablename = 'team_members' and policyname like 'mfa staff %') = 2, 'Team CMS RLS is installed');
select ok((select count(*) from pg_policies where schemaname = 'public' and tablename = 'project_media' and policyname like 'mfa staff %') = 4, 'Gallery CMS RLS is installed');
select ok((select count(*) from pg_policies where schemaname = 'public' and tablename = 'site_pages' and policyname like 'mfa staff %') = 3, 'Page CMS RLS is installed');
select * from finish();
rollback;
