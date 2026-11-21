# EmpressVR structured content and media

The authoritative public copy remains in `src/content/legacy/`. The curated `catalog.json` identifies current projects, team members and products. The generator builds `content-index.json` with stable UUIDs and separate relational collections for pages, projects, team, products, events and blog posts. The blank original blog creates no blog posts; event dates are deliberately flagged for review.

Images live in one `media_assets` collection. Separate `site_media`, `page_media`, `project_media` and `product_media` relationships describe fixed homepage slots, page placements and ordered galleries. Team headshots, product covers and project covers are referenced by media IDs.

Run `npm run content:generate` to refresh records from the preserved source snapshots and `npm run content:validate` to verify all references. `npm run media:import` downloads approved public Squarespace CDN images, optimizes them for the web and saves them as content-addressed files in `public/media`. The metadata retains source URL, content hash, size, type, dimensions and future Supabase Storage object key. Failed imports remain marked remote and are recorded in `docs/migration/media-import-report.json`.

The branch-only importer workflow commits generated data and assets to the existing feature branch. Public images belong in a future Supabase Storage bucket; their metadata and content records belong in Postgres. Protected purchased downloads require a separate private bucket and strict access controls.

Before connecting Supabase, validate content, image rights, historical event dates and original quality. Existing Squarespace commerce and calendar links stay operational and the live site is unchanged.
