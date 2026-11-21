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
