import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { MediaImage } from "@/components/media-image";
import { getPublicTeamMembers, getPublishedPages, fetchPublishedPageMarkdown } from "@/features/content/supabase-public";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const person = (await getPublicTeamMembers()).find(item => item.slug === slug);
  return { title: person?.name ?? "Team", alternates: { canonical: "/team/" + slug } };
}
export default async function TeamDetail({ params }: Props) {
  const { slug } = await params;
  const person = (await getPublicTeamMembers()).find(item => item.slug === slug);
  if (!person) notFound();
  const linked = (await getPublishedPages()).find(page => page.id === person.page_id);
  const content = linked ? await fetchPublishedPageMarkdown(linked.source_key) : null;
  const link = person.external_url?.startsWith("https://") ? person.external_url : null;
  return <article className="page-container cms-content-detail">
    <Link className="detail-back" href="/who-we-are">← Who We Are</Link>
    <h1>{person.name}</h1>
    {person.headshot_media_id ? <MediaImage assetId={person.headshot_media_id} className="cms-content-hero" alt={person.name}/> : null}
    {person.roles.map(role => <p key={role}>{role}</p>)}
    {content?.body ? <div className="cms-content-markdown"><ReactMarkdown>{content.body}</ReactMarkdown></div> : null}
    {link ? <p><a href={link} rel="noopener noreferrer" target="_blank">Visit profile</a></p> : null}
  </article>;
}
