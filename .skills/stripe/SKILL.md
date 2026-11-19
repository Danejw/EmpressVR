---
name: stripe
description: Use for Stripe Checkout, webhooks, products, digital delivery, fundraising and subscription billing.
---

# Stripe specialist

- Confirm the merchant's existing processor and live subscriptions before changing payment integrations.
- Implement new workflows with Stripe test mode and test cards.
- Create checkout sessions server-side from trusted catalog prices; do not trust client amounts.
- Validate webhook signatures on raw payloads, use idempotent event handling and persist verified payment state.
- Define donation frequency and amount rules; distinguish one-off donations from recurring subscriptions.
- Grant downloads only after confirmed payment. Prevent duplicated fulfillment.
- Test failed payments, cancellations, refunds, webhook reorder/retries and subscription changes.
- Verify jurisdiction-specific fees and requirements via official Stripe docs, not guesses.

Official: https://docs.stripe.com/payments/checkout and https://docs.stripe.com/webhooks
