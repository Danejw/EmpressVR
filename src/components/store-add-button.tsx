"use client";

import Link from "next/link";
import { useState } from "react";
import { isPurchasable, PREVIEW_QUANTITY_LIMIT } from "@/features/commerce/cart";
import { useCart } from "./cart-provider";

export function StoreAddButton({ productId }: { productId: string }) {
  const { add, catalog, lines, ready } = useCart();
  const [added, setAdded] = useState(false);
  const product = catalog.find((item) => item.id === productId);
  if (!product || !isPurchasable(product)) {
    return <span className="availability">Sold out</span>;
  }
  const quantity = lines.find((item) => item.productId === productId)?.quantity ?? 0;
  const full = quantity >= PREVIEW_QUANTITY_LIMIT;

  return <div className="store-add-controls">
    <button className="pill-button" type="button" disabled={!ready || full}
      aria-label={"Add " + product.title + " to cart"}
      onClick={() => { add(product.id); setAdded(true); }}>
      {full ? "Preview limit reached" : added ? "Add another" : "Add to cart"}
    </button>
    {(added || quantity > 0) && <Link className="store-cart-shortcut" href="/cart">
      View cart ({quantity})
    </Link>}
    <a className="store-existing-link" href={"https://www.empressvr.com/store/p/" + product.slug}
      rel="noopener noreferrer">Buy on current store</a>
  </div>;
}
