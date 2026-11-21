# EmpressVR media and Supabase migration

## Current verified content snapshot
The public Squarespace site was captured into 48 Markdown snapshots. Normalization produces 48 site pages, 7 projects, 9 team members, 4 products, 7 archived events, and zero blog posts (the source blog extraction was empty). The media library contains 160 source references including 2 logos; the import Action writes optimized, content-addressed images to public/media and records unique source URLs, stable IDs, checksums, dimensions, and storage object keys.

## Local adapters and rendering
The frontend reads structured JSON through src/features/content/repository.ts. The MediaImage component resolves stable asset IDs or original Markdown image references through that repository, and serves verified local image files. The importer retains the remote CDN URL as provenance and as a fallback for any failed download.

Fixed image slots are in site_media (e.g. home.hero, home.community and site.logo.dark). Project and product galleries have ordered join rows. Team headshots and featured images use foreign keys. This lets editors replace or reuse an image without changing page layout code.

## Standard Supabase CLI layout (not connected)

The version-controlled Supabase project lives at `supabase/` alongside `src/`. It contains:

- `config.toml` for local CLI configuration (no remote project reference or credentials).
- `migrations/20261120000000_content_media_foundation.sql` as the first timestamped migration, preserving the original content/media schema and RLS policies unchanged.
- `seed.sql` as the standard local seed entry point. It is intentionally empty so a reset cannot accidentally import unreviewed site content.
- `.gitignore` to exclude CLI-managed local state.

The timestamp prefix must contain 14 digits for Supabase CLI migration discovery. Future migrations should be created with `supabase migration new <name>`, reviewed, and added to this same directory. Do not maintain a duplicate declarative schema directory for these SQL migrations.

Once the Supabase CLI and Docker-compatible runtime are installed, run from the repository root:

```bash
supabase --version
supabase start
supabase db reset
supabase migration list
```

`db reset` recreates the **local** database from versioned migrations and runs `supabase/seed.sql`. Do not run it against a database that contains data you need to preserve. No local stack or hosted database has been started or changed by preparing this structure.

The existing `node scripts/export-supabase-seed.mjs` script produces `supabase/seed-content.sql` and `supabase/asset-upload-manifest.json` separately. Its preserved Squarespace content and image uploads require explicit review and a later import; neither is automatically applied on local reset. A future hosted deploy requires reviewing the target project's schema and migration history and explicitly selecting the remote target in Supabase CLI v3 (such as `supabase db push --remote` after approval).

## Complete schema-migration foundation

The repository now includes **eight sequential migrations** under
`supabase/migrations/`, creating 26 RLS-enabled application tables.
Besides the original content/media baseline, they cover staff roles,
fundraising campaigns, membership plans and applications, bookings and
capacity holds, orders, payment events, entitlement records, subscriptions,
and a private paid-download Storage bucket.

The full migration list, local reset commands, pgTAP tests, security model,
and hosted deployment procedure live in [supabase/README.md](../../supabase/README.md).
The migration SQL is prepared in version control. It has **not** been applied
to a hosted Supabase project, and live booking/commerce adapters are still
unconnected. This preserves Squarespace operations until cutover.

## Later content import and application integration
1. Create or designate the appropriate Supabase project and review **all eight** migration files plus the target project's current schema and migration history. Apply the complete set only to the intended project after approval.
2. Use the public site-media Storage bucket for public images. Files remain separate from Postgres metadata. Never upload paid digital downloads to this public bucket; paid assets need a separately secured private bucket.
3. Run node scripts/export-supabase-seed.mjs to prepare supabase/seed-content.sql and supabase/asset-upload-manifest.json. Apply the SQL seed using an authenticated migration connection. It is idempotent by stable IDs and preserves the original Markdown bodies.
4. Upload each manifest entry to the site-media bucket using the exact stored key. Verify object hashes/counts and public URLs before switching the media provider.
5. Implement a Supabase-backed repository adapter with the same read functions as the local JSON adapter. Keep existing site routes and React components unchanged.
6. Staff role records and explicit content read grants are prepared in SQL. Build authorized server-side create/update/publish workflows and complete integration tests before enabling an admin dashboard. Public browser roles still have no direct writes.

## Validation and remaining review
Run npm run content:validate, npm run test, npm run build and npm run test:e2e. CI runs the browser tests at desktop and mobile sizes. The importer report lives in docs/migration/media-import-report.json.

The image inventory uses publicly accessible web representations capped at 2500 pixels, which may not be the uncompressed original uploads. Check image quality, crop, licensing, alt text, outdated event dates and the blank blog capture with the client. The blog, donations, commerce, bookings and subscriptions still require separate implementations and approval before production cutover.

No Supabase account credentials or connection details are stored in the repository. The original Squarespace site stays operational.
