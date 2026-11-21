"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";
import { displayMoney } from "@/features/commerce/cart";

export function CheckoutReview() {
  const { ready, summary } = useCart();
  if (!ready) return <p aria-live="polite">Loading checkout summary…</p>;

  return <div className="checkout-review">
    {summary.lines.length === 0 ? (
      <section className="checkout-review-main">
        <h2>No items to review</h2>
        <p>Add an available product before reviewing the order.</p>
        <Link className="pill-button" href="/store">Return to store</Link>
      </section>
    ) : (
      <>
        <section className="checkout-review-main">
          <p className="commerce-eyebrow">Order preview</p>
          <h2>Ready for checkout</h2>
          <p>Your selected items are shown below. No order has been placed or charged.</p>
          <div className="checkout-review-items">
            {summary.lines.map(({ product, quantity, lineMinor }) => (
              <div key={product.id} className="checkout-review-item">
                <div><strong>{product.title}</strong><small>Quantity {quantity}</small></div>
                <span>{displayMoney(lineMinor, product.currency)}</span>
              </div>
            ))}
          </div>
          <Link href="/cart" className="cart-return-link">Edit cart</Link>
        </section>
        <aside className="cart-summary" aria-label="Checkout summary">
          <h2>Payment summary</h2>
          <dl><div><dt>Subtotal</dt>
            <dd>{summary.currency ? displayMoney(summary.subtotalMinor, summary.currency) : ""}</dd>
          </div></dl>
          <p>Any taxes or fees are determined by the payment provider when checkout is connected.</p>
          <button type="button" className="cart-review-link" disabled>
            Checkout not yet connected
          </button>
          <p className="commerce-preview-notice">Stripe has not been connected. This page does not submit an order or collect payment details.</p>
          <a className="cart-current-store" href="https://www.empressvr.com/store"
            rel="noopener noreferrer">Use the current EmpressVR store</a>
        </aside>
      </>
    )}
  </div>;
}
