# EmpressVR agent instructions

For **every UI, content, navigation or visual change**, read `docs/brand.md` before writing code. It contains the brand identity, design taste, approved palette, typography, page patterns, source references and approval boundaries.

Read `docs/architecture.md`, `docs/implementation-plan.md`, `docs/brand.md`, and the relevant **official publisher-authored** `.cursor/skills/*/SKILL.md` before changing a feature. See `.skills/README.md` for skill provenance and coverage. Apply `.cursor/rules/*.mdc` for project-specific decisions.

## Database and persistence reference

Before any Supabase table, schema, RLS, database query, CMS, staff, commerce, membership or scheduling change, read **`docs/database-schema.md`**. It documents all current application tables, their purposes, columns, real foreign keys and feature boundaries. Check that reference and the corresponding `supabase/migrations/` files before designing new tables or introducing duplicate records. Verify the actual target database when details may have changed, since the reference is a snapshot. **Update `docs/database-schema.md` in the same PR whenever tables, columns, relationships or their responsibilities change.** Distinguish `products`, `offerings` and `events`, and distinguish public `team_members` profiles from authorization in `staff_roles`.

Principles: simple, modular, composable, reusable, interoperable, verifiable, portable and compoundable.

- Review existing code before proposing new abstractions or dependencies.
- Scope each change; make minimal edits and test affected behavior.
- Use publisher-authored skills and version-matched official documentation for APIs. Read bundled `node_modules/next/dist/docs/` when working with Next.js.
- For user input, authentication, payment flows, databases and API work, consult `.cursor/skills/security-guidance/SKILL.md` and relevant `data/asvs/` reference files before implementation.
- For significant visual changes or interactive flows, use `.cursor/skills/playwright-cli/SKILL.md` to inspect and verify the UI in a real browser when the CLI is available.
- TypeScript strict mode. Avoid `any` and unsafe casts.
- Use semantic HTML, keyboard interaction and mobile-first responsive design.
- No real payments, migrations, or credentials without explicitly approved scope and proper test mode.
- Never discard old website content or disable the existing checkout before verified cutover.
- Do not assert tests passed unless they were actually executed.

## Squarespace-faithful rebuild branch

The client's approved migration direction is to preserve the live Squarespace site's layout, imagery, words and URL paths as closely as practical. Source snapshots are stored under `src/content/legacy/*.md`, where `__` encodes a nested URL slash. When editing copy, compare the live page; keep wording verbatim unless the user specifically requests a change. Do not replace real artwork with synthetic or stock imagery.

Maintain functioning checkout and bookings on the *existing* Squarespace/Acuity site until the corresponding Stripe/Calendar replacement is verified. Do not impersonate operational payment or scheduling capabilities with static buttons.

This branch uses CDN-hosted source images temporarily. Before commercial launch, export approved original media and host them independently, preserving licenses, captions and credits. The source snapshots may contain extraction artifacts or stale event embeds and require manual comparison before go-live. See `docs/migration/README.md`.
