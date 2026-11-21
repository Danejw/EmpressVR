"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  addCartItem, normalizeCart, summarizeCart, updateCartQuantity,
  type CartLine, type CartSummary, type StoreProduct,
} from "@/features/commerce/cart";

const STORAGE_KEY = "empressvr:cart-preview:v1";

type CartContextValue = Readonly<{
  ready: boolean;
  catalog: readonly StoreProduct[];
  lines: readonly CartLine[];
  summary: CartSummary;
  add: (productId: string) => void;
  changeQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
}>;

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  catalog, children,
}: Readonly<{ catalog: readonly StoreProduct[]; children: React.ReactNode }>) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const previous = sessionStorage.getItem(STORAGE_KEY);
      setLines(normalizeCart(previous ? JSON.parse(previous) : [], catalog));
    } catch {
      setLines([]);
    }
    setReady(true);
  }, [catalog]);

  useEffect(() => {
    if (!ready) return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeCart(lines, catalog))); }
    catch { /* Browsers can disable session storage; cart still works in memory. */ }
  }, [lines, catalog, ready]);

  const value = useMemo<CartContextValue>(() => ({
    ready, catalog, lines, summary: summarizeCart(lines, catalog),
    add: (productId) => setLines((current) => addCartItem(current, productId, catalog)),
    changeQuantity: (productId, quantity) =>
      setLines((current) => updateCartQuantity(current, productId, quantity, catalog)),
    remove: (productId) =>
      setLines((current) => updateCartQuantity(current, productId, 0, catalog)),
  }), [ready, catalog, lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider is missing");
  return context;
}
