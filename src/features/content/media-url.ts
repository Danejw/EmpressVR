import type { MediaAsset } from "./repository";

/** Only validated public Storage object keys are accepted for image URLs. */
export function publicStorageMediaUrl(storageKey: string, root: string): string | null {
  if (!/^(?:media\/[a-f0-9]{64}|(?:blog|content)\/[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})\.(webp|gif|png|jpg|jpeg|avif)$/.test(storageKey)) return null;
  try {
    const base = new URL(root);
    if (base.protocol !== "https:" || base.pathname !== "/" ||
      !base.hostname.endsWith(".supabase.co")) return null;
    return new URL("/storage/v1/object/public/site-media/" + storageKey, base).toString();
  } catch {
    return null;
  }
}

/**
 * Both static and server-rendered pages share this resolver. If the project URL
 * is missing (offline/local development), use the checked-in optimized file.
 * Never emit an original Squarespace image URL.
 */
export function mediaSource(
  asset: MediaAsset | undefined,
  config: Readonly<{ supabaseUrl: string; localBasePath: string }>,
): string | null {
  if (!asset || asset.status !== "imported" || !asset.storage_key) return null;
  return publicStorageMediaUrl(asset.storage_key, config.supabaseUrl)
    ?? config.localBasePath + "/" + asset.storage_key;
}
