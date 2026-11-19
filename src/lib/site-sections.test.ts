import { describe, expect, it } from "vitest";
import { siteSections } from "./site-sections";

describe("site sections", () => {
  it("uses distinct route names", () => {
    const slugs = siteSections.map((section) => section.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain("events");
    expect(slugs).toContain("store");
  });
});
