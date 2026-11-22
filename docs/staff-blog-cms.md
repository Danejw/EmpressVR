# EVR-17: Staff Foundation and Blog CMS

## Scope
Private staff dashboard at /staff with role-aware global navigation. Existing Supabase staff_roles ("editor" and "admin") and TOTP MFA (AAL2) remain authoritative. Editors and admins can create, edit, preview, publish and unpublish posts. Administrators can invite staff. Regular members cannot read private drafts, upload staff media or mutate posts.

## Existing first-admin bootstrap
Use the Supabase Dashboard as project owner to assign the first administrator to a previously verified account. Confirm the intended user's identity before running:
```sql
insert into public.staff_roles(user_id,role)
values ('<verified auth.users.id>', 'admin')
on conflict (user_id) do update set role='admin';
```
Do not assign roles by user-controlled email metadata. No auto-promotion of unverified users.

## Dashboard
/ staff displays Blog Posts, Write a Post, Account Security and administrative invitations. Global navigation renders Sign in for visitors, Account for signed-in users and Dashboard for either staff role. This is a display convenience: authorization is enforced on the server and by RLS.

## Blog
- /staff/blog lists published and draft posts for staff with MFA.
- /staff/blog/new creates a post.
- /staff/blog/[id] edits a post, lets staff preview Markdown, select a team-profile author, select/upload cover images and publish/unpublish. First-publication slug is immutable to avoid breaking permalinks.
- /blog lists only published posts and /blog/[slug] renders an article with its featured image, excerpt and author when present. Public RLS never exposes drafts.
- Blog data is in public.blog_posts. Existing team_members remains public biographies, not login roles. Existing media_assets/site-media storage are reused. Blog images are stored at blog/<uuid>.<ext> with a strict filename pattern.
- Staff write operations require both a live admin/editor assignment and MFA AAL2. Browser clients never receive the service role key.

## Release verification
Run lint, TypeScript, unit tests, build, Playwright desktop/mobile and explicit SQL RLS tests for anonymous, member, editor and admin roles. Test first-admin MFA setup and one real draft -> preview -> publish -> unpublish cycle using an authorized staff account. No content should be published as part of automated tests. Keep this branch unmerged until final review.
