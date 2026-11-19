import Link from "next/link";
import { siteSections } from "@/lib/site-sections";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="page-container header-inner">
        <Link className="wordmark" href="/" aria-label="EmpressVR home">
          <span className="mark" aria-hidden="true">✦</span> EMPRESSVR
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          {siteSections.map((section) => (
            <Link key={section.slug} href={`/${section.slug}`}>{section.title}</Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
