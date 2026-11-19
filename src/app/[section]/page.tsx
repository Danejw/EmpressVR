import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteSections } from "@/lib/site-sections";

export function generateStaticParams() {
  return siteSections.map(({ slug }) => ({ section: slug }));
}

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  const current = siteSections.find((candidate) => candidate.slug === section);
  return { title: current?.title ?? "Page" };
}

export default async function SectionPage({ params }: Props) {
  const { section } = await params;
  const current = siteSections.find((candidate) => candidate.slug === section);
  if (!current) notFound();

  return (
    <section className="page-container section-landing">
      <span className="section-kicker">EMPRESSVR / {current.slug.toUpperCase()}</span>
      <h1>{current.title}</h1>
      <p className="section-description">{current.description}</p>
      <p className="under-construction">This section is a foundation for the content migration. Its existing Squarespace content has not been imported yet.</p>
      <Link className="text-link" href="/">Back to home ↗</Link>
    </section>
  );
}
