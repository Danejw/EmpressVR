# Scheduling foundation

The domain code in [domain.ts](domain.ts) supports the booking state sequence `held → confirmed → cancelled`, with `held → expired` for elapsed holds. `requestBookingHold` validates opaque attendee identities, slot affiliation, UTC timestamps, IANA display time zones, per-booking seat limits, and payment requirements. A hold lasts at most 15 minutes by default and never beyond the slot start. The domain never claims that a Calendar availability read reserves a seat.

`SlotCatalog` returns **verified, currently bookable** slots. It must not treat the seven archived Squarespace events as current availability. `BookingStore.reserveAtomically` is the essential future Supabase transaction: enforce unique idempotency key plus payload equality; serialize capacity reads and seat reservations (confirmed plus unexpired holds); create the hold in that transaction. Duplicate keys must return the original booking; key reuse with different parameters is an error. All other booking mutations must be authorized, state-checked, and atomic. No in-memory production fallback may be used.

Paid bookings may be confirmed only by trusted server-side logic after the corresponding order is settled through a signature-verified webhook. Calendar event creation and cancellation should run from a retry-safe outbox after the database commits; failures must be visible for reconciliation. Explicitly decide whether a class is capacity-based, an appointment is provider-availability-based, or an informational event has no booking.

**Still missing:** approved live offerings and capacity policies; Supabase reservation tables/transactions/RLS; authentication and PII retention; available slots from Google Calendar with explicit zone handling; a public booking UI/API; email notices, reschedules, cancellation/refund policies, calendars and reconciliation; payment linkage. Existing Acuity/Squarespace booking URLs remain operational. The module has no network actions or working reservation endpoint.

The `domain.test.ts` tests cover validation, time boundaries, transitions, idempotent retry rules, and the required atomic-capacity contract using a test-only ledger.

## Community events calendar

The `/community` page now includes a read-only Google Calendar events adapter and
month-grid UI. It requires separate `GOOGLE_COMMUNITY_CALENDAR_ID` and OAuth
credentials on server-capable hosting; the static GitHub Pages preview remains
unconnected. See [Google Calendar setup](../../../docs/google-calendar.md).
This does not enable booking writes or change existing Squarespace/Acuity links.

## Pre-backend booking UI

`/book` is a standalone, tested booking-planner interface with class selection,
month/day navigation, time selection, attendee quantity and contact fields, and a
booking review. It deliberately **does not submit** or store customer data.
The current class cards are taken from the archived product catalog, which
marks all three as sold out. No verified future offering/slot records exist
in that snapshot, so every date is disabled and the official booking site
remains linked. The /scheduling page links to this preview.

Only published, accepting offerings and future slots from trusted persistence
may populate the `BookingPlanner` props. The `bookableSlots` utility filters
invalid/closed slots for presentation; it **does not** determine remaining
capacity or reserve seats. Before enabling submission, implement authorized
server-side validation, `private.reserve_booking_hold`, payment handling where
required, and booking contact storage. Never derive availability from archived
Squarespace event dates or a generic Google Calendar free/busy result.
