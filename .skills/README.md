# EmpressVR agent skills

The nine stack-specific SKILL.md files are original project playbooks based on trusted official guidance. Anthropic's official frontend-design skill is also vendored under `.skills/anthropic-frontend-design/` with its Apache-2.0 license and source provenance. No paid Auglet content is included.

Load only the skills relevant to the task, and read their linked official references for implementation details. These files live under `.skills` as requested. Cursor's automatically recognized project rules are under `.cursor/rules/*.mdc`; refer to this directory via `AGENTS.md`.

| Skill | Trigger |
| --- | --- |
| frontend-design | EmpressVR-specific visual design, UX/UI and brand quality |
| anthropic-frontend-design | Licensed official Anthropic design skill (load alongside project brand rules) |
| react | React component design, state, performance |
| nextjs | App Router, server/client architecture, routing |
| typescript | Types, API contracts, validation |
| tailwind | Tokens, utility styling, responsive CSS |
| supabase | Database, storage, migrations, RLS |
| stripe | Checkout, payments, donation, subscriptions |
| google-calendar | Booking, scheduling, sync, capacity |
| vercel | Builds, previews, env variables, portability |

Useful upstream expert sources (some are linked; Anthropic frontend-design is vendored):
- Anthropic: https://github.com/anthropics/skills/tree/main/skills/frontend-design
- Vercel: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
- Vercel composition: https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns
- Supabase: https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices
- Auglet paid philosophies pack: https://auglet.com/browse/philosophies-architectural-ui-principles-for-ai-software

The Auglet pack's full content was not accessible and is not included in this repository. DRY, SOLID and composability rules were authored independently.
