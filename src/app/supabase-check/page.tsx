import type { Metadata } from "next";
import Link from "next/link";
import { SupabaseLiveCheck } from "@/components/supabase-live-check";

export const metadata: Metadata = {
  title: "Supabase integration preview",
  description: "Read-only preview of the EmpressVR Supabase integration.",
  robots: { index: false, follow: false },
};

export default function SupabaseCheckPage() {
  return <section className="supabase-preview-page">
    <div className="page-container">
      <p className="commerce-eyebrow">Integration branch preview</p>
      <h1>Supabase integration</h1>
      <p className="supabase-preview-lead">This is the <code>supabase-integration</code> version of EmpressVR.
        Explore the site and check the live database connection below. No bookings, payments,
        or membership applications are processed here.</p>
      <div className="supabase-preview-links">
        <Link className="pill-button" href="/">Homepage</Link>
        <Link className="outline-button" href="/projects">Projects</Link>
        <Link className="outline-button" href="/who-we-are">Team</Link>
        <Link className="outline-button" href="/store">Store</Link>
        <Link className="outline-button" href="/membership">Memberships</Link>
      </div>
      <SupabaseLiveCheck />
      <p className="supabase-preview-caveat">On server-capable hosting, published pages, projects, team members, products,
        events and images are read from Supabase on each refresh. This page tests direct public database access.</p>
    </div>
  </section>;
}
