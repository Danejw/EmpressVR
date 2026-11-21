import { describe, expect, it } from "vitest";
import { cleanLegacyContent, isPageSections, sectionsFromMarkdown, withoutLegacyFullsizeLinks } from "./page-sections";

describe("typed content migration", () => {
  it("does not turn arbitrary JSON into UI", () => {
    expect(isPageSections([{ type: "cta", label: "Bad", href: "javascript:alert(1)" }])).toBe(false);
    expect(isPageSections([{ type: "rich_text", markdown: "Hello" }])).toBe(true);
  });
  it("turns consecutive verified image references into one gallery", () => {
    const parts = sectionsFromMarkdown("# Art\n\n![](https://images.example/a.png)\n\n![](https://images.example/b.png)");
    expect(parts.map(item => item.type)).toEqual(["rich_text", "gallery"]);
    expect(parts[1]).toMatchObject({ images: [{ sourceUrl: "https://images.example/a.png" }, { sourceUrl: "https://images.example/b.png" }] });
  });
  it("normalizes Community heading semantics without losing calendar markers", () => {
    const source = "# Amplifying Diverse Voices\n### Community Listings!\n### Community Calendar!\n# Building a Global Community\n## Empowering Community Ownership";
    const normalized = cleanLegacyContent("community", source);
    expect(normalized).toContain("## Community Listings!");
    expect(normalized).toContain("### Community Calendar!");
    expect(normalized).toContain("## Building a Global Community");
    expect(normalized).toContain("### Empowering Community Ownership");
  });
  it("cleans About links and Dominique's imported heading artifact", () => {
    expect(cleanLegacyContent("about", "](https://www.empressvr.com/projects-digital-2d-art) ](https://www.empressvr.com/projects-metalwork)"))
      .toBe("](/community) ](/education)");
    expect(cleanLegacyContent("dominique-vyborna", "Virtual Reality\\ \\ Projects"))
      .toBe("Virtual Reality Projects");
  });
  it("cuts obsolete full-size CDN links while retaining the introduction", () => {
    expect(withoutLegacyFullsizeLinks("Intro\n[View fullsize![Photo.jpg](https://old.example/x)](https://old.example/x)")).toBe("Intro");
  });
  it("strips dead imported contact and donation controls", () => {
    const about = cleanLegacyContent("about", "Contact us\n\nName\n\nFirst Name(required)\n\nLast Name(required)\n\nEmail(required)\n\nWhat can we help you with today?(required)\n\nSendSend\n\nSupporters");
    expect(about).not.toContain("SendSend");
    const money = cleanLegacyContent("fun-raiser", "Choose Which Project to Contribute to:\n\n£5.00\n\nDonateDonate\n\nWe operate as a business");
    expect(money).not.toContain("DonateDonate");
  });
});
