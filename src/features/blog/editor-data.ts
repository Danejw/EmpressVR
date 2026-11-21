import "server-only";
import { publicStorageMediaUrl } from "@/features/content/media-url";
import { authConfig } from "@/lib/auth/config";
import { getServerAuth } from "@/lib/auth/server";

export type BlogAuthorOption = { id: string; name: string };
export type BlogImageOption = { id: string; alt: string; url: string };

/** This function is only called after requireStaff() completes. */
export async function getBlogEditorOptions(auth: NonNullable<Awaited<ReturnType<typeof getServerAuth>>>) {
  const [{ data: authors }, { data: assets }] = await Promise.all([
    auth.from("team_members").select("id,name").order("name").limit(100),
    auth.from("media_assets").select("id,alt_text,storage_key")
      .eq("status", "imported").order("updated_at", { ascending: false }).limit(30),
  ]);
  const { url } = authConfig();
  return {
    authors: (authors ?? []) as BlogAuthorOption[],
    images: (assets ?? []).flatMap(asset => {
      const src = asset.storage_key ? publicStorageMediaUrl(asset.storage_key, url) : null;
      return src ? [{ id: asset.id, alt: asset.alt_text || "Uploaded image", url: src }] : [];
    }) as BlogImageOption[],
  };
}
