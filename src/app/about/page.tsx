import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
import { PageSections } from "@/components/page-sections";
import { cleanLegacyContent, sectionsFromMarkdown } from "@/features/content/page-sections";
import { readLegacyPage } from "@/lib/legacy-pages";

export const metadata: Metadata = { title: "About EmpressVR" };

export default async function About() {
  const raw = await readLegacyPage("about");
  if (raw === null) notFound();
  const markdown = cleanLegacyContent("about", raw);
  const at = markdown.indexOf("Gratitude for Our Early Supporters");
  return <article className="legacy-page"><div className="page-container">
    <PageSections sections={sectionsFromMarkdown(markdown.slice(0, at >= 0 ? at : undefined))}/>
    <ContactForm/>
    {at >= 0 ? <PageSections sections={sectionsFromMarkdown(markdown.slice(at))}/> : null}
  </div></article>;
}
