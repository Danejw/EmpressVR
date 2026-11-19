# EmpressVR

Next.js + TypeScript website rebuild for Empress Immersive LTD.

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
- `.skills` on-demand expert development playbooks
- `docs` architecture, brand, migration plan and inventory

## Implementation status

The branded home and navigation are starter content. **No production Stripe, Supabase, or Google Calendar integration is implemented yet.** No Squarespace content has been migrated. The existing site should remain live until content, bookings, and payments are independently verified.

Vercel Hobby is noncommercial-only. Use it only where eligible for development and previews. Select permitted commercial hosting before launching the business website.
