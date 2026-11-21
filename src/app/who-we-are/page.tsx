import type { Metadata } from "next";
import Link from "next/link";
import { LegacyMarkdown } from "@/components/legacy-markdown";
import { MediaImage } from "@/components/media-image";
import { getPublicSiteMediaId } from "@/features/content/supabase-public";
import { getPublicTeamMembers } from "@/features/content/supabase-public";
import { listLegacySlugs,readLegacyPage } from "@/lib/legacy-pages";

export const metadata: Metadata = {
  title: "Who We Are",
  description: "Meet the people and co-operative members of EmpressVR.",
  alternates: { canonical: "/who-we-are" },
};

export default async function WhoWeAre() {
  const original = await readLegacyPage("who-we-are") || "";
  const intro = original.slice(0, original.indexOf("- ![](")).trim();
  const imported = new Set(await listLegacySlugs());
  const members = await getPublicTeamMembers();
  const joinImage = await getPublicSiteMediaId("team.join");
  return <article className="people-page">
    <div className="intro-band">
      <div className="page-container"><LegacyMarkdown markdown={intro} /></div>
    </div>
    <section className="page-container people-section">
      <div className="people-grid">
        {members.filter(m=>m.group==="current").map(member => {
          const href = member.slug
            ? imported.has(member.slug) ? "/" + member.slug : "https://www.empressvr.com/" + member.slug
            : member.external_url;
          return <article className="member-card" key={member.id}>
            <MediaImage assetId={member.headshot_media_id} alt={member.name} />
            <div className="member-copy">
              <h2>{member.name}</h2>
              {member.roles.map(role=><p key={role}>{role}</p>)}
              {href ? href.startsWith("/") ? <Link className="pill-button" href={href}>Learn More</Link>
                : <a className="pill-button" href={href} rel="noopener noreferrer">Learn More</a> : null}
            </div>
          </article>;
        })}
        <article className="member-card member-invite">
          <MediaImage assetId={joinImage} alt="Co-operative membership" />
          <div className="member-copy">
            <h2>Join the Co-op!</h2>
            <p>Membership Applications are Always Open!</p>
            <p>Click the link below!</p>
            <Link className="pill-button" href="/join-the-coop">Learn More</Link>
          </div>
        </article>
      </div>
      <div className="other-members">
        <h2>Our Members</h2>
        {members.filter(m=>m.group==="other").map(m=><p key={m.id}>{m.name} · {m.roles.join(" · ")}</p>)}
        <h2>Past Members</h2>
        <div className="past-members">
          {members.filter(m=>m.group==="past").map(m=><div key={m.id} className="member-card">
            <MediaImage assetId={m.headshot_media_id} alt={m.name} />
            <div className="member-copy"><h3>{m.name}</h3>{m.roles.map(role=><p key={role}>{role}</p>)}</div>
          </div>)}
        </div>
      </div>
    </section>
  </article>;
}
