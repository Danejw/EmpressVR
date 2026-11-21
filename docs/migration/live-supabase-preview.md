# Live Supabase integration preview

Branch: `supabase-integration` in `Danejw/EmpressVR`. Do not merge until the content check passes.

## Rendering and data ownership

Next.js runs as a server-rendered app. The root layout calls `connection()` to render each request. Public queries use a Supabase publishable key, `cache: "no-store"`, and RLS. Admin credentials and the service-role key are never sent to the browser. The existing local content snapshot is used only when the public configuration is unavailable or a fetch fails, preserving local/offline development.

Published `site_pages` and page Markdown, `projects`, `team_members`, `products`, public `media_assets`, and `site_media` image slots now resolve through Supabase. The `events` table only displays records with `status = 'published'` and `date_review_required = false`; the seven imported events are archived, so an empty listing is expected until staff review event dates. Private payment, booking, membership and download tables remain outside public content reads.

Supabase assets must have `status='imported'` and a validated `storage_key` in the public `site-media` bucket. A newly linked image appears when its public metadata and object both exist. The site continues to use the preserved page layouts.

## Deploy to Vercel Preview

1. Connect the GitHub repository `Danejw/EmpressVR` to a Vercel project. Keep `main` as production branch and use `supabase-integration` as an isolated Preview deployment. Do not assign EmpressVR's live domain or replace Squarespace.
2. In Vercel Project Settings → Environment Variables, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for **Preview**, using the EmpressVR Supabase project public URL and its **publishable** key. Optionally configure the server-only aliases `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Do not configure a service-role key in public variables.
3. Redeploy the feature branch after the variables are added. The default Next.js deployment builds and runs a Node.js runtime; no static `output: "export"` is used on this branch.
4. Visit `/supabase-check`, `/projects`, `/who-we-are`, `/store`, `/events` and a content page. The Preview deployment must have `robots.txt` set to `Disallow: /`.

## Content-change test

1. Note a current published project's title in the preview.
2. In Supabase Table Editor → `projects`, temporarily modify that title, leaving `status='published'`.
3. Refresh `/projects` on the **same deployment URL**, without a GitHub commit or Vercel rebuild.
4. Confirm the new title appears. Restore the original title and refresh again.
5. Repeat with page Markdown, a team role and product description. Image changes require an imported asset and valid public storage object.

An empty or unpublished row must stay absent from the live catalog. If Supabase is unreachable, the site may display the archived snapshot. A failure to connect is not proof that live reads work.

## Scope of this phase

This implements public read-only content and dynamic server rendering. Admin authorization, edits, uploads, Stripe checkout, Google Calendar booking and production DNS cutover remain separate phases. GitHub Pages continues to display the `main` static snapshot until production deployment changes are approved.
