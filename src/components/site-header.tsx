import Link from "next/link";
import { siteSections } from "@/lib/site-sections";

const blackLogo = "https://images.squarespace-cdn.com/content/v1/6675b24a42baae7c4c24730e/4ee11cd7-a0a1-4bf6-96a3-57f4e9090142/EmpressVR_Black_Logo.png?format=1500w";
const schedule = "/scheduling";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="page-container header-inner">
        <Link className="brand-link" href="/" aria-label="EmpressVR home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={blackLogo} alt="EmpressVR" width={210} height={53} className="site-brand-logo" />
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          {siteSections.map((section) => <Link key={section.slug} href={`/${section.slug}`}>{section.title}</Link>)}
          <a href="https://www.empressvr.com/cart" rel="noopener noreferrer">Cart</a>
        </nav>
        <Link className="header-cta" href={schedule}>View Classes &amp; Socials</Link>
        <details className="mobile-menu">
          <summary aria-label="Open navigation">Menu <span aria-hidden="true">☰</span></summary>
          <nav aria-label="Mobile navigation">
            {siteSections.map((section) => <Link key={section.slug} href={`/${section.slug}`}>{section.title}</Link>)}
            <a href="https://www.empressvr.com/cart" rel="noopener noreferrer">Cart</a>
            <Link href={schedule}>View Classes &amp; Socials</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
