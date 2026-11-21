import type { MetadataRoute } from "next";

// Required for metadata route export in the static GitHub Pages preview.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://www.empressvr.com/sitemap.xml",
  };
}
