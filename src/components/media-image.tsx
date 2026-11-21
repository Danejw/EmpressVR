import type { ImgHTMLAttributes } from "react";
import { getMediaAsset, getMediaBySourceUrl } from "@/features/content/repository";
import { getPublicMediaAsset, getPublicMediaBySourceUrl } from "@/features/content/supabase-public";
import { mediaSource } from "@/features/content/media-url";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  assetId?: string | null;
  sourceUrl?: string;
};

/** Resolve published media metadata, including newly uploaded assets. */
export async function MediaImage({ assetId, sourceUrl, alt, loading, className, ...props }: Props) {
  const asset = (assetId ? await getPublicMediaAsset(assetId) : undefined)
    ?? (sourceUrl ? await getPublicMediaBySourceUrl(sourceUrl) : undefined)
    ?? (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? undefined : getMediaAsset(assetId) ?? (sourceUrl ? getMediaBySourceUrl(sourceUrl) : undefined));
  const src = mediaSource(asset, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    localBasePath: "",
  });
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={src} alt={alt ?? asset?.alt_text ?? ""}
    className={className} loading={loading ?? "lazy"} decoding="async"
    width={props.width ?? asset?.width ?? undefined}
    height={props.height ?? asset?.height ?? undefined} />;
}
