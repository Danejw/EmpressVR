import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageSections } from "@/components/page-sections";
import { cleanLegacyContent, sectionsFromMarkdown } from "@/features/content/page-sections";
import { readLegacyPage } from "@/lib/legacy-pages";

export const metadata: Metadata = { title: "TechAlchemy 2026" };
export default async function TechAlchemy() {
  const raw = await readLegacyPage("techalchemy26");
  if (raw === null) notFound();
  const markdown = cleanLegacyContent("techalchemy26", raw);
  const map = markdown.indexOf("### Exhibition Map");
  const intro = map < 0 ? markdown : markdown.slice(0, map);
  const detail = map < 0 ? "" : markdown.slice(map);
  return <article className="legacy-page"><div className="page-container">
    <PageSections sections={sectionsFromMarkdown(intro)}/>
    <div className="content-cta"><a className="pill-button" href="mailto:info@empressvr.com?subject=TechAlchemy%202026%20tickets">
      Ask about TechAlchemy tickets</a></div>
    <PageSections sections={sectionsFromMarkdown(detail)}/>
    <div className="content-cta"><Link className="pill-button" href="/fun-raiser">Support EmpressVR</Link></div>
  </div></article>;
}
