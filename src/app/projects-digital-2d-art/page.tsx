import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtworkDetail } from "@/components/detail-templates";
import { readLegacyPage } from "@/lib/legacy-pages";

export const metadata: Metadata = { title: "Digital 2D Art" };

export default async function Artwork() {
  const markdown = await readLegacyPage("projects-digital-2d-art");
  if (markdown === null) notFound();
  return <article className="legacy-page"><div className="page-container">
    <ArtworkDetail keyName="projects-digital-2d-art" markdown={markdown}/>
  </div></article>;
}
