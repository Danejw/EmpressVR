---
name: react
description: Use when building or reviewing React components, composition, state and rendering behavior.
---

# React specialist

- Prefer composable components and explicit prop contracts; avoid boolean-prop explosions.
- Keep state local, derived where possible. Avoid unnecessary effects and duplicated state.
- Use server components for static and server-data UI; add client boundaries only for interaction.
- Optimize big bottlenecks before micro-optimizations: eliminate fetch waterfalls, reduce JS and needless client rerenders.
- Test component states (empty/loading/error/success) and accessibility.
- Reuse existing primitives before creating another.

Upstream: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices and https://github.com/vercel-labs/agent-skills/tree/main/skills/composition-patterns
