# Booking Management Staff Workspace (EVR-23)

**Status:** Feature branch draft PR, do not merge without QA and user review.
**Route:** \`/staff/bookings\` (one page, three in-page tabs).

## Scope

Administrators with AAL2 MFA see Bookings in \`/staff\`. Editors remain able to manage website content but cannot view private bookings or attendee contacts. One booking workspace composes independent reservations, offerings, schedule, and editor components. The side panel is shared between editors and details. The reusable \`MonthGrid\` is data-agnostic and uses the existing date utilities. Local session dates are converted using the selected IANA time zone, rejecting DST gaps and repeated times.

### Offerings

Admins may create/edit classes, appointments, and informational offerings; enter price, currency, title, description, and published status. New offerings always have \`accepting_bookings=false\`. No feature in this PR enables public customer booking. Existing offerings stay unchanged until edited.

### Sessions

Admins may create/edit future sessions (time zone, start/end, seat limit, capacity, availability, payment requirement). Overlaps for the same offering are rejected in the server action. Sessions with active bookings cannot be moved or resized; they can be closed without cancelling existing bookings. The database guards both capacity and these changes when administrators use the Data API directly.

### Reservations

Admins can view reservations with attendee names, emails, statuses, and history. The manual reservation action accepts free sessions only, where **both** the offering price is zero and the slot does not require payment. It uses \`public.admin_reserve_free_booking\` as a **SECURITY INVOKER** SQL transaction. It locks a session before checking confirmed seats and unexpired holds, enforces an idempotency key, inserts a confirmed booking and a contact atomically, and creates a deduplicated outbox item. Admins may cancel only unpaid held/confirmed reservations. Paid bookings are view-only until verified Stripe refund and cancellation workflows exist.

A separate append-only \`booking_admin_audit\` records manual creations and cancellations. No actor has write API privileges to forge audit entries. Internal database triggers generate audit/outbox events.

## Authorization and data

The database migration \`20261122030000_booking_admin_workspace.sql\` adds MFA-gated administrator RLS for offerings, sessions, bookings, attendee contact details, and booking audit history. It uses narrow table grants and server-side validation. RPC endpoints never run with elevated PostgreSQL owner privileges. The booking admin UI gets database data through a cookie-backed server client; credentials are never sent to the browser. No public booking submission API is added.

Only existing database records may be shown. Current Supabase booking tables are empty. No seed bookings or offerings are created in production by the feature.

## Out of scope

Public booking submission, payment collection/refunds, Google Calendar booking synchronisation, email confirmations, recurring-session generation, rescheduling, and replacing Squarespace/Acuity. \`/book\` stays preview-only. The read-only community calendar remains independent.

## Verification checklist

- Database migration applied and advisor review; check admin AAL2 and ordinary-user RLS denial.
- Create and edit draft offering; verify published state does not activate public bookings.
- Create future session with a London time zone across DST; invalid overlapping session denied.
- A free manual booking respects seat capacity, retries are idempotent and conflicting keys are denied.
- Editing a session with confirmed reservations fails, while closing availability succeeds.
- Cancel an unpaid booking; append one audit/outbox entry; reject paid cancellation.
- Run unit tests, TypeScript, lint, Vercel build, and a real authenticated desktop/mobile QA pass.
- Keep draft PR unmerged until the user approves. Preserve the existing Squarespace/Acuity operation.
