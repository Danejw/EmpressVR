---
name: google-calendar
description: Use for Google Calendar event publishing, availability, appointment bookings and sync.
---

# Google Calendar scheduling specialist

- Separate public events from bookable appointment slots and capacity-limited paid classes.
- Use authorized Google OAuth or service-account access as appropriate; least privilege and consent.
- Read freeBusy for availability, then atomically reserve capacity in Supabase to prevent competing bookings.
- Handle time zones, daylight saving, buffers, cancellation/rescheduling, reminders and repeated delivery.
- Persist calendar event IDs, sync state and reconciliation failures; make event creation idempotent.
- Do not claim all Acuity features are native to Calendar; implement missing booking logic explicitly.
- Test simultaneous bookings, stale slots, revoked permissions and calendar API failures.

Official: https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query and https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
