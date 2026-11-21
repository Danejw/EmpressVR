import Link from "next/link";
import { MediaImage } from "@/components/media-image";
import { LegacyMarkdown } from "@/components/legacy-markdown";
import { type PageSection } from "@/features/content/page-sections";

/** Render verified, reusable page blocks; never interpret captured form labels as controls. */
export function PageSections({ sections }: { sections: PageSection[] }) {
  return <div className="page-sections">
    {sections.map((section, index) => {
      if (section.type === "rich_text") return (
        <LegacyMarkdown key={index} markdown={section.markdown} />
      );
      if (section.type === "gallery") return <div className="content-gallery" key={index}>
        {section.images.map((image, i) => <MediaImage
          key={image.assetId ?? image.sourceUrl ?? i}
          assetId={image.assetId} sourceUrl={image.sourceUrl}
          className="gallery-image" alt={image.alt} loading="lazy" />)}
      </div>;
      const href = section.href;
      const cls = "pill-button";
      return <div className="content-cta" key={index}>{
        href.startsWith("/") ? <Link className={cls} href={href}>{section.label}</Link> :
          <a className={cls} href={href} rel="noopener noreferrer">{section.label}</a>
      }</div>;
    })}
  </div>;
}
