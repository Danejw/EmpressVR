import type { NextConfig } from "next";

const isPagesPreview = process.env.GITHUB_PAGES_PREVIEW === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(isPagesPreview
    ? {
        // GitHub Pages publishes this repository under /EmpressVR/.
        // Build a static snapshot only for previews; future Stripe/Calendar
        // handlers will require server-capable production hosting.
        output: "export" as const,
        basePath: "/EmpressVR",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        async redirects() {
          return [{ source: "/home", destination: "/", permanent: true }];
        },
      }),
};

export default nextConfig;
