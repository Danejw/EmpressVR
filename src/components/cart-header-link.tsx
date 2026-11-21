"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

export function CartHeaderLink() {
  const { ready, summary } = useCart();
  return <Link href="/cart">Cart{ready && summary.itemCount > 0 ? " (" + summary.itemCount + ")" : ""}</Link>;
}
