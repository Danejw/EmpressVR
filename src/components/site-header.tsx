import Link from "next/link";
import { siteSections } from "@/lib/site-sections";
import { MediaImage } from "@/components/media-image";
import { getPublicSiteMediaId } from "@/features/content/supabase-public";
import { CartHeaderLink } from "@/components/cart-header-link";
import { getServerAuth } from "@/lib/auth/server";
import { isStaffRole } from "@/lib/auth/permissions";

const schedule = "/scheduling";

export async function SiteHeader() {
  const auth = await getServerAuth();
  const [logoId, session] = await Promise.all([
    getPublicSiteMediaId("site.logo.dark"),
    auth?.auth.getUser(),
  ]);
  const user = session?.data.user;
  let canAccessStaff = false;
  if (user && auth) {
    const { data: staff } = await auth.from("staff_roles")
      .select("role").eq("user_id", user.id).maybeSingle();
    canAccessStaff = isStaffRole(staff?.role);
  }

  const accountLinks = <>
    {user ? <Link href="/account">Account</Link> : <Link href="/login">Sign in</Link>}
    {canAccessStaff ? <Link href="/staff">Dashboard</Link> : null}
  </>;

  return <header className="site-header">
    <div className="page-container header-inner">
      <Link className="brand-link" href="/" aria-label="EmpressVR home">
        <MediaImage assetId={logoId} alt="EmpressVR" width={210} height={53}
          className="site-brand-logo" loading="eager" />
      </Link>
      <div className="header-actions">
        <Link className="header-cta" href={schedule}>View Classes &amp; Socials</Link>
        <details className="header-menu">
          <summary aria-label="Navigation menu" title="Navigation menu">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </summary>
          <nav aria-label="Primary navigation">
            {siteSections.map(section => <Link key={section.slug} href={"/" + section.slug}>{section.title}</Link>)}
            <Link href="/blog">Blog</Link>
            <CartHeaderLink />
            {accountLinks}
          </nav>
        </details>
      </div>
    </div>
  </header>;
}
