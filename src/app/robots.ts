import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  if (process.env.GITHUB_PAGES_PREVIEW === "true") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://www.empressvr.com/sitemap.xml",
  };
}
