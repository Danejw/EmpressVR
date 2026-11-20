import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "EmpressVR | Immersive Storytelling", template: "%s | EmpressVR" },
  description: "Amplifying Diverse Voices in Immersive Storytelling.",
  icons: { icon: "https://images.squarespace-cdn.com/content/v1/6675b24a42baae7c4c24730e/6de4e97a-b4f9-46c1-9acb-aec2f80d99f2/favicon.ico?format=100w" }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
