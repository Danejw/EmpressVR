import type {ImgHTMLAttributes} from "react";
import {getMediaAsset,getMediaBySourceUrl} from "@/features/content/repository";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>,"src"> & {
  assetId?: string | null;
  sourceUrl?: string;
};

/** One render path for local media, then Supabase Storage, retaining the CDN fallback. */
export function MediaImage({assetId,sourceUrl,alt,loading,className,...props}:Props){
  const asset = getMediaAsset(assetId) || (sourceUrl ? getMediaBySourceUrl(sourceUrl) : undefined);
  const basePath = process.env.GITHUB_PAGES_PREVIEW === "true" ? "/EmpressVR" : "";
  const local = asset?.status === "imported" && asset.storage_key;
  const src = local ? basePath + "/" + asset.storage_key : asset?.source_url || sourceUrl;
  if (!src || !src.startsWith("/") && !src.startsWith("https://")) return null;
  // Static-export friendly today; optimized assets are already WebP.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={src} alt={alt ?? asset?.alt_text ?? ""} className={className}
    loading={loading ?? "lazy"}
    width={props.width ?? asset?.width ?? undefined}
    height={props.height ?? asset?.height ?? undefined} />;
}
