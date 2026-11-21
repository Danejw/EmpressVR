"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import {
  addCartItem, normalizeCart, summarizeCart, updateCartQuantity,
  type CartLine, type CartSummary, type StoreProduct,
} from "@/features/commerce/cart";

const STORAGE_KEY = "empressvr:cart-preview:v1";
const EMPTY_SNAPSHOT = "[]";
let memorySnapshot = EMPTY_SNAPSHOT;
const listeners = new Set<() => void>();

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

function readSnapshot(): string {
  try { return sessionStorage.getItem(STORAGE_KEY) ?? memorySnapshot; }
  catch { return memorySnapshot; }
}
function readLines(catalog: readonly StoreProduct[]): CartLine[] {
  try { return normalizeCart(JSON.parse(readSnapshot()), catalog); }
  catch { return []; }
}
function writeLines(lines: readonly CartLine[]): void {
  memorySnapshot = JSON.stringify(lines);
  try { sessionStorage.setItem(STORAGE_KEY, memorySnapshot); }
  catch { /* Cart remains in memory if browser storage is blocked. */ }
  listeners.forEach((notify) => notify());
}
function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  const storageChanged = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) notify();
  };
  window.addEventListener("storage", storageChanged);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", storageChanged);
  };
}
const serverSnapshot = () => EMPTY_SNAPSHOT;
const subscribeNone = () => () => {};
const browserReady = () => true;
const serverReady = () => false;

export function CartProvider({
  catalog, children,
}: Readonly<{ catalog: readonly StoreProduct[]; children: React.ReactNode }>) {
  // Stable server snapshot avoids hydration mismatches while restoring tab cart state.
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot);
  const ready = useSyncExternalStore(subscribeNone, browserReady, serverReady);
  const lines = useMemo(() => {
    try { return normalizeCart(JSON.parse(snapshot), catalog); }
    catch { return []; }
  }, [snapshot, catalog]);

  const value = useMemo<CartContextValue>(() => ({
    ready, catalog, lines, summary: summarizeCart(lines, catalog),
    add: (productId) => writeLines(addCartItem(readLines(catalog), productId, catalog)),
    changeQuantity: (productId, quantity) =>
      writeLines(updateCartQuantity(readLines(catalog), productId, quantity, catalog)),
    remove: (productId) =>
      writeLines(updateCartQuantity(readLines(catalog), productId, 0, catalog)),
  }), [ready, catalog, lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider is missing");
  return context;
}
