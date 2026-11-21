# EmpressVR database migrations

This directory is the source of truth for the initial Supabase/Postgres schema.
It is **ready to deploy as SQL migrations** but has not been applied to a hosted
Supabase project. The existing website still reads the local content snapshot;
payments, bookings, membership approvals and calendar synchronization are not
yet operational.

## Recreate the database locally

Install the current Supabase CLI and a Docker-compatible runtime. From the
repository root:

```bash
supabase --version
supabase start
supabase db reset
supabase test db
supabase db lint --level error
```

`db reset` deletes the **local** database before recreating it. It applies
each file in `migrations/` by timestamp, then runs `seed.sql`. The seed is
deliberately empty so local resets do not import unreviewed Squarespace content
or historical pricing. The pgTAP tests in `tests/` verify tables, RLS, Storage,
reservation holds, payment transitions and idempotency.

## What is created

| Migration | Responsibility |
| --- | --- |
| `20261120000000_content_media_foundation.sql` | Pages, media, team, projects, events, products, blog, gallery relations and public image bucket |
| `20261120000001_staff_access.sql` | Staff roles and explicit public content grants |
| `20261120000002_commerce_catalogs.sql` | Donation campaigns and paid membership plans |
| `20261120000003_booking_reservations.sql` | Offerings, bookable slots, holds, atomic capacity reservations |
| `20261120000004_order_payment_ledger.sql` | Customers, orders, order items, verified event ledger, fulfillment outbox, digital entitlements |
| `20261120000005_memberships_subscriptions.sql` | Membership applications, approved members, recurring subscriptions |
| `20261120000006_transactional_workflows.sql` | Private atomic payment and booking transition operations |
| `20261120000007_private_storage.sql` | Private bucket for purchased digital downloads |
| `20261120000008_backend_relationships.sql` | Bookable offerings, product downloads, customer and booking contacts, recurring invoices, adjustment ledger |
| `20261120000009_order_integrity.sql` | Booking order/line consistency enforced by database constraints and trigger |

All 30 public application tables have RLS enabled. Browser roles can only
select published public catalogs/content and their own staff-role entry.
They cannot directly change content, book seats, view orders or retrieve
private payment/customer information. Sensitive workflows run through
server-only adapters using verified authorization and trusted provider events.
All private SQL functions use SECURITY INVOKER and are only executable by
`service_role`. The private schema must **not** be exposed in the Data API.

Business catalogs default to unpublished and disabled. Existing old event dates
are archival; no live booking slots are seeded. Production Stripe product/price
IDs, digital download files, webhook handling, membership approval and
Google Calendar synchronization are deliberately not fabricated.

## Deploy to a hosted Supabase project later

1. Create a new Supabase project or inspect and reconcile an existing project's
   schema and migration history. Do not push blindly into a populated project.
2. Check the installed CLI help. In Supabase CLI v3, run `supabase login` and
   `supabase link --project-ref <project-ref>` to select the intended project.
3. Explicitly review the target and run `supabase db push --remote` only after
   approving hosted changes. Review migrations and confirm production backups.
4. Separately run `node scripts/export-supabase-seed.mjs` to prepare the source
   content import. Validate data and media rights, then import seed content and
   upload the manifest's media files to `site-media`.
5. Set up server-only credentials, Stripe, calendar adapters and signed private
   file delivery after the operational requirements are confirmed.

## Database hardening and verified scope

The additional migrations link booking order lines to an offering, purchased
entitlements to the exact product in their paid order, and products to private
download objects. Booking contacts and customer email are private tables/fields;
subscription invoices and refund/dispute adjustments have provider identifiers
for future reconciliation. All new public tables have RLS enabled with no
browser grants.

CI now attempts a fresh reset, four pgTAP test files, a repeated import of
the 48-page / 160-media source snapshot, and a real simultaneous two-client
capacity check. A successful run proves schema deployability, the imported
content's relational integrity, and the tested authorization behavior. It does
not prove that real webhooks, guest booking flows, private file delivery,
calendar sync, admin editing, or subscription billing are operational. The
application adapters must be implemented and verified separately.

A remote `db push` applies **schema migrations only**; it does not apply the
local seed or upload image binaries. Never put service-role keys or provider
secrets in a browser-facing environment variable.

Create future migrations using `supabase migration new <name>`. Do not edit
migrations that have already been deployed to a shared or production database.

## Verification and limitations

The migrations are checked into GitHub for review, but the local Supabase CLI
and Docker runtime were not available in the authoring environment. Run the
commands above or the database CI workflow before calling the SQL execution
verified. Database migrations are the foundation; no claim is made that
checkout, booking, or admin application integrations are complete.
