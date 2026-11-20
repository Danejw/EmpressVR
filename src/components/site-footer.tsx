import Link from "next/link";

const whiteLogo = "https://images.squarespace-cdn.com/content/v1/6675b24a42baae7c4c24730e/767e5584-1fca-40dd-9178-654b1a689051/EmpressVR_White_Logo.png";

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="page-container footer-inner">
      <div className="footer-identity">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={whiteLogo} alt="EmpressVR" width={224} height={74} className="footer-logo" loading="lazy" />
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
