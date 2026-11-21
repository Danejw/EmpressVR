# Clean architecture migration

The rebuild runs on the existing Next.js + Supabase + Vercel stack. Existing paths stay public; no redirects or commercial workflows are changed.

## Sources of truth

- Published `projects`, `products`, `team_members`, and `events` rows power structured listings and details.
- `media_assets` plus `page_media`, `project_media`, and `product_media` determine ordered galleries. Bundled imported media is a verified fallback for missing published asset rows; original Squarespace image URLs are never rendered.
- `site_pages.body_sections` stores ordered typed page sections (`rich_text`, `gallery`, `cta`). The `20261121000001_structured_page_sections.sql` migration introduces this field. Until rows are populated, the public `body_markdown` column is normalized and interpreted as read-only content sections.
- Interactive controls are React components, not saved Squarespace markup: contact, calendar, cart, membership/booking previews and actions.

## Hosted database cutover

**Do not update production Supabase as part of branch preview.** Inspect hosted migration history and apply the new additive migration explicitly after approval. Prepare and import edited `body_sections` for all 48 snapshots, validating each page's images and destinations before replacing Markdown as the source. Do not overwrite future manual edits: prefer only null `body_sections` rows and review diffs. After the migration, keep the Markdown compatibility path only until all pages have sections.

## Contact form

Set `RESEND_API_KEY` and `CONTACT_FROM_EMAIL` (verified sender domain) in the intended environment to enable server-side delivery to `info@empressvr.com`. Without those variables, pressing Send message opens the visitor's email client, with an explicit notice that they need to finish sending there. No success is claimed until the email provider confirms delivery. Configure spam/rate-abuse controls before high-volume public use.

## Checks and handoff

Run `npm run check`, `npm run content:validate`, `npm run test:e2e`; verify the entire 52-item external visitor checklist on a Vercel preview at desktop, tablet and mobile sizes. Never merge until image galleries, contact delivery, and URLs are verified. Checkout, booking and membership submission remain previews, and TechAlchemy ticket requests are directed to the organizers because no verified booking URL was captured.
