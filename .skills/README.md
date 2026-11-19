# EmpressVR agent skills

These project-specific SKILL.md files are original, concise operational playbooks. They **reference** trusted upstream documentation and expert sources; they are not copies of paid skill packs.

Load only the skills relevant to the task, and read their linked official references for implementation details. These files live under `.skills` as requested. Cursor's automatically recognized project rules are under `.cursor/rules/*.mdc`; refer to this directory via `AGENTS.md`.

| Skill | Trigger |
| --- | --- |
| frontend-design | Visual design, UX/UI review or page implementation |
| react | React component design, state, performance |
| nextjs | App Router, server/client architecture, routing |
| typescript | Types, API contracts, validation |
| tailwind | Tokens, utility styling, responsive CSS |
| supabase | Database, storage, migrations, RLS |
| stripe | Checkout, payments, donation, subscriptions |
| google-calendar | Booking, scheduling, sync, capacity |
| vercel | Builds, previews, env variables, portability |

Useful upstream agent skills (not vendored):
- Anthropic: https://github.com/anthropics/skills/tree/main/skills/frontend-design
- Vercel: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices
- Vercel composition: https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns
- Supabase: https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices
- Auglet paid philosophies pack: https://auglet.com/browse/philosophies-architectural-ui-principles-for-ai-software

The Auglet pack's full content was not accessible and is not included in this repository. DRY, SOLID and composability rules were authored independently.
