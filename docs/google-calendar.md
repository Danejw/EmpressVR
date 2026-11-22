# Google Calendar: future EmpressVR community event sync

## Current implementation

The public `/community` calendar and `/events` listing read published,
date-reviewed event records from Supabase `public.events`. Editors and
administrators manage these events in `/staff/events`. Existing archived
Squarespace records are preserved and remain hidden until a staff member
verifies their dates and publishes them.

The current calendar uses the existing month-grid presentation with the
EmpressVR site styling. Session bookings remain a separate system.

## Future Google Calendar synchronization

**Direction:** EmpressVR → Google Calendar initially. Supabase owns the event
ID, title, time zone, dates, publication state, location, description and image.
The provider-independent `toSyncableEvent` adapter in
`src/features/events/calendar-adapter.ts` describes the payload a future
synchronization worker will consume.

The Google adapter should run server-side with a **dedicated calendar containing
public community events only**, separate from bookings and private staff
calendars. At integration time:

1. Authorize only the dedicated calendar with the minimum write scope.
2. Add a small mapping from EmpressVR event UUID to Google calendar ID/event ID,
   version tag and last successful sync time, rather than duplicating event
   titles and schedules in a new catalogue.
3. Enqueue publish, update and unpublish operations after a successful
   Supabase commit. Use retry-safe workers with deduplication and diagnostics.
4. Only modify Google events created and owned by this integration. Resolve
   conflicts using recorded version tags and an explicit owner policy.
5. Keep private, archived, and date-unreviewed events out of Google. Do not
   publish personal staff appointments or booking attendee data.

The existing `src/features/scheduling/google-calendar.ts` read-only Google
feed adapter is retained as legacy integration groundwork and is **not used
as a second event source**. Google Calendar credentials are not requested or
configured by this PR. Future work can replace or adapt that client to support
writes with refreshed OAuth credentials.

For customer bookings, keep `GOOGLE_CALENDAR_ID` independent from
the community events calendar. Booking inventory remains in Supabase,
payment confirmation stays with verified Stripe events, and provider updates
must not create new reservations.

## Current release boundary

No Google synchronization, recurring events, bidirectional edits, bookings,
or payments are enabled by staff events management. Static preview deployments
without Supabase connection show an empty calendar and link to the existing
operational Squarespace community page.

See `docs/staff-events-management.md` for event validation and QA checks.
