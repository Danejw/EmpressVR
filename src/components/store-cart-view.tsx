"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";
import { displayMoney, PREVIEW_QUANTITY_LIMIT } from "@/features/commerce/cart";

export function StoreCartView() {
  const { ready, summary, changeQuantity, remove } = useCart();
  if (!ready) return <p aria-live="polite">Loading cart…</p>;

  return <div className="cart-layout">
    {summary.lines.length === 0 ? (
      <div className="cart-empty">
        <h2>Your cart is empty</h2>
        <p>Browse EmpressVR products to add items.</p>
        <Link href="/store" className="pill-button">Browse store</Link>
      </div>
    ) : (
      <>
        <section className="cart-entries" aria-label="Cart items">
          {summary.lines.map(({ product, quantity, lineMinor }) => (
            <article className="cart-entry" key={product.id}>
              <Link href={"/store/p/" + product.slug} className="cart-entry-image">
                {product.featuredMediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.featuredMediaUrl} alt={product.title} loading="lazy" />
                ) : null}
              </Link>
              <div className="cart-entry-details">
                <h2><Link href={"/store/p/" + product.slug}>{product.title}</Link></h2>
                <p>{displayMoney(product.priceMinor, product.currency)} each</p>
                <div className="cart-entry-actions">
                  <label htmlFor={"qty-" + product.id}>Quantity</label>
                  <select id={"qty-" + product.id} value={quantity}
                    onChange={(event) => changeQuantity(product.id, Number(event.target.value))}>
                    {Array.from({ length: PREVIEW_QUANTITY_LIMIT }, (_, index) => (
                      <option value={index + 1} key={index + 1}>{index + 1}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => remove(product.id)}
                    aria-label={"Remove " + product.title}>Remove</button>
                </div>
              </div>
              <strong className="cart-entry-total">{displayMoney(lineMinor, product.currency)}</strong>
            </article>
          ))}
          <Link className="cart-return-link" href="/store">Continue shopping</Link>
        </section>
        <aside className="cart-summary" aria-label="Order summary">
          <h2>Order summary</h2>
          <dl>
            <div><dt>Items</dt><dd>{summary.itemCount}</dd></div>
            <div><dt>Subtotal</dt>
              <dd>{summary.currency ? displayMoney(summary.subtotalMinor, summary.currency) : ""}</dd>
            </div>
          </dl>
          <p>Taxes and applicable fees are determined when a real checkout is available.</p>
          <Link href="/checkout" className="cart-review-link">Review checkout</Link>
          <a className="cart-current-store" href="https://www.empressvr.com/store"
            rel="noopener noreferrer">Buy through the current EmpressVR store</a>
        </aside>
      </>
    )}
  </div>;
}
