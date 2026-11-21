import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageSections } from "@/components/page-sections";
import { cleanLegacyContent, sectionsFromMarkdown } from "@/features/content/page-sections";
import { educationWithJohnBiography } from "@/features/content/instructor-biography";
import { readLegacyPage } from "@/lib/legacy-pages";

export const metadata: Metadata = { title: "Education" };

export default async function Education() {
  const [raw, johnProfile] = await Promise.all([
    readLegacyPage("education"),
    readLegacyPage("john-howard"),
  ]);
  if (raw === null) notFound();

  const markdown = educationWithJohnBiography(
    cleanLegacyContent("education", raw),
    johnProfile,
  );
  return <article className="legacy-page"><div className="page-container">
    <PageSections sections={sectionsFromMarkdown(markdown)}/>
  </div></article>;
}
