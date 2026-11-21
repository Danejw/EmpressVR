import type { MetadataRoute } from "next";

// Required for metadata route export in the static GitHub Pages preview.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  if (process.env.GITHUB_PAGES_PREVIEW === "true") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://www.empressvr.com/sitemap.xml",
  };
}
