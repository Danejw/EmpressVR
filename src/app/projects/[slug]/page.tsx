import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  getPublishedProjects, getPublishedPages, getPublicMediaAsset, getPublicProjectGallery,
  fetchPublishedPageMarkdown, publicReadConfig,
} from "@/features/content/supabase-public";
import { mediaSource } from "@/features/content/media-url";
import { MediaImage } from "@/components/media-image";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = (await getPublishedProjects()).find(item => item.slug === slug);
  return { title: project?.title ?? "Project", alternates: { canonical: "/projects/" + slug } };
}
export default async function ProjectDetail({ params }: Props) {
  const { slug } = await params;
  const project = (await getPublishedProjects()).find(item => item.slug === slug);
  if (!project) notFound();
  const [pages, ids] = await Promise.all([getPublishedPages(), getPublicProjectGallery(project.id)]);
  const linked = pages.find(page => page.id === project.page_id);
  const content = linked ? await fetchPublishedPageMarkdown(linked.source_key) : null;
  const { url } = publicReadConfig();
  const gallery = await Promise.all(ids.map(async id => {
    const asset = await getPublicMediaAsset(id);
    const src = mediaSource(asset, { supabaseUrl: url, localBasePath: "" });
    return src ? { src, alt: asset?.alt_text || project.title } : null;
  }));
  return <article className="page-container cms-content-detail">
    <Link className="detail-back" href="/projects">← Projects</Link>
    <h1>{project.title}</h1>
    {project.subtitle ? <p className="auth-lead">{project.subtitle}</p> : null}
    {project.featured_media_id ? <MediaImage className="cms-content-hero" assetId={project.featured_media_id} alt={project.title}/> : null}
    {content?.body ? <div className="cms-content-markdown"><ReactMarkdown>{content.body}</ReactMarkdown></div> : null}
    {gallery.some(Boolean) ? <div className="cms-content-gallery">
      {gallery.map((image, index) => image ? <img key={index} src={image.src} alt={image.alt} loading="lazy"/> : null)}
    </div> : null}
  </article>;
}
