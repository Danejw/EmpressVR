import { getPublishedProducts, getPublicMediaAsset } from "@/features/content/supabase-public";
import { mediaSource } from "@/features/content/media-url";
import type { StoreProduct } from "./cart";

/** Converts the local published content snapshot into future Supabase-compatible props. */
export async function getStoreCatalog(): Promise<StoreProduct[]> {
  const products = await getPublishedProducts();
  return Promise.all(products.map(async (product) => ({
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    priceMinor: product.price_minor,
    currency: product.currency,
    soldOut: product.sold_out || product.status !== "active",
    featuredMediaId: product.featured_media_id,
    featuredMediaUrl: mediaSource(await getPublicMediaAsset(product.featured_media_id), {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
      localBasePath: "",
    }),
  })));
}
