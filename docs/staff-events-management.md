# Staff Events Management

The staff events workspace is at \`/staff/events\` and is available to
MFA-verified \`editor\` and \`admin\` accounts. The list and calendar compose a
single route with an editing side panel, and reuse shared date utilities,
\`MonthGrid\`, \`EditorPanel\`, and the existing CMS media inventory.

## Sources of truth

- **\`public.events\`** is the canonical event catalogue, holding title,
  permalink slug, publication state, date review status, UTC start/end,
  IANA time zone, all-day flag, location, external HTTPS link, and featured
  media pointer.
- **\`public.site_pages\`** holds descriptions. The server-owned
  \`save_staff_event\` transaction creates/updates only pages identified by
  \`staff_event__<uuid>\`; imported legacy pages remain untouched.
- **\`public.media_assets\`** holds approved featured images; no duplicate
  images or calendar-event tables are created.

The seven existing Squarespace events are archived with missing/unverified
dates. The migration does **not** republish or invent dates for them.

## Validation and release behavior

- Editors can draft an event without dates; dates must be both present or both
  omitted. Publishing requires verified start/end dates in strictly increasing
  order. The database enforces that rule as well as the server.
- Timed events use local input and an IANA time zone. Convert exactly once to
  UTC; invalid, nonexistent or ambiguous DST local times are rejected.
- All-day events use inclusive start/end calendar dates in the editor, stored
  as UTC midnight with an **exclusive end date** for interoperability.
- Event slugs are immutable after creation; titles <=160, descriptions
  <=12000, location <=300 and HTTPS links <=500 characters.
- Archive or draft removes event and its staff-owned description page from
  public listings. Events must not silently appear from old source snapshots.
- Editing staff-owned pages and event rows happens atomically with a
  SECURITY INVOKER function and the existing staff MFA/RLS policies.
- Updating public event content revalidates \`/community\` and \`/events\`.

## Google integration boundary

The server-side \`toSyncableEvent\` projection is pure and provider-agnostic.
Later, integrate a dedicated public calendar with one-way sync
(Supabase → Google), stable ID mapping, version-aware updates, retries and
reconciliation. No credentials, sync queues, scheduled worker or Google writes
are created now. This is **not** a booking calendar.

## QA

Verify ordinary authenticated users and AAL1 users cannot write or read
drafts; editors and admins with AAL2 can create/publish/archive; imported
pages remain intact; a staff-created page is reused across edits; unreviewed
dates cannot publish; multi-day/all-day dates preserve proper end exclusivity;
public \`/community\` and \`/events\` reflect the same published catalogue;
mobile layout and anonymous staff-route denial work.

The \`supabase/tests/008_staff_events_management.test.sql\` test suite runs
against the local migrated database. Check lint, typecheck, unit tests,
production build and Playwright before merging.
