# EmpressVR Squarespace migration: source, progress and launch gate

## Primary goal

Recreate the live EmpressVR public website very closely in Next.js. Preserve the brand, major section layouts, real images, published wording and existing URL paths. Small UX improvements are welcome; do not silently rewrite content. The client intends to replace Squarespace subscriptions, products, donations and Acuity scheduling with independently maintained integrations only after they are implemented and tested.

**Source:** Public https://www.empressvr.com/ and 2025 Empress Immersive Branding & Marketing Guide (private source PDF). Public pages mapped and scraped on **November 19, 2026**; these snapshots preserve what the site displayed at capture time.

## What is implemented on this branch

- Original-style white header, real EmpressVR black/white logo assets, navigation for Who We Are / Projects / Community / Education / Store, checkout link, Classes & Socials CTA, and original company footer.
- Front page composed around the original 2026 November fundraiser, Welcome to the Metaverse, TechAlchemy, Global Community, Empress tarot and mission sections, with source wording and original media references.
- Original project-grid destinations and artist/project imagery, team directory with current member roles and photos, and four published store listings with recorded prices and availability.
- **48 Markdown source snapshots**, one for each public root/detail page captured, including archived pages for project details, events, education, product details, legal terms and membership.
- Generic content renderer preserving Markdown headings, paragraphs, links and source imagery. Links to imported routes resolve locally; uncopied/transaction links stay on the old site.
- Existing `/home` alias redirects to `/`.
- Automated GitHub CI on the feature branch for dependency installation, lint, type checks, unit tests and production build.

## Coverage, verification and limitations

The initial public URL map contained 49 URLs, including the canonical home page and the duplicate `/home` alias. The archive contains 48 page snapshots (the canonical homepage is `home.md`; `/home` uses a redirect). Source content was extracted with Firecrawl. **Extraction is not equivalent to a complete CMS export or human-reviewed page-by-page visual verification.** The blog snapshot contains no meaningful body content.

The project is still under construction. Most long-form pages use a generic template. Several original embeds and dynamic widgets (e.g. events calendar, donation forms, subscription buttons, cart, forms, scheduling) are retained only as text or links; these are not yet operational new-site functionality.

Image URLs still reference Squarespace's CDN. Download licensed originals to `public/` before independence/cutover, and replace URLs using a structured mapping.

Store items: three displayed as Sold Out in the capture; the Fox Mask listing is £5. Purchase actions point to the existing store. Existing booking/donation pages include links to the original operational flows.

Legal pages and the public company footer were copied from the live site. They must be revalidated for current company information and new Supabase/Stripe/Google Calendar privacy practices before launching.

## Non-negotiable go-live checks

1. Compare every public page visually at desktop and mobile widths against live reference screenshots. Confirm typography, imagery, image crops, spacing, sections, buttons and navigation.
2. Reconcile every page's wording, links, alt text, gallery, download/attachment, event metadata and hero media against client-exported Squarespace content. Remove extraction artifacts without rewriting genuine copy.
3. Import and self-host approved source assets, validate URLs/SEO metadata, redirects, robots/sitemap, and image licensing.
4. Connect Supabase and Google Calendar; test slot concurrency, booking confirmations, rescheduling and cancellation, notifications and access controls.
5. Integrate Stripe in test mode; verify orders, digital file delivery, donations, recurring billing, signed webhooks, refunds, duplicate events, historical subscriptions and merchant accounts.
6. Ensure old Squarespace payments/bookings keep working until explicit launch authorization. Never switch DNS before all critical flows pass.
7. Run CI and browser smoke/regression tests. Ensure commercial production hosting is licensed appropriately. The present branch has no configured public preview deployment.

## Next priority

Create an eligible preview deployment and do a **side-by-side visual audit**. Fix above-the-fold discrepancies and image crops first. Then complete custom pages, real media migration, checkout and scheduling.
