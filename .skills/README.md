# EmpressVR official agent skills

All installed `SKILL.md` packages are **copied from first-party publishers without rewriting their instructions**. Cursor automatically discovers skills under `.cursor/skills/`, the canonical installation directory. The former handwritten skill stubs have been removed.

| Skill directory | Maintainer | Primary role | Original source |
| --- | --- | --- | --- |
| `frontend-design` | Anthropic | Brand-led UI/UX design | https://github.com/anthropics/skills/tree/main/skills/frontend-design |
| `vercel-react-best-practices` | Vercel | React and Next.js performance, rendering, data loading | https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices |
| `vercel-composition-patterns` | Vercel | Reusable React composition | https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns |
| `web-design-guidelines` | Vercel | UI and accessibility auditing | https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines |
| `deploy-to-vercel` | Vercel | Preview and deployment workflows | https://github.com/vercel-labs/agent-skills/tree/main/skills/deploy-to-vercel |
| `next-dev-loop` | Next.js / Vercel | Development server and runtime verification | https://github.com/vercel/next.js/tree/canary/skills/next-dev-loop |
| `supabase` | Supabase | Supabase integration, troubleshooting, services | https://github.com/supabase/agent-skills/tree/main/skills/supabase |
| `supabase-postgres-best-practices` | Supabase | Postgres queries, RLS, transactions, indexing and migration | https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices |
| `stripe-best-practices` | Stripe | Checkout, billing, subscriptions, webhook security | https://github.com/stripe/ai/tree/main/skills/stripe-best-practices |
| `gws-calendar` | Google Workspace | Google Calendar operations through gws CLI | https://github.com/googleworkspace/cli/tree/main/skills/gws-calendar |
| `gws-shared` | Google Workspace | Required Google Workspace CLI authentication and command conventions | https://github.com/googleworkspace/cli/tree/main/skills/gws-shared |
| `gws-calendar-insert` | Google Workspace | Google Calendar event creation with gws CLI | https://github.com/googleworkspace/cli/tree/main/skills/gws-calendar-insert |
| `gws-calendar-agenda` | Google Workspace | Calendar agenda with gws CLI | https://github.com/googleworkspace/cli/tree/main/skills/gws-calendar-agenda |
| `security-guidance` | OWASP | Security-first coding based on OWASP ASVS 5.0 | https://github.com/OWASP/secure-agent-playbook/tree/main/plugins/code-security-skills/skills/security-guidance |
| `playwright-cli` | Microsoft | Browser interaction, screenshots and workflow testing | https://github.com/microsoft/playwright-cli/tree/main/skills/playwright-cli |

## Coverage and limitations

- React and Next.js: official Vercel skills plus version-matched docs bundled with Next.js.
- Supabase: original complete Postgres reference library, plus the Supabase general skill.
- Stripe: original first-party references for payments, billing, tax, Connect and security.
- Security: OWASP Security Guidance is installed with the 80-section ASVS 5.0 reference library at `security-guidance/data/asvs/`, the original CC BY 4.0 license, and attribution for the CC BY-SA 4.0 ASVS data. Load it for user input, API endpoints, payment security, secrets, personal information, and database access.
- Browser verification: Microsoft Playwright CLI skill is installed with all 10 official references. The real `playwright-cli` binary and compatible browser need to be installed on a developer machine (`npm install -g @playwright/cli@latest`). Skill installation alone does not set up the browser or automated e2e tests.
- UI: Anthropic frontend design skill and Vercel's official web design audit. Always combine with `docs/brand.md`.
- Google Calendar: `gws-calendar` operates the Google Workspace CLI and requires installing/authenticating `gws`. **This is not an API implementation guide for the custom scheduling backend**. Read https://developers.google.com/workspace/calendar/api/guides/overview for that code.
- TypeScript: no verified generic first-party Microsoft/TypeScript agent skill found for this stack. Use strict TypeScript, lint and official docs: https://www.typescriptlang.org/docs/.
- Tailwind CSS: no verified generic first-party Tailwind Labs agent skill found. Use official Tailwind docs: https://tailwindcss.com/docs/.
- Vercel Hobby is noncommercial-only. A production commercial deployment requires permitted hosting.

No paid Auglet philosophical-pack files are included. The separately authored `.cursor/rules/` are project rules for DRY, SOLID, composability and quality, **not marketed as official skills**.

Source packs were inspected and installed on 2026-11-18. Vendored copies do not auto-update. Compare and update from each first-party publisher periodically.
