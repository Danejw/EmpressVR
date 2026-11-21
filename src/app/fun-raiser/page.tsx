import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageSections } from "@/components/page-sections";
import { cleanLegacyContent, sectionsFromMarkdown } from "@/features/content/page-sections";
import { readLegacyPage, sourcePageUrl } from "@/lib/legacy-pages";

export const metadata: Metadata = { title: "Help Raise the Fun!" };

export default async function Fundraiser() {
  const raw = await readLegacyPage("fun-raiser");
  if (raw === null) notFound();
  return <article className="legacy-page"><div className="page-container">
    <div className="content-cta"><a className="pill-button" href={sourcePageUrl("fun-raiser")}
      rel="noopener noreferrer">Donate on the current EmpressVR site</a></div>
    <PageSections sections={sectionsFromMarkdown(cleanLegacyContent("fun-raiser", raw))}/>
  </div></article>;
}
