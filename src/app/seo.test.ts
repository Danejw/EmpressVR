import { afterEach, describe, expect, it } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";
import { getPages } from "@/features/content/repository";

const previousPreview = process.env.GITHUB_PAGES_PREVIEW;

afterEach(() => {
  if (previousPreview === undefined) delete process.env.GITHUB_PAGES_PREVIEW;
  else process.env.GITHUB_PAGES_PREVIEW = previousPreview;
});

describe("search engine metadata", () => {
  it("lists published, substantive pages without duplicating /home", () => {
    delete process.env.GITHUB_PAGES_PREVIEW;
    const urls = sitemap().map((item) => item.url);
    const expected = getPages()
      .filter((page) => page.published && !["/blog", "/coming-soon"].includes(page.path))
      .map((page) => "https://www.empressvr.com" + page.path);
    expect(urls).toEqual(expected);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain("https://www.empressvr.com/");
    expect(urls).not.toContain("https://www.empressvr.com/home");
  });

  it("keeps the public feature-branch preview out of search engines", () => {
    process.env.GITHUB_PAGES_PREVIEW = "true";
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(robots().sitemap).toBeUndefined();
    expect(sitemap().every((item) => item.url.startsWith("https://danejw.github.io/EmpressVR/"))).toBe(true);
  });

  it("exposes a production sitemap after approved cutover", () => {
    delete process.env.GITHUB_PAGES_PREVIEW;
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://www.empressvr.com/sitemap.xml",
    });
  });
});
