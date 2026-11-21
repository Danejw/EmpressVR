import type { Metadata } from "next";
import { LegacyMarkdown } from "@/components/legacy-markdown";
import { MediaImage } from "@/components/media-image";
import { readLegacyPage } from "@/lib/legacy-pages";
import { getPublicSiteMediaId } from "@/features/content/supabase-public";

export const metadata: Metadata = { alternates: { canonical: "/" } };

function withoutMedia(markdown: string): string {
  return markdown.split("\n").filter((line) => !line.trimStart().startsWith("![](")).join("\n").trim();
}

function between(text: string, start: string, end?: string): string {
  const from = text.indexOf(start);
  if (from < 0) return "";
  const to = end ? text.indexOf(end, from + start.length) : -1;
  return text.slice(from, to >= 0 ? to : undefined).trim();
}

export default async function Home() {
  const source = (await readLegacyPage("home")) || "";
  const media = await Promise.all(["home.fundraiser","home.hero","home.techalchemy","home.community","home.tarot"].map(getPublicSiteMediaId));
  const fundraiser = between(source, "## The November", "# Welcome to the Metaverse");
  const hero = between(source, "# Welcome to the Metaverse", "## TechAlchemy 2026:")
    .replace(/^# Welcome to the Metaverse/m, "## Welcome to the Metaverse");
  const techAlchemy = between(source, "## TechAlchemy 2026:", "### Global Community");
  const community = between(source, "### Global Community", "EmpressVR was named after");
  const tarot = between(source, "EmpressVR was named after", "### What does the Empress stand for?");
  const mission = between(source, "### What does the Empress stand for?", "#### Join our mailing list");

  return <>
    <h1 className="visually-hidden">EmpressVR: Welcome to the Metaverse</h1>
    <section className="home-fundraiser" aria-label="Current fundraising campaign">
      <div className="page-container feature-layout">
        <div className="feature-image">
          <MediaImage assetId={media[0]} alt="EmpressVR Community Growth Flywheel" loading="eager" />
        </div>
        <LegacyMarkdown markdown={withoutMedia(fundraiser)} className="feature-copy" />
      </div>
    </section>

    <section className="home-hero">
      <div className="hero-layout">
        <div className="hero-message"><LegacyMarkdown markdown={withoutMedia(hero)} /></div>
        <div className="hero-art">
          <MediaImage assetId={media[1]} alt="Colorful EmpressVR metaverse character" loading="eager" />
        </div>
      </div>
    </section>

    <section className="home-tech">
      <div className="page-container feature-layout">
        <LegacyMarkdown markdown={withoutMedia(techAlchemy)} className="feature-copy" />
        <div className="feature-image poster-frame">
          <MediaImage assetId={media[2]} alt="TechAlchemy 2026: A Bristol Immersive Showcase poster" />
        </div>
      </div>
    </section>

    <section className="home-community">
      <div className="page-container community-layout">
        <LegacyMarkdown markdown={withoutMedia(community)} />
        <div className="community-art">
          <MediaImage assetId={media[3]} alt="EmpressVR immersive creative community" />
        </div>
      </div>
    </section>

    <section className="home-tarot">
      <div className="page-container tarot-layout">
        <div className="tarot-art">
          <MediaImage assetId={media[4]} alt="The Empress tarot card" />
        </div>
        <LegacyMarkdown markdown={tarot} />
      </div>
    </section>

    <section className="home-mission">
      <div className="page-container"><LegacyMarkdown markdown={mission} /></div>
    </section>
  </>;
}
