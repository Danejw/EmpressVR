import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageSections } from "@/components/page-sections";
import { cleanLegacyContent, sectionsFromMarkdown } from "@/features/content/page-sections";
import { readLegacyPage } from "@/lib/legacy-pages";

export const metadata: Metadata = { title: "Education" };

export default async function Education() {
  const raw = await readLegacyPage("education");
  if (raw === null) notFound();
  return <article className="legacy-page"><div className="page-container">
    <PageSections sections={sectionsFromMarkdown(cleanLegacyContent("education", raw))}/>
  </div></article>;
}
