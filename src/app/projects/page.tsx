import type { Metadata } from "next";
import Link from "next/link";
import { MediaImage } from "@/components/media-image";
import { getPublishedProjects, getPublishedPages } from "@/features/content/supabase-public";

export const metadata: Metadata = {
  title: "Projects",
  description: "Explore EmpressVR immersive projects and collaborations.",
  alternates: { canonical: "/projects" },
};

export default async function Projects() {
  const [projects, pages] = await Promise.all([getPublishedProjects(), getPublishedPages()]);
  const localPaths = new Set(pages.map(page => page.path));
  return <section className="projects-page" aria-label="EmpressVR projects">
    <div className="project-grid">
      {projects.map((project,index) => {
        const href = localPaths.has("/" + project.slug) ? "/" + project.slug : "/projects/" + project.slug;
        return <article className={"project-tile project-tone-" + (index % 4)} key={project.id}>
          <div className="project-image">
            <MediaImage assetId={project.featured_media_id} alt={project.title} loading={index < 2 ? "eager" : "lazy"} />
          </div>
          <div className="project-summary">
            <h2>{project.title}</h2>
            {project.subtitle ? <p>{project.subtitle}</p> : null}
            {href.startsWith("/") ? <Link className="outline-button" href={href}>View Project</Link>
              : <a className="outline-button" href={href} rel="noopener noreferrer">View Project</a>}
          </div>
        </article>;
      })}
    </div>
  </section>;
}
