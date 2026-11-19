# EmpressVR agent instructions

Read `docs/architecture.md`, `docs/implementation-plan.md`, `docs/brand.md`, and the relevant **official publisher-authored** `.cursor/skills/*/SKILL.md` before changing a feature. See `.skills/README.md` for skill provenance and coverage. Apply `.cursor/rules/*.mdc` for project-specific decisions.

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
