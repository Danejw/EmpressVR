import Link from "next/link";
import { LegacyMarkdown } from "@/components/legacy-markdown";
import { listLegacySlugs, readLegacyPage, sourceImages } from "@/lib/legacy-pages";

const team = [
  { name: "Dominique Vyborna", roles: ["FOUNDER & CEO", "BOARD TREASURER - 2026", "FOUNDING BOARD SECRETARY - 2025"], slug: "dominique-vyborna" },
  { name: "Eirini Lampiri", roles: ["BOARD MEMBER AT-LARGE - 2026", "FOUNDING BOARD CHAIR - 2025", "USER MEMBER"], href: "https://eirinilampiri.wixsite.com/portfolio" },
  { name: "Dane Willacker", roles: ["BOARD MEMBER AT-LARGE - 2026", "FOUNDING BOARD MEMBER AT-LARGE - 2025", "SUPPORTER MEMBER"], slug: "dane-willacker" },
  { name: "John Howard", roles: ["BOARD SECRETARY - 2026", "FOUNDING BOARD MEMBER AT-LARGE - 2025", "SUPPORTER MEMBER"], slug: "john-howard" },
  { name: "Eirian Soar", roles: ["BOARD MEMBER - 2026", "SOCIALS TEAM LEAD - 2026", "SUPPORTER MEMBER"] }
] as const;

export default async function WhoWeAre() {
  const original = await readLegacyPage("who-we-are") || "";
  const images = sourceImages(original);
  const intro = original.slice(0, original.indexOf("- ![](")).trim();
  const imported = new Set(await listLegacySlugs());
  return <article className="people-page">
    <div className="intro-band">
      <div className="page-container"><LegacyMarkdown markdown={intro} /></div>
    </div>
    <section className="page-container people-section">
      <div className="people-grid">
        {team.map((member, index) => {
          const href = "slug" in member ? imported.has(member.slug) ? "/" + member.slug : "https://www.empressvr.com/" + member.slug : "href" in member ? member.href : undefined;
          return <article className="member-card" key={member.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[index]} alt={member.name} loading="lazy" />
            <div className="member-copy">
              <h2>{member.name}</h2>
              {member.roles.map((role) => <p key={role}>{role}</p>)}
              {href ? href.startsWith("/") ? <Link className="pill-button" href={href}>Learn More</Link> : <a className="pill-button" href={href} rel="noopener noreferrer">Learn More</a> : null}
            </div>
          </article>;
        })}
        <article className="member-card member-invite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[5]} alt="Co-operative membership" loading="lazy" />
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
        <p>Darko Masnec · USER MEMBER</p>
        <p>Andrew Dennis · USER MEMBER</p>
        <h2>Past Members</h2>
        <div className="past-members">
          {[
            { name: "Harrison Willmott", role: "FOUNDING BOARD MEMBER", image: images[6] },
            { name: "Adam Tuffey", role: "FOUNDING MEMBER", image: images[7] }
          ].map((member) => <div key={member.name} className="member-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={member.image} alt={member.name} loading="lazy" />
            <div className="member-copy"><h3>{member.name}</h3><p>{member.role}</p></div>
          </div>)}
        </div>
      </div>
    </section>
  </article>;
}
