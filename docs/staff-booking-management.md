# Staff Booking Management

The admin-only workspace remains at `/staff/bookings`. It uses one route with
modular **Reservations, Offerings, Schedule, Resources** tabs and a shared
editor panel. Staff access requires administrator role and MFA.

## Offerings and schedules

`offerings` owns class/appointment details, publication, GBP price and
whether the offering accepts online booking. New offerings start with
`accepting_bookings=false`. Admins explicitly enable online reservations
**only for published free offerings**. Paid offerings remain unavailable
until Stripe payment and refund verification exists.

`booking_slots` owns real future times, IANA time zone, capacity, seat limits,
availability, payment requirement and `resource_id`. Staff must assign an
active `booking_resources` member (person, room or shared equipment) to
any appointment before opening availability. Classes can optionally share
resources. Each session is edited manually; recurring availability generation
is deferred until there is a supported calendar integration.

When a reservation occupies a session, its time, price model, capacity
and resource cannot be changed. Staff may close a session to new reservations.

## Public reservations

Connected `/book` reads `offerings` for the catalogue and calls the
privacy-safe `public_free_booking_slots()` aggregate to display only future,
free, enabled, remaining-capacity sessions. Its data never includes attendee
names, emails or booking IDs.

A customer must have a signed-in, **email-confirmed account**. The server
action validates the request, then `reserve_public_free_booking()` performs
an atomic transaction. It enforces repeat-request idempotency, a per-account
burst limit, real available seat counts, and a resource lock. When a resource
is busy in another overlapping session, no additional reservations can be made
for that time, even across different offerings. Multiple attendees may reserve
the same class session up to its capacity.

Customers can see their own free bookings at `/account/bookings` and cancel
eligible upcoming free bookings. Cancellation immediately releases capacity and
restores other unoccupied overlapping resource slots. Staff can still inspect
and cancel unpaid reservations through the existing admin workflow.

The private `booking_contacts` and `bookings` ledger have no public read
permissions. The public functions are SECURITY DEFINER only where required
to read complete capacity and write an atomic private booking. They validate
identity and expose narrowly scoped outputs. No service-role credential is
shipped to the browser. Events are tracked in the append-only outbox; the
current deployment does **not** send confirmation emails.

## Boundaries and verification

No offering or session is automatically opened by the migration. Existing
Acuity/Squarespace booking, store, and paid sessions are preserved.
No Stripe, Google Calendar synchronization, automatic reminders or
recurring-schedule generator is included.

Database migration:
`20261122050000_public_free_bookings_and_resources.sql`.
Regression suite:
`supabase/tests/009_public_bookings_and_resources.test.sql`.
Additional validation tests live in
`src/features/scheduling/public-booking-validation.test.ts`.
