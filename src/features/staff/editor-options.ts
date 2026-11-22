import "server-only";
import { publicStorageMediaUrl } from "@/features/content/media-url";
import { authConfig } from "@/lib/auth/config";
import { getServerAuth } from "@/lib/auth/server";

export type ContentImage = { id: string; alt: string; url: string };
export async function getContentImages(auth: NonNullable<Awaited<ReturnType<typeof getServerAuth>>>) {
  const { data } = await auth.from("media_assets")
    .select("id,alt_text,storage_key").eq("status", "imported")
    .order("updated_at", { ascending: false }).limit(300);
  const { url } = authConfig();
  return (data ?? []).flatMap(asset => {
    const src = asset.storage_key ? publicStorageMediaUrl(asset.storage_key, url) : null;
    return src ? [{ id: asset.id, alt: asset.alt_text || "Image", url: src }] : [];
  }) as ContentImage[];
}
