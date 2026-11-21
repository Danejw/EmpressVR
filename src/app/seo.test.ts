import { afterEach, describe, expect, it } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";
import { getPages } from "../features/content/repository";

const oldVercelEnv = process.env.VERCEL_ENV;
const oldSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
afterEach(() => {
  if (oldVercelEnv === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = oldVercelEnv;
  if (oldSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = oldSiteUrl;
});

describe("search engine metadata", () => {
  it("lists published pages without duplicating /home", async () => {
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const urls = (await sitemap()).map((item) => item.url);
    const expected = getPages()
      .filter((page) => page.published && !["/blog", "/coming-soon"].includes(page.path))
      .map((page) => "https://www.empressvr.com" + page.path);
    expect(urls).toEqual(expected);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain("https://www.empressvr.com/");
    expect(urls).not.toContain("https://www.empressvr.com/home");
  });

  it("keeps Vercel preview out of search engines", async () => {
    process.env.VERCEL_ENV = "preview";
    expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(robots().sitemap).toBeUndefined();
    expect((await sitemap()).every((item) => item.url.startsWith("https://www.empressvr.com/"))).toBe(true);
  });

  it("exposes a production sitemap after approved cutover", () => {
    delete process.env.VERCEL_ENV;
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: "https://www.empressvr.com/sitemap.xml",
    });
  });
});
