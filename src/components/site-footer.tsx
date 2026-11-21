import Link from "next/link";
import {MediaImage} from "@/components/media-image";
import {getPublicSiteMediaId} from "@/features/content/supabase-public";

export async function SiteFooter() {
  const logoId = await getPublicSiteMediaId("site.logo.light");
  return <footer className="site-footer">
    <div className="page-container footer-inner">
      <div className="footer-identity">
        <MediaImage assetId={logoId} alt="EmpressVR" width={224} height={74}
          className="footer-logo" />
        <p>Empress Immersive LTD<br />Registered in England<br />Company Number 16325264</p>
      </div>
      <div className="footer-links">
        <Link href="/scheduling">Book a Social VR Class</Link>
        <Link href="/about">More About EmpressVR</Link>
        <Link href="/membership">Memberships</Link>
        <Link href="/login">Member &amp; Staff Login</Link>
        <a href="mailto:info@empressvr.com">info@empressvr.com</a>
        <a href="tel:+447340037783">+44 (0) 7340037783</a>
      </div>
      <address>Flat G 19 Mina Rd<br />Bristol, BS2 9TA<br />United Kingdom</address>
    </div>
  </footer>;
}
