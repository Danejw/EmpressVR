# EmpressVR media and Supabase migration

## Current verified content snapshot
The public Squarespace site was captured into 48 Markdown snapshots. Normalization produces 48 site pages, 7 projects, 9 team members, 4 products, 7 archived events, and zero blog posts (the source blog extraction was empty). The media library contains 160 source references including 2 logos; the import Action writes optimized, content-addressed images to public/media and records unique source URLs, stable IDs, checksums, dimensions, and storage object keys.

## Local adapters and rendering
The frontend reads structured JSON through src/features/content/repository.ts. The MediaImage component resolves stable asset IDs or original Markdown image references through that repository, and serves verified local image files. The importer retains the remote CDN URL as provenance and as a fallback for any failed download.

Fixed image slots are in site_media (e.g. home.hero, home.community and site.logo.dark). Project and product galleries have ordered join rows. Team headshots and featured images use foreign keys. This lets editors replace or reuse an image without changing page layout code.

## Proposed Supabase deployment
1. Create or designate the appropriate Supabase project, then review supabase/migrations/20261120_content_media_foundation.sql. It creates site_pages, projects, team_members, products, events, blog_posts, media_assets and explicit gallery and fixed-slot relations. Apply the migration to the chosen project only after reviewing its existing schema.
2. Use the public site-media Storage bucket for public images. Files remain separate from Postgres metadata. Never upload paid digital downloads to this public bucket; paid assets need a separately secured private bucket.
3. Run node scripts/export-supabase-seed.mjs to prepare supabase/seed-content.sql and supabase/asset-upload-manifest.json. Apply the SQL seed using an authenticated migration connection. It is idempotent by stable IDs and preserves the original Markdown bodies.
4. Upload each manifest entry to the site-media bucket using the exact stored key. Verify object hashes/counts and public URLs before switching the media provider.
5. Implement a Supabase-backed repository adapter with the same read functions as the local JSON adapter. Keep existing site routes and React components unchanged.
6. Add authenticated roles and authorization-tested create/update/publish workflows before building an admin dashboard. By default, this schema grants public reads to published content and no public writes.

## Validation and remaining review
Run npm run content:validate, npm run test, npm run build and npm run test:e2e. CI runs the browser tests at desktop and mobile sizes. The importer report lives in docs/migration/media-import-report.json.

The image inventory uses publicly accessible web representations capped at 2500 pixels, which may not be the uncompressed original uploads. Check image quality, crop, licensing, alt text, outdated event dates and the blank blog capture with the client. The blog, donations, commerce, bookings and subscriptions still require separate implementations and approval before production cutover.

No Supabase account credentials or connection details are stored in the repository. The original Squarespace site stays operational.
