import type { MetadataRoute } from "next";
import { getPublishedPages } from "../features/content/supabase-public";

export const dynamic = "force-dynamic";
const excludedPaths = new Set(["/blog", "/coming-soon"]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.empressvr.com").replace(/\/$/, "");
  const pages = await getPublishedPages();
  return pages
    .filter((page) => page.published && !excludedPaths.has(page.path))
    .map((page) => ({ url: siteUrl + (page.path === "/" ? "/" : page.path) }));
}
