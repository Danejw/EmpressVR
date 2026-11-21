/** Content components consume typed sections; legacy Markdown is only a transitional input. */
export type PageSection =
  | { type: "rich_text"; markdown: string }
  | { type: "gallery"; images: Array<{ sourceUrl?: string; assetId?: string; alt: string }> }
  | { type: "cta"; label: string; href: string };

export function isPageSections(value: unknown): value is PageSection[] {
  if (!Array.isArray(value)) return false;
  return value.every((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const section = item as Record<string, unknown>;
    if (section.type === "rich_text") return typeof section.markdown === "string";
    if (section.type === "cta") return typeof section.label === "string" &&
      typeof section.href === "string" && /^(\/[^/]|https:\/\/|mailto:)/.test(section.href);
    if (section.type === "gallery") return Array.isArray(section.images) &&
      section.images.every((image: unknown) => image && typeof image === "object" &&
        typeof (image as {alt?: unknown}).alt === "string" &&
        (typeof (image as {assetId?: unknown}).assetId === "string" ||
          typeof (image as {sourceUrl?: unknown}).sourceUrl === "string"));
    return false;
  });
}

/** Remove accidental controls and source-scrape artifacts, never invent form actions. */
export function cleanLegacyContent(key: string, markdown: string): string {
  let copy = markdown.replace(/[\u00ad\u200b\u200c\u200d]/g, "");
  if (key === "community" || key === "education") {
    const lines = copy.split("\n");
    const first = lines.find(line => /^# /.test(line));
    copy = lines.filter((line, i) => !(i > 0 && line.startsWith("# ") &&
      first && line.replaceAll("\\*", "*").includes(first.replaceAll("\\*", "*").slice(2).repeat(2)))).join("\n");
  }
  if (key === "community") {
    copy = copy.replace(/^Item 1 of 6\s*$/gm, "");
    copy = copy.replace(/^### Community Listings!$/m, "## Community Listings!");
    copy = copy.replace(/^# Building a Global Community$/m, "## Building a Global Community");
    copy = copy.replace(/^## Empowering Community Ownership$/m, "### Empowering Community Ownership");
    copy = copy.replace(/^## Monthly Pub Socials In Bristol UK!$/m, "### Monthly Pub Socials In Bristol UK!");
  }
  if (key === "education") {
    copy = copy.replace("Schedule Appointment with Empress VR", "[Schedule an appointment](/scheduling)");
    copy = copy.replace(/(## John Howard - Cyrnus)([\s\S]*)$/, (_, title: string, rest: string) =>
      title + rest.replace(/\bExperience:\s*Education:\s*$/, "").trimEnd() + "\n");
  }
  if (key === "about") {
    copy = copy.replace(/\nName\s+First Name\(required\)[\s\S]*?SendSend\s*/, "\n");
  }
  if (key === "fun-raiser") {
    copy = copy.replace(/Choose Which Project to Contribute to:[\s\S]*?(?=We operate as a business)/, "");
    copy = copy.replace(/^\[There's no page for this one yet[^\n]+\n?/gm, "");
  }
  if (key === "techalchemy26") {
    copy = copy.replace(/Click the button below to reserve your spot!/g,
      "Contact the organizers for ticket and availability information.");
    copy = copy.replace(/£5\.00\s+£10\.00\s+£25\.00\s+£50\.00[\s\S]*?DonateDonate/, "");
  }
  if (key === "store__masks") {
    copy = copy.replace(/#### No results found[\s\S]*$/, "");
  }
  if (key === "about") {
    copy = copy.replace("](https://www.empressvr.com/projects-digital-2d-art)", "](/community)");
    copy = copy.replace("](https://www.empressvr.com/projects-metalwork)", "](/education)");
  }
  if (key === "dominique-vyborna") {
    copy = copy.replaceAll("Virtual Reality\\ \\ Projects", "Virtual Reality Projects");
  }
  return copy.trim();
}

/** The source Markdown contains obsolete CDN full-size image links. */
export function withoutLegacyFullsizeLinks(markdown: string): string {
  const offset = markdown.search(/^\[View fullsize!\[/m);
  return (offset >= 0 ? markdown.slice(0, offset) : markdown).trim();
}

/** Extracts media into reusable gallery sections instead of parsing images as text. */
export function sectionsFromMarkdown(markdown: string): PageSection[] {
  const sections: PageSection[] = [];
  let text: string[] = [];
  let images: Array<{sourceUrl: string; alt: string}> = [];
  const flushText = () => {
    if (text.join("\n").trim()) sections.push({ type: "rich_text", markdown: text.join("\n").trim() });
    text = [];
  };
  const flushImages = () => {
    if (images.length) sections.push({ type: "gallery", images });
    images = [];
  };
  for (const line of markdown.split("\n")) {
    const match = line.trim().match(/^!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)$/);
    if (match) {
      flushText();
      const alt = match[1] && !/\.(png|jpe?g|gif|webp|jfif)$/i.test(match[1])
        ? match[1] : "";
      images.push({ sourceUrl: match[2], alt });
    } else {
      if (line.trim()) flushImages();
      text.push(line);
    }
  }
  flushText();
  flushImages();
  return sections;
}
