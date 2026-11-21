# EmpressVR

Next.js + TypeScript website rebuild for Empress Immersive LTD.

The active development work is on `feat/squarespace-faithful-rebuild`. It recreates the public Squarespace website using archived source copy and genuine site images. The feature branch can be reviewed on GitHub Pages; keep the live Squarespace site and checkout unchanged. Do not merge this branch until the remaining content, commerce and booking cutover checks are complete.

## Get started

Requires Node.js 20.9+ (Node 22 recommended).

```bash
npm install
npm run dev
```

Visit http://localhost:3000. External service keys are not required to run the starter.

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run content:validate
npm run audit:content
npm run test:e2e
```

GitHub Actions runs the checks above, including desktop/mobile Playwright tests. A committed `package-lock.json` and `npm ci` are still needed for fully reproducible dependency installs.

## Project structure

- `src/app` Next.js routes
- `src/components` shared visual components
- `src/features` content, commerce and scheduling modules
- `.cursor/rules` enforced agent development principles
- `.cursor/skills` original first-party agent skill packages automatically discovered by Cursor
- `.skills/README.md` source registry, update guidance and honest coverage gaps
- `docs/brand.md` source-backed EmpressVR brand identity, design taste, typography, colors and UI review checklist
- `docs` architecture, migration plan and inventory
- `supabase/` standard CLI config, timestamped migrations and local seed entry point (see `docs/migration/supabase.md`)

## Supabase database

Eight ordered migrations in `supabase/migrations/` define the 26-table
Postgres foundation, RLS policies, transactional booking/payment operations,
and public/private Storage buckets. See [Supabase setup](supabase/README.md)
for the one-time local setup, `supabase db reset`, `supabase test db`,
and later hosted deployment. Nothing has been pushed to a hosted database.

## Implementation status

On the feature branch, the home, projects, team, store, header and footer are source-backed reproductions. Other public pages render through reusable content templates. The local catalog includes 48 source snapshots, 7 projects, 9 team members, 4 products, 7 archived events and 160 imported public media assets. A future Supabase schema and export are prepared but not applied. The public preview is excluded from search indexing; live commerce and booking flows still use Squarespace. **No production Stripe, Supabase, or Google Calendar integration is implemented yet.** The source snapshots still require client verification, including the empty blog and image descriptions. Keep the existing site live until content, bookings and payments are independently verified.

Vercel Hobby is noncommercial-only. Use it only where eligible for development and previews. Select permitted commercial hosting before launching the business website.
