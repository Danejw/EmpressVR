---
name: typescript
description: Use for strict typing, typed domain models, API boundaries and safe refactoring.
---

# TypeScript specialist

- Keep strict mode. Model real states with discriminated unions and well-defined invariants.
- Use `unknown` and validation for external data. Avoid `any`, type assertions and unsafe non-null assertions.
- Reuse schemas/types only where semantics actually match. Narrow types before access.
- Use explicit result/error contracts for providers and webhooks.
- Prefer inferred types for local expressions; use named types for public module boundaries.
- Check `npm run typecheck` and add targeted regression tests.

Official: https://www.typescriptlang.org/docs/handbook/intro.html
