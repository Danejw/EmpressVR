/**
 * Browser preview cart. Only IDs and quantities are persisted.
 * Current prices and availability are always recomputed from the trusted catalog.
 * These functions are not an order, inventory reservation or payment authorization.
 */
export const PREVIEW_QUANTITY_LIMIT = 10;

export type StoreProduct = Readonly<{
  id: string;
  slug: string;
  title: string;
  description: string;
  priceMinor: number;
  currency: string;
  soldOut: boolean;
  featuredMediaId: string | null;
  featuredMediaUrl?: string | null;
}>;

export type CartLine = Readonly<{ productId: string; quantity: number }>;
export type CartDetail = Readonly<{ product: StoreProduct; quantity: number; lineMinor: number }>;
export type CartSummary = Readonly<{
  lines: readonly CartDetail[];
  itemCount: number;
  subtotalMinor: number;
  currency: string | null;
}>;

export function isPurchasable(product: StoreProduct): boolean {
  return product.soldOut === false &&
    Number.isSafeInteger(product.priceMinor) && product.priceMinor > 0 &&
    /^[A-Z]{3}$/.test(product.currency);
}

/** Ignore missing, sold-out or malformed entries from untrusted browser state. */
export function normalizeCart(value: unknown, catalog: readonly StoreProduct[]): CartLine[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map(catalog.filter(isPurchasable).map((product) => [product.id, product]));
  const counts = new Map<string, number>();
  for (const entry of value.slice(0, 100)) {
    if (!entry || typeof entry !== "object") continue;
    const line = entry as Record<string, unknown>;
    if (typeof line.productId !== "string" || !byId.has(line.productId) ||
        !Number.isSafeInteger(line.quantity) || (line.quantity as number) < 1) continue;
    const next = (counts.get(line.productId) || 0) + (line.quantity as number);
    counts.set(line.productId, Math.min(PREVIEW_QUANTITY_LIMIT, next));
  }
  return Array.from(counts, ([productId, quantity]) => ({ productId, quantity }));
}

export function updateCartQuantity(
  current: readonly CartLine[],
  productId: string,
  quantity: number,
  catalog: readonly StoreProduct[],
): CartLine[] {
  const available = catalog.find((product) => product.id === productId && isPurchasable(product));
  const safe = normalizeCart(current, catalog);
  if (!available || !Number.isSafeInteger(quantity) || quantity < 0) return safe;
  const without = safe.filter((line) => line.productId !== productId);
  if (quantity === 0) return without;
  return [...without, { productId, quantity: Math.min(quantity, PREVIEW_QUANTITY_LIMIT) }];
}

export function addCartItem(
  current: readonly CartLine[],
  productId: string,
  catalog: readonly StoreProduct[],
): CartLine[] {
  const safe = normalizeCart(current, catalog);
  const previous = safe.find((line) => line.productId === productId)?.quantity ?? 0;
  return updateCartQuantity(safe, productId, previous + 1, catalog);
}

export function summarizeCart(
  cart: readonly CartLine[],
  catalog: readonly StoreProduct[],
): CartSummary {
  const valid = normalizeCart(cart, catalog);
  const byId = new Map(catalog.map((product) => [product.id, product]));
  const lines: CartDetail[] = [];
  let itemCount = 0;
  let subtotalMinor = 0;
  let currency: string | null = null;
  for (const item of valid) {
    const product = byId.get(item.productId);
    if (!product || (currency !== null && currency !== product.currency)) continue;
    if (!currency) currency = product.currency;
    const lineMinor = product.priceMinor * item.quantity;
    if (!Number.isSafeInteger(lineMinor) || !Number.isSafeInteger(subtotalMinor + lineMinor)) {
      throw new Error("Cart preview total exceeds supported range");
    }
    lines.push({ product, quantity: item.quantity, lineMinor });
    itemCount += item.quantity;
    subtotalMinor += lineMinor;
  }
  return { lines, itemCount, subtotalMinor, currency };
}

export function displayMoney(minor: number, currency: string): string {
  if (!Number.isSafeInteger(minor) || minor < 0 || !/^[A-Z]{3}$/.test(currency)) {
    throw new Error("Invalid amount or currency");
  }
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);
}
