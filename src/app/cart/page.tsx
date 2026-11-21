import type { Metadata } from "next";
import { StoreCartView } from "@/components/store-cart-view";

export const metadata: Metadata = {
  title: "Cart",
  description: "Review products selected from EmpressVR's store.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <section className="commerce-page">
    <div className="page-container">
      <div className="commerce-page-header">
        <p className="commerce-eyebrow">Your selection</p>
        <h1>Shopping cart</h1>
      </div>
      <StoreCartView />
    </div>
  </section>;
}
