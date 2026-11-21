# Commerce foundation

`checkout.ts` builds server-authoritative checkout quotes for products, recurring or one-time contributions, and paid co-operative membership applications. The price, currency, availability, quantity limit and cadence policy come from the authoritative catalog, never from a browser-supplied product price. The existing publicly displayed Fox Mask item is £5; other items captured as sold out must remain unavailable.

Membership quotes support the published £1 joining fee and optional quarterly contribution, but **membership access or voting rights must require actual membership approval**, even after payment. The free Community membership is a separate non-checkout process. Donations are commercial contributions, with no assumed charitable Gift Aid treatment. The final tax and fee amount must be computed by the real gateway after merchant tax configuration is approved.

`payment-state.ts` decides transitions for verified events: `awaiting_payment → paid / failed` and `paid → refunded`. It requires exact order/session/amount/currency matches, refuses contradictory state changes, and requests fulfillment only on the initial paid transition. `PaymentEventLedger.applyVerifiedOutcomeAtomically` must transactionally deduplicate provider event IDs, update order state, and enqueue one fulfillment task. Delayed payment successes and failures, subscription invoice lifecycle, disputes, partial refunds, cancellation, digital-delivery authorization and retry-safe outbox processing must be covered by a future **signature-verified Stripe webhook** implementation.

**Still missing:** merchant identity verification, Stripe sandbox and checked product/price IDs, server-only Checkout Sessions, signed webhooks, persisted orders and subscriptions, idempotent fulfillment/outbox, entitlement authorization, private files, tax configuration, refunds, existing subscriber reconciliation, and support for membership approval. No Stripe dependency, payment endpoint, secret, order storage, or success-page fulfillment has been added. **Keep current Squarespace checkout, donations and Acuity links live.**

The quotation and state-machine tests validate positive/negative paths, including sold-out stock, tampered amounts, membership cadence, failed payments, duplicate-success decisions and refunds. See [the foundation contract](../../../docs/booking-commerce-foundation.md) for integration gates.


## Phase 1A: store and checkout preview

The website now has a working **browser-tab preview cart** for available products.
Store cards and product detail pages use the same `StoreAddButton`; both header
navigation links go to `/cart`. The cart supports adding items, quantities
(1–10 UI cap), removing items, the subtotal and a `/checkout` review screen.
Preview state uses `sessionStorage` for product IDs and quantities only.
It does not persist prices, emails or payment information. Prices and sellable
status are recomputed from the current content catalog; stale, malformed or
sold-out items are discarded. The existing site remains the only location
where products can actually be purchased.

The checkout preview never submits an order, captures a card number, or
presents a real payment result. Its payment-status pages under
`/checkout/status/{success,pending,cancelled,error}` are explicitly labeled
examples, have no fulfillment logic and are excluded from search indexing.

On Supabase connection, swap `getStoreCatalog` for the authorized published
catalog, and recheck product price/availability and limits on the **server**
before creating a Stripe Checkout Session. A client-side subtotal is always
non-authoritative. Connect signature-verified webhooks and persistent orders
before enabling the disabled payment action. No product fulfillment or digital
file access may derive from a redirect or a query string.

Automated coverage: `src/features/commerce/cart.test.ts` and
`e2e/store-checkout.spec.ts`, with all original browser and migration checks.
No remote database, live Stripe product, or Squarespace checkout is modified.

## Phase 1C: membership application preview

`/membership` contains source-grounded cards for the free Community, £1
Supporter, and £1 joining fee + £13–£52/quarter User memberships. Employee
membership is informational only (the source site says there are no employees).
The User quarterly slider illustrates the existing sliding-scale range;
**it is not an approved or activated Stripe subscription price**.
See `src/features/membership/preview.ts`.

The application UI displays the membership-specific questions, communication
preferences, privacy and co-op terms consents, and a validated review stage.
It holds any typed details **only in current React component memory**. There
is no submission, database write, browser storage, email transmission, account
creation, charge, approval, or membership/voting entitlement.

The archived, nonfunctional Squarespace form text is suppressed on
`/join-the-community`, `/join-the-coop`, and `/join-the-coop-na`
without changing the preserved Markdown source files. Those routes link to
the new preview and the original official form. The North America archived
page's "applications closed" message is preserved in the handoff.

The four status routes `/membership/status/{pending,approved,rejected,withdrawn}`
are nonindexable **examples only**, never real application lookups. Integrate
with the existing RLS-protected `membership_applications`, `memberships`,
`membership_plans`, and `subscriptions` tables only after a real authenticated
application service, approved plan data, authorized reviewer workflow, and
Stripe lifecycle are ready. No paid plan or member entitlement may be inferred
from this preview, selected slider value, redirect, or customer-controlled data.
Tests live in `src/features/membership/preview.test.ts` and
`e2e/membership-preview.spec.ts`. No hosted resources have been changed.
