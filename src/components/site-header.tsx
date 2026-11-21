import Link from "next/link";
import {siteSections} from "@/lib/site-sections";
import {MediaImage} from "@/components/media-image";
import {getPublicSiteMediaId} from "@/features/content/supabase-public";
import {CartHeaderLink} from "@/components/cart-header-link";

const schedule = "/scheduling";
export async function SiteHeader() {
  const logoId = await getPublicSiteMediaId("site.logo.dark");
  return <header className="site-header">
    <div className="page-container header-inner">
      <Link className="brand-link" href="/" aria-label="EmpressVR home">
        <MediaImage assetId={logoId} alt="EmpressVR" width={210} height={53}
          className="site-brand-logo" loading="eager" />
      </Link>
      <nav className="site-nav" aria-label="Primary navigation">
        {siteSections.map(section=><Link key={section.slug} href={"/"+section.slug}>{section.title}</Link>)}
        <CartHeaderLink />
      </nav>
      <Link className="header-cta" href={schedule}>View Classes &amp; Socials</Link>
      <details className="mobile-menu">
        <summary aria-label="Open navigation">Menu <span aria-hidden="true">☰</span></summary>
        <nav aria-label="Mobile navigation">
          {siteSections.map(section=><Link key={section.slug} href={"/"+section.slug}>{section.title}</Link>)}
          <CartHeaderLink />
          <Link href={schedule}>View Classes &amp; Socials</Link>
        </nav>
      </details>
    </div>
  </header>;
}
