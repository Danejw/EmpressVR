import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtworkDetail } from "@/components/detail-templates";
import { readLegacyPage } from "@/lib/legacy-pages";

export const metadata: Metadata = { title: "Metalwork" };

export default async function Artwork() {
  const markdown = await readLegacyPage("projects-metalwork");
  if (markdown === null) notFound();
  return <article className="legacy-page"><div className="page-container">
    <ArtworkDetail keyName="projects-metalwork" markdown={markdown}/>
  </div></article>;
}
