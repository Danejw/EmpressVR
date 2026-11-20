# Automated content and browser audit

Run `npm run audit:content` to review source snapshot coverage, blank/thin pages, missing image alt text, Squarespace CDN dependencies and legacy links that do not have migrated routes. The machine-readable report is written to `test-results/content-audit.json`.

Run `npm run test:e2e` for Playwright smoke tests and the complete 49-route inventory on desktop and mobile Chromium. Browser checks verify HTTP responses, content presence except for the known empty blog snapshot, in-app link targets, source attributes on images, mobile horizontal overflow and the primary navigation interaction.

Both checks run in GitHub Actions on this feature branch. Download the `playwright-results` artifact from the Validate workflow for the audit JSON and failure screenshots/traces.

**Important limitations:** The static audit does not prove whether old Squarespace URLs or CDN images are reachable over the network. Old checkout and booking URLs remain intentionally external. Missing alt text is reported, not rewritten automatically. The `/blog` extraction is effectively empty. A complete Squarespace CMS/export comparison, image rights review and human visual inspection remain required before launch. No live payments, bookings, DNS or `main` branch changes are part of this audit.
