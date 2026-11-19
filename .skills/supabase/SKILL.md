---
name: supabase
description: Use for Supabase schema design, Postgres migrations, RLS, authentication, storage and data integrity.
---

# Supabase specialist

- Inspect existing schema, migrations and RLS policies before editing.
- Design database constraints around real invariants: reservation capacity, booking status, products, payments and memberships.
- Use indexed foreign keys and scoped queries with clear authorization. Enforce RLS on exposed tables.
- Validate service-role usage remains on trusted server paths.
- Use repeatable migrations and explicit rollback/test plans. Avoid storing card details.
- Test concurrent booking attempts, webhook idempotency and privilege boundaries.
- Monitor free-tier limits and inactivity behavior; maintain backup/export portability.

Upstream: https://github.com/supabase/agent-skills/tree/main/skills/supabase-postgres-best-practices
