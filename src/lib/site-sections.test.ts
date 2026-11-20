import { describe, expect, it } from "vitest";
import { siteSections } from "./site-sections";

describe("original Squarespace navigation", () => {
  it("uses unique page slugs", () => {
    const slugs = siteSections.map(({ slug }) => slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual(["who-we-are", "projects", "community", "education", "store"]);
  });
});
