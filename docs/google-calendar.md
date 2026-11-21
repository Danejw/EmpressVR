# Google Calendar: EmpressVR community events

## What this replaces

The current [EmpressVR community page](https://www.empressvr.com/community)
has a **native Squarespace calendar block**, not a Google Calendar iframe.
Its month grid is Sunday-first with Young Serif month headers, light grey day
tiles, and previous/next month controls. The old calendar has no visible
events for November 2026.

The Next.js rebuild replaces the archived static calendar table only on
`/community` with a React month grid using the same visual language. The
rest of the source page content remains unchanged. Clicking an event day
displays its public event titles and start times, with a link to the Google
event when supplied. Month navigation is supported from three months before
the current month through twelve months ahead.

## Connect to Google Calendar later

Create a **dedicated calendar exclusively for events intended to be public**.
Never use a private staff calendar or a Google Calendar containing personal
appointments as the public event source.

Enable the Google Calendar API in the chosen Google Cloud project and obtain
OAuth authorization with the Calendar read-only scope. Configure the following
**server-only** environment variables on the server-capable deployment:

- `GOOGLE_COMMUNITY_CALENDAR_ID`: dedicated public-events calendar ID
- `GOOGLE_CLIENT_ID`: OAuth client ID
- `GOOGLE_CLIENT_SECRET`: OAuth client secret
- `GOOGLE_REFRESH_TOKEN`: refresh token authorized for calendar read access

`GOOGLE_CALENDAR_ID` remains reserved for a future **booking/scheduling
integration**, if one is needed. Do not reuse it implicitly for the public
community events display.

The server exchanges the refresh token for a short-lived access token, then
uses the Google Calendar Events API with `singleEvents=true` to expand recurring
occurrences. It only sends a sanitized set of public event titles, dates, and
Google-hosted links to the browser. Cancelled and explicitly private events
are excluded. Failure to connect returns a safe unavailable state.

Google credentials are never sent to the browser or committed to GitHub.

## Hosting and deployment

Production needs a server-capable Next.js host for a live read. The existing
GitHub Pages static export remains a visual preview. It cannot request fresh
server-side Google Calendar data, so the preview displays the calendar layout
with a link to the current EmpressVR community page until deployment is
connected.

There is no direct browser access to Google private APIs. No credentials
were added during this implementation.

## Relationship to bookings

This is the **read-only community events calendar**. It does not create Google
Calendar events, reserve bookable slots, or process payments.

Live classes and appointments will still need their own booking flow:
Supabase remains authoritative for slot capacity/holds, Stripe determines paid
status, and a server-side outbox creates/updates the appropriate Google event
after a confirmed booking. Existing Squarespace/Acuity booking links stay live
until that flow is implemented and verified.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm run test`, and
`GITHUB_PAGES_PREVIEW=true npm run build` to check the static preview.
Google API integration is covered by mock tests. A real Google connection
requires the calendar ID and OAuth credentials above, tested against a
dedicated non-sensitive calendar.
