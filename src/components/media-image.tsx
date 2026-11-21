import type { ImgHTMLAttributes } from "react";
import { getMediaAsset, getMediaBySourceUrl } from "@/features/content/repository";
import { mediaSource } from "@/features/content/media-url";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  assetId?: string | null;
  sourceUrl?: string;
};

/** Every imported public image resolves to Supabase Storage or the offline backup. */
export function MediaImage({ assetId, sourceUrl, alt, loading, className, ...props }: Props) {
  const asset = getMediaAsset(assetId) ||
    (sourceUrl ? getMediaBySourceUrl(sourceUrl) : undefined);
  const localBasePath = process.env.GITHUB_PAGES_PREVIEW === "true"
    ? (process.env.GITHUB_PAGES_BASE_PATH || "/EmpressVR") : "";
  const src = mediaSource(asset, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    localBasePath,
  });
  if (!src) return null;

  // The public Storage files are already optimized WebP images.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={src} alt={alt ?? asset?.alt_text ?? ""}
    className={className} loading={loading ?? "lazy"}
    width={props.width ?? asset?.width ?? undefined}
    height={props.height ?? asset?.height ?? undefined} />;
}
