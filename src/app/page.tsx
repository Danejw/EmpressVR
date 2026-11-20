import { LegacyMarkdown } from "@/components/legacy-markdown";
import { readLegacyPage, sourceImages } from "@/lib/legacy-pages";

function between(text: string, start: string, end?: string): string {
  const from = text.indexOf(start);
  if (from < 0) return "";
  const to = end ? text.indexOf(end, from + start.length) : -1;
  return text.slice(from, to >= 0 ? to : undefined).trim();
}

export default async function Home() {
  const source = (await readLegacyPage("home")) || "";
  const images = sourceImages(source);
  const fundraiser = between(source, "## The November", "# Welcome to the Metaverse");
  const hero = between(source, "# Welcome to the Metaverse", "## TechAlchemy 2026:");
  const techAlchemy = between(source, "## TechAlchemy 2026:", "### Global Community");
  const community = between(source, "### Global Community", "EmpressVR was named after");
  const tarot = between(source, "EmpressVR was named after", "### What does the Empress stand for?");
  const mission = between(source, "### What does the Empress stand for?", "#### Join our mailing list");

  return <>
    <section className="home-fundraiser" aria-label="Current fundraising campaign">
      <div className="page-container feature-layout">
        <div className="feature-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt="EmpressVR Community Growth Flywheel" />
        </div>
        <LegacyMarkdown markdown={fundraiser.replace(/^!\[[^\]]*\]\([^)]*\)\s*/m, "")} className="feature-copy" />
      </div>
    </section>

    <section className="home-hero">
      <div className="hero-layout">
        <div className="hero-message">
          <LegacyMarkdown markdown={hero} />
        </div>
        <div className="hero-art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[1]} alt="Colorful EmpressVR metaverse character" />
        </div>
      </div>
    </section>

    <section className="home-tech">
      <div className="page-container feature-layout">
        <LegacyMarkdown markdown={techAlchemy} className="feature-copy" />
        <div className="feature-image poster-frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[2]} alt="TechAlchemy 2026: A Bristol Immersive Showcase poster" loading="lazy" />
        </div>
      </div>
    </section>

    <section className="home-community">
      <div className="page-container community-layout">
        <LegacyMarkdown markdown={community.replace(/^!\[[^\]]*\]\([^)]*\)\s*/gm, "")} />
        <div className="community-art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[3]} alt="EmpressVR immersive creative community" loading="lazy" />
        </div>
      </div>
    </section>

    <section className="home-tarot">
      <div className="page-container tarot-layout">
        <div className="tarot-art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[4]} alt="The Empress tarot card" loading="lazy" />
        </div>
        <LegacyMarkdown markdown={tarot} />
      </div>
    </section>

    <section className="home-mission">
      <div className="page-container">
        <LegacyMarkdown markdown={mission} />
      </div>
    </section>
  </>;
}
