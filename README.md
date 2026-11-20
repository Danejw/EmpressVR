# EmpressVR

Next.js + TypeScript website rebuild for Empress Immersive LTD.

The active development work is on `feat/squarespace-faithful-rebuild`. It recreates the public Squarespace website using archived source copy and genuine site images. Do not merge until visual, content, commerce and booking cutover checks are complete.

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
```

This initial scaffold has not been dependency-installed or built in this environment. After running `npm install`, commit `package-lock.json` and use `npm ci` in CI for reproducible installs.

## Project structure

- `src/app` Next.js routes
- `src/components` shared visual components
- `src/features` content, commerce and scheduling modules
- `.cursor/rules` enforced agent development principles
- `.cursor/skills` original first-party agent skill packages automatically discovered by Cursor
- `.skills/README.md` source registry, update guidance and honest coverage gaps
- `docs/brand.md` source-backed EmpressVR brand identity, design taste, typography, colors and UI review checklist
- `docs` architecture, migration plan and inventory

## Implementation status

On the feature branch, the home, projects, team, store, header and footer are source-backed reproductions. Other public pages render through reusable content templates. **No production Stripe, Supabase, or Google Calendar integration is implemented yet.** Source text snapshots have been imported from public Squarespace pages, but they have not been fully proofread against the live CMS export. The existing site should remain live until content, bookings, and payments are independently verified.

Vercel Hobby is noncommercial-only. Use it only where eligible for development and previews. Select permitted commercial hosting before launching the business website.
