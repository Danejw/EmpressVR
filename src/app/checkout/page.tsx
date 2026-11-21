import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutReview } from "@/components/checkout-review";

export const metadata: Metadata = {
  title: "Checkout preview",
  description: "Review your EmpressVR shopping cart before checkout.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <section className="commerce-page">
    <div className="page-container">
      <div className="commerce-page-header">
        <p className="commerce-eyebrow">Payment preparation</p>
        <h1>Checkout</h1>
      </div>
      <CheckoutReview />
      <details className="checkout-status-preview">
        <summary>Preview future payment screens</summary>
        <p>These example screens do not represent real payments.</p>
        <div className="checkout-preview-links">
          <Link href="/checkout/status/success">Success</Link>
          <Link href="/checkout/status/pending">Pending</Link>
          <Link href="/checkout/status/cancelled">Cancelled</Link>
          <Link href="/checkout/status/error">Error</Link>
        </div>
      </details>
    </div>
  </section>;
}
