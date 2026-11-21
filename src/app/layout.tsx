import type { Metadata } from "next";
import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import { CartProvider } from "@/components/cart-provider";
import { getStoreCatalog } from "@/features/commerce/store-catalog";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const isPreview = process.env.VERCEL_ENV === "preview" || process.env.GITHUB_PAGES_PREVIEW === "true";
const description = "Amplifying Diverse Voices in Immersive Storytelling.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.empressvr.com"),
  title: { default: "EmpressVR | Immersive Storytelling", template: "%s | EmpressVR" },
  description,
  robots: isPreview ? { index: false, follow: false } : { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "EmpressVR",
    title: "EmpressVR | Immersive Storytelling",
    description,
    url: "/",
  },
  icons: { icon: "https://zxsrixbjsmyzmqywukwa.supabase.co/storage/v1/object/public/site-media/media/7d47d13b010dcf98a25cf2d22b5fe2a41f3ff9cd1a958375ab3b10749e9471c7.webp" }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Render on request so published database edits appear on refresh.
  await connection();
  const catalog = await getStoreCatalog();
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <CartProvider catalog={catalog}>
          <SiteHeader />
          <main id="main-content">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
