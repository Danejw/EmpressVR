import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageSections } from "@/components/page-sections";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { getPublishedProjects, getPublishedPages, getPublicTeamMembers, getPublicMediaAsset, getPublicPageGallery, fetchPublishedPageSections, publicReadConfig } from "@/features/content/supabase-public";
import { mediaSource } from "@/features/content/media-url";
import { cleanLegacyContent, sectionsFromMarkdown, withoutLegacyFullsizeLinks } from "@/features/content/page-sections";
import { readLegacyPage, sourcePageUrl } from "@/lib/legacy-pages";

type Props = { params: Promise<{ slug: string[] }> };
const corePages = new Set(["home", "projects", "who-we-are", "store"]);

export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const key = slug.join("__");
  const markdown = await readLegacyPage(key);
  const title = markdown?.match(/^#{1,3} (.+)$/m)?.[1]?.replaceAll("*", "") ||
    slug.at(-1)?.replaceAll("-", " ") || "EmpressVR";
  return {
    title, alternates: { canonical: "/" + slug.join("/") },
    ...(key === "blog" || key === "coming-soon" ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Compatibility route for legacy paths; core pages have dedicated Next.js routes. */
export default async function ContentRoute({ params }: Props) {
  const { slug } = await params;
  const key = slug.join("__");
  const original = await readLegacyPage(key);
  if (original === null || corePages.has(key)) notFound();
  const markdown = cleanLegacyContent(key, original);
  const [projects, members] = await Promise.all([getPublishedProjects(), getPublicTeamMembers()]);
  const project = projects.find(item => item.slug === key);
  const member = members.find(item => item.slug === key);
  const name = project?.title ?? member?.name;
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const copy = name ? markdown.replace(new RegExp("^#{1,3}\\s+" + escape(name) + "\\s*$", "im"), "").trim() : markdown;

  const membershipFormHeading = key === "join-the-coop" ? "# Applications Are Open!" :
    key === "join-the-coop-na" ? "# Applications Are Currently Closed" : null;
  const membershipStart = membershipFormHeading ? copy.indexOf(membershipFormHeading) :
    key === "join-the-community" ? copy.indexOf("\nName\n") : -1;
  const archivedCopy = membershipStart >= 0 ? copy.slice(0, membershipStart) : copy;
  const sections = !name && membershipStart < 0
    ? await fetchPublishedPageSections(key) : null;
  // The imported full-size links still point to Squarespace. Use the live
  // database gallery and its public Storage objects instead.
  const galleryImages = key === "the-self-we-find" ? await (async () => {
    const record = (await getPublishedPages()).find(page => page.source_key === key);
    if (!record) return [];
    const imageIds = await getPublicPageGallery(record.id);
    const config = publicReadConfig();
    const resolved = await Promise.all(imageIds.map(async (id, index) => {
      const asset = await getPublicMediaAsset(id);
      const src = mediaSource(asset, { supabaseUrl: config.url, localBasePath: "" });
      if (!src) return null;
      const storedAlt = asset?.alt_text?.trim() || "";
      const alt = !storedAlt || /\.(png|jpe?g|gif|webp|jfif)$/i.test(storedAlt)
        ? `The Self We Find scene ${index + 1}` : storedAlt;
      return { src, alt };
    }));
    return resolved.filter((image): image is { src: string; alt: string } => image !== null);
  })() : [];
  const pageCopy = key === "the-self-we-find"
    ? withoutLegacyFullsizeLinks(archivedCopy) : archivedCopy;

  return <article className="legacy-page"><div className="page-container">
    {name ? <header className="detail-heading">
      <Link className="detail-back" href={project ? "/projects" : "/who-we-are"}>
        ← Back to {project ? "Projects" : "Who We Are"}
      </Link>
      <h1>{name}</h1>
      {project?.subtitle ? <p>{project.subtitle}</p> : null}
    </header> : null}
    {key === "scheduling" ? <div className="booking-preview-link">
      <Link className="pill-button" href="/book">Explore the new booking calendar</Link>
      <a href={sourcePageUrl(key)} rel="noopener noreferrer">Book on the current EmpressVR website</a>
    </div> : null}
    <PageSections sections={sections ?? sectionsFromMarkdown(pageCopy)}/>
    {galleryImages.length ? <GalleryLightbox images={galleryImages}/> : null}
    {membershipStart >= 0 ? <section className="membership-legacy-handoff">
      <h2>{key === "join-the-coop-na" ? "Applications are currently closed" : "Explore membership applications"}</h2>
      <p>The new membership form is a preview and does not submit an application.</p>
      <Link className="pill-button" href="/membership">Explore the new membership form</Link>
      <p><a href={sourcePageUrl(key)} rel="noopener noreferrer">Apply on the current EmpressVR site</a></p>
    </section> : null}
    {key === "scheduling" ? <p className="legacy-checkout-note">
      Bookings and payments are still handled on the current website.{" "}
      <a href={sourcePageUrl(key)} rel="noopener noreferrer">Continue on the current EmpressVR site</a>
    </p> : null}
  </div></article>;
}
