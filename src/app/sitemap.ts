import type { MetadataRoute } from "next";
import { getPages } from "@/features/content/repository";

// Unusable or placeholder snapshots should not enter the search index.
const excludedPaths = new Set(["/blog", "/coming-soon"]);

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.GITHUB_PAGES_PREVIEW === "true"
    ? "https://danejw.github.io/EmpressVR"
    : "https://www.empressvr.com";

  return getPages()
    .filter((page) => page.published && !excludedPaths.has(page.path))
    .map((page) => ({ url: siteUrl + (page.path === "/" ? "/" : page.path) }));
}
