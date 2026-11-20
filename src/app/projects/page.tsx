import Link from "next/link";
import { listLegacySlugs, readLegacyPage, sourceImages } from "@/lib/legacy-pages";

const entries = [
  { title: "Exploring the Shadows", subtitle: "The Journey to Trauma Healing", slug: "exploring-the-shadows" },
  { title: "Circus x VR", subtitle: "", slug: "circusxvr" },
  { title: "Robotic Echoes", subtitle: "Technology x Art x Culture", slug: "robotic-echoes" },
  { title: "The Self We Find", subtitle: "Artist: Dominique Vyborna\nCollaborators: Abil Gunawan and Jaye Marigold", slug: "the-self-we-find" },
  { title: "Fireside", subtitle: "By the Eunoia Collab", slug: "fireside" },
  { title: "Sunlink", subtitle: "", slug: "sunlink" },
  { title: "Shadows of Combat", subtitle: "", slug: "shadows-of-combat" }
] as const;

export default async function Projects() {
  const original = await readLegacyPage("projects") || "";
  const images = sourceImages(original);
  const imported = new Set(await listLegacySlugs());
  return <section className="projects-page" aria-label="EmpressVR projects">
    <div className="project-grid">
      {entries.map((entry, index) => {
        const href = imported.has(entry.slug) ? "/" + entry.slug : "https://www.empressvr.com/" + entry.slug;
        return <article className={`project-tile project-tone-${index % 4}`} key={entry.slug}>
          <div className="project-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[index]} alt={entry.title} loading={index < 2 ? "eager" : "lazy"} />
          </div>
          <div className="project-summary">
            <h2>{entry.title}</h2>
            {entry.subtitle ? <p>{entry.subtitle}</p> : null}
            {href.startsWith("/") ? <Link className="outline-button" href={href}>View Project</Link>
              : <a className="outline-button" href={href} rel="noopener noreferrer">View Project</a>}
          </div>
        </article>;
      })}
    </div>
  </section>;
}
