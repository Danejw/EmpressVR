# EmpressVR agent instructions

Read `docs/architecture.md`, `docs/implementation-plan.md`, `docs/brand.md`, and the relevant `.skills/*/SKILL.md` before changing a feature. Apply `.cursor/rules/*.mdc` for decisions.

Principles: simple, modular, composable, reusable, interoperable, verifiable, portable and compoundable.

- Review existing code before proposing new abstractions or dependencies.
- Scope each change; make minimal edits and test affected behavior.
- Use official documentation and current APIs for all third-party integrations.
- TypeScript strict mode. Avoid `any` and unsafe casts.
- Use semantic HTML, keyboard interaction and mobile-first responsive design.
- No real payments, migrations, or credentials without explicitly approved scope and proper test mode.
- Never discard old website content or disable the existing checkout before verified cutover.
- Do not assert tests passed unless they were actually executed.
