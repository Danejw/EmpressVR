import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { CartProvider } from "@/components/cart-provider";
import { getStoreCatalog } from "@/features/commerce/store-catalog";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const isPagesPreview = process.env.GITHUB_PAGES_PREVIEW === "true";
const description = "Amplifying Diverse Voices in Immersive Storytelling.";

export const metadata: Metadata = {
  metadataBase: new URL(isPagesPreview ? "https://danejw.github.io/EmpressVR" : "https://www.empressvr.com"),
  title: { default: "EmpressVR | Immersive Storytelling", template: "%s | EmpressVR" },
  description,
  robots: isPagesPreview ? { index: false, follow: false } : { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "EmpressVR",
    title: "EmpressVR | Immersive Storytelling",
    description,
    url: "/",
  },
  icons: { icon: "https://images.squarespace-cdn.com/content/v1/6675b24a42baae7c4c24730e/6de4e97a-b4f9-46c1-9acb-aec2f80d99f2/favicon.ico?format=100w" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <CartProvider catalog={getStoreCatalog()}>
          <SiteHeader />
          <main id="main-content">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
