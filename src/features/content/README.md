# Structured EmpressVR content

The content module provides typed local repository functions in repository.ts and a normalized JSON snapshot in content-index.json. The source material is the archived Squarespace Markdown and catalog.json. Build a new deterministic snapshot with npm run content:generate.

Collections: pages, projects, team_members, products, events, blog_posts, media_assets, site_media, page_media, project_media, product_media. MediaImage resolves stable media IDs and source URLs to local image files. The backend can later switch to Supabase queries through this adapter while preserving page components.

See docs/migration/supabase.md for the matching SQL schema and future dynamic content management steps.
