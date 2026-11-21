import { getPublishedProducts } from "@/features/content/supabase-public";
import type { StoreProduct } from "./cart";

/** Converts the local published content snapshot into future Supabase-compatible props. */
export async function getStoreCatalog(): Promise<StoreProduct[]> {
  const products = await getPublishedProducts();
  return products.map((product) => ({
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    priceMinor: product.price_minor,
    currency: product.currency,
    soldOut: product.sold_out || product.status !== "active",
    featuredMediaId: product.featured_media_id,
  }));
}
