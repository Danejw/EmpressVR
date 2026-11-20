import Link from "next/link";
import {MediaImage} from "@/components/media-image";
import {getSiteMediaId} from "@/features/content/repository";

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="page-container footer-inner">
      <div className="footer-identity">
        <MediaImage assetId={getSiteMediaId("site.logo.light")} alt="EmpressVR" width={224} height={74}
          className="footer-logo" />
        <p>Empress Immersive LTD<br />Registered in England<br />Company Number 16325264</p>
      </div>
      <div className="footer-links">
        <Link href="/scheduling">Book a Social VR Class</Link>
        <Link href="/about">More About EmpressVR</Link>
        <a href="mailto:info@empressvr.com">info@empressvr.com</a>
        <a href="tel:+447340037783">+44 (0) 7340037783</a>
      </div>
      <address>Flat G 19 Mina Rd<br />Bristol, BS2 9TA<br />United Kingdom</address>
    </div>
  </footer>;
}
