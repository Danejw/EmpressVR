# Verified live booking catalogue

Source checked: **21 November 2026**. The operational site is https://www.empressvr.com/scheduling; related Squarespace product pages are linked from https://www.empressvr.com/store.

## Booking offerings imported

| Live class | GBP price | Format and duration | Source product slug | New booking slug |
|---|---:|---|---|---|
| Intro to VRChat Fluency --> In VR! | £12.00 | 1-hour VRChat guided class, headset required | `principles-of-immersive-storytelling-in-vrchat` | `intro-to-vrchat-fluency-in-vr` |
| Immersive Storytelling Principles -> In VRChat! | £40.00 | 2-hour VRChat guided class, headset optional | `immersive-storytelling-principles-in-vrchat` | `immersive-storytelling-principles-in-vrchat` |
| Intro to Unity for Meta Quest VR Development - Zoom | £400.00 | 6-week online Zoom bootcamp | `intro-to-unity-for-meta-quest-vr-development-zoom` | `intro-to-unity-for-meta-quest-vr-development-zoom` |

All three classes are marked **Sold out** on the current operational site. We imported their existing, exact titles, introductory paragraphs and GBP prices from `public.products`. Key public syllabus and accessibility details were adapted into concise editable descriptions (under the 4,000-character editor limit), including the sliding-scale/scholarship contact `classes@empressvr.com`. The full original source pages remain in the imported `public.site_pages` table.

**Important source quirk:** The first class has an old product URL slug referring to storytelling, despite its product title being *Intro to VRChat Fluency*. The new booking slug follows the displayed class name; the existing product route stays intact.

## Current booking state

The three `public.offerings` rows have `published=true` for catalogue visibility and `accepting_bookings=false`, matching the live sold-out state. No slots, capacity, attendee details or reservations were fabricated. This does not activate the public booking endpoint. The existing Squarespace/Acuity operation continues unchanged.

The import is available as an **idempotent fixture** at `supabase/fixtures/legacy-booking-offerings.sql`, which can be reused to populate other environments after creating the schema. It preserves edits to existing rows on subsequent runs using `ON CONFLICT (slug) DO NOTHING`.

## Follow-up work before opening reservations

Actual future session dates, times, time zones, group capacity and seats per attendee require confirmation from the booking owner or verified scheduler inventory. Publishing offerings does not establish available session slots. The three existing Squarespace product images can be reused when the booking catalogue supports featured media. Do not migrate the unrelated Fox Mask 3D-printing product into booking offerings.
