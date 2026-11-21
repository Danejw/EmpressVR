import { describe, expect, it } from "vitest";
import { slugify, validateBlogInput } from "./validation";

const sample = {
  title: "A blog", slug: "a-blog", excerpt: "Summary",
  body_markdown: "# Hello world", featured_media_id: null,
  author_id: null, status: "draft",
};

describe("blog data validation", () => {
  it("creates clean URL slugs", () => {
    expect(slugify("  Our Immersive Story!  ")).toBe("our-immersive-story");
  });
  it("accepts valid drafts", () => {
    expect(validateBlogInput(sample).data?.slug).toBe("a-blog");
  });
  it("rejects invalid paths and impersonated IDs", () => {
    expect(validateBlogInput({ ...sample, slug: "../admin" }).error).toBeTruthy();
    expect(validateBlogInput({ ...sample, featured_media_id: "x" }).error).toBeTruthy();
  });
  it("requires content before publication", () => {
    expect(validateBlogInput({ ...sample, body_markdown: "", status: "published" }).error).toBeTruthy();
  });
  it("enforces size limits", () => {
    expect(validateBlogInput({ ...sample, title: "x".repeat(161) }).error).toBeTruthy();
  });
});
