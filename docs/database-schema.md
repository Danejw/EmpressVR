# EmpressVR database table reference

**Purpose:** The developer-facing inventory of the application database. Read this before proposing a new table, duplicating a catalogue or changing persistence models.

**Verified against:** Live Supabase project `zxsrixbjsmyzmqywukwa`, schema `public`, on 2026-11-21 (Hawaii time), and the `feat/staff-booking-management` code and migrations. This is a point-in-time snapshot. The current schema and migrations win if they differ from this document.

**Scope:** **32 application tables**, **58 actual foreign-key constraints**, all 32 with RLS enabled. Supabase-managed `auth` and `storage` tables are outside this inventory, but are identified where referenced. The “Links” column contains actual database foreign keys, not inferred joins.

## Before adding or changing a table

1. Find the existing table by its domain below; reuse it when the record and lifecycle already fit.
2. Follow its foreign keys and check existing migrations and server-side adapters before adding more relationships.
3. Verify columns, constraints, RLS policies and grants in the target Supabase project. Do not infer permissions from table names or a browser query.
4. When changing schema, add a migration, update this document in the same PR and test existing read/write flows. Keep privileged operations server-controlled.
5. Do not mistake a related record for an interchangeable one: `products`, `offerings` and `events` have different meanings; `team_members` are public profiles, while `staff_roles` control account access.

## Main relationships

```text
Content:       site_pages -> {projects, team_members, blog_posts, events, products}
               media_assets <- {site_media, page_media, project_media, product_media, ...featured image IDs}
Store:         products -> order_items -> orders <- payment_events / payment_adjustments
               products -> product_downloads; order_items -> entitlements
Bookings:      offerings -> booking_slots -> bookings -> {booking_contacts, booking_admin_audit}
               bookings <-> orders (optional payment linkage); order_items -> offerings
Donations:     donation_campaigns -> {order_items, subscriptions}
Memberships:   membership_plans -> membership_applications -> memberships -> subscriptions
               subscriptions -> subscription_invoices
Identity:      auth.users -> {customers, staff_roles, staff_invitations.invited_by, blog post audit actors}
```

Arrows show primary domain flow, not FK direction in every case. The authoritative FK list is in the table entries below. In particular, `bookings` and `orders` have optional references in **both** directions and must be wired carefully.

## Site content and media

| Table | Purpose | Key columns | Foreign-key links (outgoing) |
|---|---|---|---|
| [`site_pages`](#site_pages) | CMS source pages, imported paths and full Markdown copy for public routes. | `id`, `path`, `source_key`, `title`, `body_markdown`, `published` | None |
| [`media_assets`](#media_assets) | Metadata for public media files; links original source information to a Supabase Storage key. | `id`, `source_key`, `source_url`, `storage_key`, `status`, `alt_text` | None |
| [`site_media`](#site_media) | Named site-wide image placements such as hero or navigation imagery. | `slot`, `media_asset_id` | `media_asset_id` → `media_assets(id)` |
| [`page_media`](#page_media) | Ordered images attached to a CMS page, with placement role. | `id`, `page_id`, `media_asset_id`, `role`, `position` | `media_asset_id` → `media_assets(id)`; `page_id` → `site_pages(id)` |
| [`projects`](#projects) | Public portfolio/project catalogue with publication status and featured media. | `id`, `page_id`, `slug`, `title`, `status`, `featured_media_id` | `featured_media_id` → `media_assets(id)`; `page_id` → `site_pages(id)` |
| [`project_media`](#project_media) | Ordered gallery images for projects. | `id`, `project_id`, `media_asset_id`, `position` | `media_asset_id` → `media_assets(id)`; `project_id` → `projects(id)` |
| [`team_members`](#team_members) | Public-facing profiles, bios/roles and headshots, distinct from login permissions. | `id`, `page_id`, `name`, `slug`, `roles`, `group_name`, `headshot_media_id` | `headshot_media_id` → `media_assets(id)`; `page_id` → `site_pages(id)` |
| [`blog_posts`](#blog_posts) | CMS blog entries, author attribution, featured image, draft/publish lifecycle. | `id`, `page_id`, `slug`, `status`, `author_id`, `featured_media_id`, `created_by`, `updated_by` | `author_id` → `team_members(id)`; `created_by` → `auth.users(id)`; `featured_media_id` → `media_assets(id)`; `page_id` → `site_pages(id)`; `updated_by` → `auth.users(id)` |
| [`events`](#events) | Public event catalogue and archived date information; not a source of bookable capacity. | `id`, `page_id`, `slug`, `start_at`, `end_at`, `date_review_required`, `status` | `featured_media_id` → `media_assets(id)`; `page_id` → `site_pages(id)` |

## Store and commerce

| Table | Purpose | Key columns | Foreign-key links (outgoing) |
|---|---|---|---|
| [`products`](#products) | Store merchandise/digital goods catalogue, including price, sold-out state, images and future Stripe IDs. | `id`, `page_id`, `slug`, `title`, `price_minor`, `currency`, `status`, `sold_out`, `featured_media_id`, `stripe_price_id` | `featured_media_id` → `media_assets(id)`; `page_id` → `site_pages(id)` |
| [`product_media`](#product_media) | Ordered product gallery images. | `id`, `product_id`, `media_asset_id`, `position` | `media_asset_id` → `media_assets(id)`; `product_id` → `products(id)` |
| [`product_downloads`](#product_downloads) | Private file metadata for purchased digital downloads and fulfillment. | `id`, `product_id`, `storage_bucket`, `storage_key`, `available` | `product_id` → `products(id)` |
| [`customers`](#customers) | Commerce/member profile linked to a Supabase Auth account when present, plus Stripe/customer contact IDs. | `id`, `user_id`, `contact_email`, `stripe_customer_id` | `user_id` → `auth.users(id)` |
| [`orders`](#orders) | Server-owned payment order ledger, including product, donation, membership or booking orders. | `id`, `customer_id`, `booking_id`, `kind`, `amount_minor`, `currency`, `status`, `provider_session_id` | `booking_id` → `bookings(id)`; `customer_id` → `customers(id)` |
| [`order_items`](#order_items) | Individual purchased/pledged catalogue lines, referencing exactly one product, offering, donation campaign or membership plan. | `id`, `order_id`, `product_id`, `offering_id`, `campaign_id`, `membership_plan_id`, `quantity`, `unit_amount_minor` | `campaign_id` → `donation_campaigns(id)`; `membership_plan_id` → `membership_plans(id)`; `offering_id` → `offerings(id)`; `order_id` → `orders(id)`; `product_id` → `products(id)` |
| [`payment_events`](#payment_events) | Idempotent record of received payment-provider success/failure/refund events. | `event_id`, `order_id`, `provider_session_id`, `kind`, `amount_minor` | `order_id` → `orders(id)` |
| [`payment_adjustments`](#payment_adjustments) | Separate partial/full refunds and dispute event records associated with an order. | `id`, `order_id`, `stripe_event_id`, `kind`, `amount_minor` | `order_id` → `orders(id)` |
| [`outbox_jobs`](#outbox_jobs) | Deduplicated queued work for completed orders and booking confirmation/cancellation side effects. | `id`, `dedupe_key`, `kind`, `order_id`, `booking_id`, `status`, `attempt_count` | `booking_id` → `bookings(id)`; `order_id` → `orders(id)` |
| [`entitlements`](#entitlements) | Rights granted to a customer for a paid product line, including revocation status. | `id`, `order_item_id`, `product_id`, `customer_id`, `status` | `order_item_id, product_id` → `order_items(id, product_id)`; `customer_id` → `customers(id)`; `order_item_id` → `order_items(id)`; `product_id` → `products(id)` |

## Scheduling and reservations

| Table | Purpose | Key columns | Foreign-key links (outgoing) |
|---|---|---|---|
| [`offerings`](#offerings) | Classes, appointments and informational activities with booking price and publication/acceptance controls. | `id`, `slug`, `title`, `kind`, `price_minor`, `currency`, `published`, `accepting_bookings` | None |
| [`booking_slots`](#booking_slots) | Real scheduled occurrences with timezone, capacity, seat limits, payment flag and optional external calendar ID. | `id`, `offering_id`, `starts_at`, `ends_at`, `time_zone`, `capacity`, `max_seats_per_booking`, `available`, `requires_payment`, `google_calendar_event_id` | `offering_id` → `offerings(id)` |
| [`bookings`](#bookings) | Seat reservations/holds against a specific offering and slot; booking lifecycle and optional linked payment/customer. | `id`, `offering_id`, `slot_id`, `attendee_ref`, `seats`, `status`, `idempotency_key`, `requires_payment`, `payment_order_id`, `customer_id` | `payment_order_id` → `orders(id)`; `slot_id, offering_id` → `booking_slots(id, offering_id)`; `customer_id` → `customers(id)` |
| [`booking_contacts`](#booking_contacts) | Private attendee email/name for a booking, kept separate from the reservation ledger. | `booking_id`, `email`, `display_name` | `booking_id` → `bookings(id)` |
| [`booking_admin_audit`](#booking_admin_audit) | Append-only history of manual staff booking creation and cancellation, with actor. | `id`, `booking_id`, `action`, `actor_id`, `created_at` | `actor_id` → `auth.users(id)`; `booking_id` → `bookings(id)` |

## Donations and memberships

| Table | Purpose | Key columns | Foreign-key links (outgoing) |
|---|---|---|---|
| [`donation_campaigns`](#donation_campaigns) | Donation/fundraising campaigns, accepted contribution ranges, cadence options and publication state. | `id`, `slug`, `currency`, `minimum_minor`, `maximum_minor`, `allowed_cadences`, `published`, `accepting_contributions` | None |
| [`membership_plans`](#membership_plans) | Paid membership tiers with joining and quarterly fees plus publication/acceptance state. | `id`, `slug`, `joining_fee_minor`, `quarterly_amount_minor`, `published`, `accepting_applications` | None |
| [`membership_applications`](#membership_applications) | Customer applications awaiting separate community/co-op membership approval; may reference an order. | `id`, `customer_id`, `plan_id`, `kind`, `order_id`, `status`, `reviewed_by` | `customer_id` → `customers(id)`; `order_id` → `orders(id)`; `plan_id` → `membership_plans(id)`; `reviewed_by` → `auth.users(id)` |
| [`memberships`](#memberships) | Approved customer memberships associated with an application and optional plan. | `id`, `application_id`, `customer_id`, `plan_id`, `status`, `approved_at` | `application_id` → `membership_applications(id)`; `customer_id` → `customers(id)`; `plan_id` → `membership_plans(id)` |
| [`subscriptions`](#subscriptions) | Recurring Stripe billing for either a membership or donation campaign, with lifecycle and billing cadence. | `id`, `customer_id`, `membership_id`, `campaign_id`, `stripe_subscription_id`, `cadence`, `status` | `campaign_id` → `donation_campaigns(id)`; `customer_id` → `customers(id)`; `membership_id` → `memberships(id)` |
| [`subscription_invoices`](#subscription_invoices) | Stripe invoice lifecycle and amounts for a recurring subscription. | `id`, `subscription_id`, `order_id`, `stripe_invoice_id`, `amount_due_minor`, `amount_paid_minor`, `status` | `order_id` → `orders(id)`; `subscription_id` → `subscriptions(id)` |

## Staff access

| Table | Purpose | Key columns | Foreign-key links (outgoing) |
|---|---|---|---|
| [`staff_roles`](#staff_roles) | App authorization role (`editor` or `admin`) for one Supabase Auth user. | `user_id`, `role`, `assigned_at` | `user_id` → `auth.users(id)` |
| [`staff_invitations`](#staff_invitations) | Time-limited invitation to grant a verified email a staff role, with issuer and acceptance timestamp. | `email`, `role`, `invited_by`, `expires_at`, `accepted_at` | `invited_by` → `auth.users(id)` |

## Per-table column index

The lists below show **all currently observed columns** in schema order, not just the keys highlighted above. For types, defaults, required fields, CHECK constraints and indexes, inspect the migrations or query the live schema.

### Site content and media

#### `site_pages`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (8):** `id`, `path`, `source_key`, `title`, `body_markdown`, `published`, `created_at`, `updated_at`.
- **Purpose:** CMS source pages, imported paths and full Markdown copy for public routes.
- **FKs:** None.

#### `media_assets`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (13):** `id`, `source_key`, `source_url`, `storage_key`, `alt_text`, `mime_type`, `width`, `height`, `byte_size`, `sha256`, `status`, `created_at`, `updated_at`.
- **Purpose:** Metadata for public media files; links original source information to a Supabase Storage key.
- **FKs:** None.

#### `site_media`

- **Primary key:** `slot`. **RLS:** enabled.
- **All columns (2):** `slot`, `media_asset_id`.
- **Purpose:** Named site-wide image placements such as hero or navigation imagery.
- **FKs:** `media_asset_id` → `media_assets(id)`.

#### `page_media`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (5):** `id`, `page_id`, `media_asset_id`, `position`, `role`.
- **Purpose:** Ordered images attached to a CMS page, with placement role.
- **FKs:** `media_asset_id` → `media_assets(id)`; `page_id` → `site_pages(id)`.

#### `projects`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (10):** `id`, `page_id`, `slug`, `title`, `subtitle`, `featured_media_id`, `status`, `sort_order`, `created_at`, `updated_at`.
- **Purpose:** Public portfolio/project catalogue with publication status and featured media.
- **FKs:** `featured_media_id` → `media_assets(id)`; `page_id` → `site_pages(id)`.

#### `project_media`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (4):** `id`, `project_id`, `media_asset_id`, `position`.
- **Purpose:** Ordered gallery images for projects.
- **FKs:** `media_asset_id` → `media_assets(id)`; `project_id` → `projects(id)`.

#### `team_members`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (11):** `id`, `page_id`, `name`, `slug`, `external_url`, `roles`, `group_name`, `headshot_media_id`, `sort_order`, `created_at`, `updated_at`.
- **Purpose:** Public-facing profiles, bios/roles and headshots, distinct from login permissions.
- **FKs:** `headshot_media_id` → `media_assets(id)`; `page_id` → `site_pages(id)`.

#### `blog_posts`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (14):** `id`, `page_id`, `slug`, `title`, `excerpt`, `body_markdown`, `status`, `published_at`, `featured_media_id`, `author_id`, `created_at`, `updated_at`, `created_by`, `updated_by`.
- **Purpose:** CMS blog entries, author attribution, featured image, draft/publish lifecycle.
- **FKs:** `author_id` → `team_members(id)`; `created_by` → `auth.users(id)`; `featured_media_id` → `media_assets(id)`; `page_id` → `site_pages(id)`; `updated_by` → `auth.users(id)`.

#### `events`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (11):** `id`, `page_id`, `slug`, `title`, `start_at`, `end_at`, `status`, `date_review_required`, `featured_media_id`, `created_at`, `updated_at`.
- **Purpose:** Public event catalogue and archived date information; not a source of bookable capacity.
- **FKs:** `featured_media_id` → `media_assets(id)`; `page_id` → `site_pages(id)`.

### Store and commerce

#### `products`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (15):** `id`, `page_id`, `slug`, `title`, `description`, `price_minor`, `currency`, `sold_out`, `status`, `featured_media_id`, `sort_order`, `stripe_product_id`, `stripe_price_id`, `created_at`, `updated_at`.
- **Purpose:** Store merchandise/digital goods catalogue, including price, sold-out state, images and future Stripe IDs.
- **FKs:** `featured_media_id` → `media_assets(id)`; `page_id` → `site_pages(id)`.

#### `product_media`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (4):** `id`, `product_id`, `media_asset_id`, `position`.
- **Purpose:** Ordered product gallery images.
- **FKs:** `media_asset_id` → `media_assets(id)`; `product_id` → `products(id)`.

#### `product_downloads`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (10):** `id`, `product_id`, `storage_bucket`, `storage_key`, `filename`, `mime_type`, `byte_size`, `available`, `created_at`, `updated_at`.
- **Purpose:** Private file metadata for purchased digital downloads and fulfillment.
- **FKs:** `product_id` → `products(id)`.

#### `customers`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (7):** `id`, `user_id`, `stripe_customer_id`, `created_at`, `updated_at`, `contact_email`, `display_name`.
- **Purpose:** Commerce/member profile linked to a Supabase Auth account when present, plus Stripe/customer contact IDs.
- **FKs:** `user_id` → `auth.users(id)`.

#### `orders`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (10):** `id`, `customer_id`, `booking_id`, `kind`, `provider_session_id`, `amount_minor`, `currency`, `status`, `created_at`, `updated_at`.
- **Purpose:** Server-owned payment order ledger, including product, donation, membership or booking orders.
- **FKs:** `booking_id` → `bookings(id)`; `customer_id` → `customers(id)`.

#### `order_items`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (10):** `id`, `order_id`, `product_id`, `campaign_id`, `membership_plan_id`, `quantity`, `unit_amount_minor`, `cadence`, `created_at`, `offering_id`.
- **Purpose:** Individual purchased/pledged catalogue lines, referencing exactly one product, offering, donation campaign or membership plan.
- **FKs:** `campaign_id` → `donation_campaigns(id)`; `membership_plan_id` → `membership_plans(id)`; `offering_id` → `offerings(id)`; `order_id` → `orders(id)`; `product_id` → `products(id)`.

#### `payment_events`

- **Primary key:** `event_id`. **RLS:** enabled.
- **All columns (7):** `event_id`, `order_id`, `provider_session_id`, `kind`, `amount_minor`, `currency`, `received_at`.
- **Purpose:** Idempotent record of received payment-provider success/failure/refund events.
- **FKs:** `order_id` → `orders(id)`.

#### `payment_adjustments`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (8):** `id`, `order_id`, `stripe_event_id`, `stripe_object_id`, `kind`, `amount_minor`, `currency`, `created_at`.
- **Purpose:** Separate partial/full refunds and dispute event records associated with an order.
- **FKs:** `order_id` → `orders(id)`.

#### `outbox_jobs`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (11):** `id`, `dedupe_key`, `kind`, `order_id`, `booking_id`, `payload`, `status`, `attempt_count`, `available_at`, `created_at`, `updated_at`.
- **Purpose:** Deduplicated queued work for completed orders and booking confirmation/cancellation side effects.
- **FKs:** `booking_id` → `bookings(id)`; `order_id` → `orders(id)`.

#### `entitlements`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (7):** `id`, `order_item_id`, `customer_id`, `product_id`, `status`, `granted_at`, `revoked_at`.
- **Purpose:** Rights granted to a customer for a paid product line, including revocation status.
- **FKs:** `order_item_id, product_id` → `order_items(id, product_id)`; `customer_id` → `customers(id)`; `order_item_id` → `order_items(id)`; `product_id` → `products(id)`.

### Scheduling and reservations

#### `offerings`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (11):** `id`, `slug`, `title`, `description`, `kind`, `published`, `accepting_bookings`, `created_at`, `updated_at`, `price_minor`, `currency`.
- **Purpose:** Classes, appointments and informational activities with booking price and publication/acceptance controls.
- **FKs:** None.

#### `booking_slots`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (12):** `id`, `offering_id`, `starts_at`, `ends_at`, `time_zone`, `capacity`, `max_seats_per_booking`, `available`, `requires_payment`, `google_calendar_event_id`, `created_at`, `updated_at`.
- **Purpose:** Real scheduled occurrences with timezone, capacity, seat limits, payment flag and optional external calendar ID.
- **FKs:** `offering_id` → `offerings(id)`.

#### `bookings`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (14):** `id`, `offering_id`, `slot_id`, `attendee_ref`, `seats`, `status`, `idempotency_key`, `requires_payment`, `payment_order_id`, `created_at`, `expires_at`, `confirmed_at`, `cancelled_at`, `customer_id`.
- **Purpose:** Seat reservations/holds against a specific offering and slot; booking lifecycle and optional linked payment/customer.
- **FKs:** `payment_order_id` → `orders(id)`; `slot_id, offering_id` → `booking_slots(id, offering_id)`; `customer_id` → `customers(id)`.

#### `booking_contacts`

- **Primary key:** `booking_id`. **RLS:** enabled.
- **All columns (4):** `booking_id`, `email`, `display_name`, `created_at`.
- **Purpose:** Private attendee email/name for a booking, kept separate from the reservation ledger.
- **FKs:** `booking_id` → `bookings(id)`.

#### `booking_admin_audit`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (5):** `id`, `booking_id`, `action`, `actor_id`, `created_at`.
- **Purpose:** Append-only history of manual staff booking creation and cancellation, with actor.
- **FKs:** `actor_id` → `auth.users(id)`; `booking_id` → `bookings(id)`.

### Donations and memberships

#### `donation_campaigns`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (13):** `id`, `slug`, `title`, `description`, `currency`, `minimum_minor`, `maximum_minor`, `allowed_cadences`, `published`, `accepting_contributions`, `stripe_product_id`, `created_at`, `updated_at`.
- **Purpose:** Donation/fundraising campaigns, accepted contribution ranges, cadence options and publication state.
- **FKs:** None.

#### `membership_plans`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (13):** `id`, `slug`, `title`, `description`, `currency`, `joining_fee_minor`, `quarterly_amount_minor`, `published`, `accepting_applications`, `stripe_product_id`, `stripe_price_id`, `created_at`, `updated_at`.
- **Purpose:** Paid membership tiers with joining and quarterly fees plus publication/acceptance state.
- **FKs:** None.

#### `membership_applications`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (10):** `id`, `customer_id`, `plan_id`, `kind`, `order_id`, `status`, `submitted_at`, `reviewed_at`, `reviewed_by`, `created_at`.
- **Purpose:** Customer applications awaiting separate community/co-op membership approval; may reference an order.
- **FKs:** `customer_id` → `customers(id)`; `order_id` → `orders(id)`; `plan_id` → `membership_plans(id)`; `reviewed_by` → `auth.users(id)`.

#### `memberships`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (8):** `id`, `application_id`, `customer_id`, `plan_id`, `status`, `approved_at`, `ended_at`, `created_at`.
- **Purpose:** Approved customer memberships associated with an application and optional plan.
- **FKs:** `application_id` → `membership_applications(id)`; `customer_id` → `customers(id)`; `plan_id` → `membership_plans(id)`.

#### `subscriptions`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (12):** `id`, `customer_id`, `membership_id`, `campaign_id`, `stripe_subscription_id`, `cadence`, `status`, `current_period_start`, `current_period_end`, `cancel_at_period_end`, `created_at`, `updated_at`.
- **Purpose:** Recurring Stripe billing for either a membership or donation campaign, with lifecycle and billing cadence.
- **FKs:** `campaign_id` → `donation_campaigns(id)`; `customer_id` → `customers(id)`; `membership_id` → `memberships(id)`.

#### `subscription_invoices`

- **Primary key:** `id`. **RLS:** enabled.
- **All columns (11):** `id`, `subscription_id`, `order_id`, `stripe_invoice_id`, `amount_due_minor`, `amount_paid_minor`, `currency`, `status`, `period_start`, `period_end`, `updated_at`.
- **Purpose:** Stripe invoice lifecycle and amounts for a recurring subscription.
- **FKs:** `order_id` → `orders(id)`; `subscription_id` → `subscriptions(id)`.

### Staff access

#### `staff_roles`

- **Primary key:** `user_id`. **RLS:** enabled.
- **All columns (3):** `user_id`, `role`, `assigned_at`.
- **Purpose:** App authorization role (`editor` or `admin`) for one Supabase Auth user.
- **FKs:** `user_id` → `auth.users(id)`.

#### `staff_invitations`

- **Primary key:** `email`. **RLS:** enabled.
- **All columns (6):** `email`, `role`, `invited_by`, `created_at`, `expires_at`, `accepted_at`.
- **Purpose:** Time-limited invitation to grant a verified email a staff role, with issuer and acceptance timestamp.
- **FKs:** `invited_by` → `auth.users(id)`.

## Domain rules and known boundaries

**Products vs offerings vs events.** `products` is the store's merchandise/digital-product catalogue, with media, sold-out state and Stripe references. `offerings` is the class/appointment catalogue, with price, publication and booking acceptance controls. `events` is website event content and is **not** a reservable session. A real occurrence belongs in `booking_slots`; a reserved seat belongs in `bookings`. `order_items` deliberately supports separate `product_id` and `offering_id` references, so payments can support both categories.

**Current overlap, do not amplify:** Three legacy class listings appear in both `products` and `offerings` with the same titles and GBP prices, but **there is no FK linking the two catalogues**. Editing one does not synchronize the other. The live source classes were imported into `offerings` for staff booking work; they remain non-bookable (`accepting_bookings = false`). The Fox Mask STL remains only a store product. Treat this as a migration overlap, not a model for creating more copies. Preserve existing store URLs until the public booking/store cutover is explicitly approved.

**Public page vs admin page.** The current public `/book` page still reads archived product snapshot data and has no bookable sessions. The draft `/staff/bookings` reads the live `offerings`, `booking_slots`, `bookings`, contacts and audit tables. A published offering does not imply an open session or valid booking.

**Images and storage.** Media bytes live in Supabase Storage. `media_assets.storage_key` and `product_downloads.storage_key` are **text references**, not foreign keys to `storage.objects`. `site_media` is keyed by a named UI slot; `page_media`, `project_media` and `product_media` are ordered join tables. `featured_media_id` and `headshot_media_id` link directly to `media_assets`.

**Identity and permissions.** Supabase manages `auth.users` independently of public profile tables. `customers.user_id`, `staff_roles.user_id`, and various audit actor IDs refer to authenticated users. Each account has **one staff role** row: `admin` includes editor capabilities. A public `team_members` profile does not grant staff permission. Invitations are redeemed through trusted database events against verified email, and the staff workspace requires MFA.

**Financial integrity.** `orders` and `order_items` are the transaction ledger; they are not cart state. `payment_events` records provider events, `payment_adjustments` records refunds/disputes, `outbox_jobs` queues deduplicated side effects, and `entitlements` represents product delivery rights. `membership_applications` and `memberships` are approval state, independent from billing `subscriptions`. A paid order alone does not grant a co-op membership.

**Security.** Every public table has RLS enabled, but access differs by table and user role. Financial ledgers and sensitive contacts need server-controlled access. The booking admin migration adds MFA-gated policies and guarded free booking transactions. Never enable broad table writes simply to make a client request work; check existing policies, column grants and functions first.

**Not foreign keys:** `google_calendar_event_id`, Stripe ID fields, `attendee_ref`, `source_key`, `storage_key`, `slug`, `path` and `site_media.slot` are identifier strings or external references. Do not join these as if PostgreSQL enforces them.

## Where to check implementation

- **Authoritative schema history:** `supabase/migrations/`, particularly `20261120000000_content_media_foundation.sql`, `20261120000002_commerce_catalogs.sql`, `20261120000003_booking_reservations.sql`, `20261120000004_order_payment_ledger.sql`, `20261120000005_memberships_subscriptions.sql`, `20261120000008_backend_relationships.sql`, `20261121220615_member_staff_auth.sql`, `20261122010000_staff_projects_team_cms.sql`, and `20261122030000_booking_admin_workspace.sql`.
- **Content queries:** `src/features/content/`, `src/features/blog/`, `src/features/commerce/store-catalog.ts`.
- **Booking admin:** `src/app/staff/bookings/`, `src/components/staff/bookings/`, `src/features/scheduling/`.
- **Authorization:** `src/lib/auth/` and `docs/authentication.md`.
- **Related docs:** `docs/clean-architecture.md`, `docs/staff-booking-management.md`, `docs/staff-booking-live-offerings.md`.

Keep this reference maintained along with any new or changed tables, FKs and their intended ownership.
