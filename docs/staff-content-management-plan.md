# Staff content management roadmap

Status: Plan only for Projects and Team. No database policies or management screens for these sections have been deployed by this plan.

## Dashboard pattern

Use a compact list of content sections on `/staff`. Each row has a linked section name, a small item count, and a separate accessible `+` action for creating an item. Blog is implemented first. Only show Projects and Team rows when their management routes are functional. Account security stays accessible; admin-only invitations are collapsed by default. Never put inactive or misleading controls on the dashboard.

## Access model

`staff_roles` has `editor` and `admin`; both may manage website content after live sign-in and TOTP MFA (AAL2). Only an admin may manage staff invitations and access roles. `team_members` contains public-facing biographies and must never grant login permissions. Reuse `requireStaff` at the route and server-action boundary, validate submitted fields, and enforce the same authorization in Supabase RLS. Do not expose a service-role key to the browser.

As of 2026-11-21, `projects` (7 rows), `team_members` (9 rows), `site_pages`, and `project_media` have public read policies, but no staff write policies. Add narrowly scoped MFA-gated editor/admin SELECT/INSERT/UPDATE policies for the content being managed before enabling writes. Keep public project visibility limited to published records and preserve the current public access model for team biographies.

## Phase A: Manage projects

Routes: `/staff/projects`, `/staff/projects/new`, `/staff/projects/[id]`.

List current projects, identify published/draft/archived states, and open an editor for title, slug, subtitle, featured media, sort order, and status. Support project gallery images using existing `project_media` and `media_assets`. A project's optional `page_id` links to `site_pages`; manage any associated page text and visibility carefully so public project links and page slugs remain consistent. Confirm before archive or destructive actions. Public listings continue to show only published projects.

Once create, edit, and status changes are verified, add a **Projects** row with count and `+` link on the dashboard.

## Phase B: Manage team profiles

Routes: `/staff/team`, `/staff/team/new`, `/staff/team/[id]`.

List and edit name, slug, public role labels (`roles` JSON array), group (`current`, `other`, `past`), external link, headshot, sort order, and optional linked `site_pages` biography. Reuse existing media and content components. These records are public immediately after saving, since `team_members` has no draft/status field. Use a clear save confirmation, and avoid adding a draft system until it is needed. Prefer moving former members to the past group over deletion.

Once create and edit are verified, add a **Team** row with count and `+` link. Do not combine public team management with the admin-only staff invitation feature.

## Verification gates

For each phase: verify server actions and RLS across anonymous, ordinary member, editor with and without MFA, and admin; test valid and invalid data; verify previews/public output and image handling; test mobile and keyboard interactions; run lint, TypeScript, unit tests, production build, and browser smoke tests. Keep all changes on the feature branch pending review and explicit merge approval.
