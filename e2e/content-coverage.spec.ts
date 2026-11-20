import { readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const contentDir = join(process.cwd(), "src", "content", "legacy");
const routes = readdirSync(contentDir)
  .filter((name) => name.endsWith(".md"))
  .map((name) => name === "home.md" ? "/" : "/" + name.slice(0, -3).replaceAll("__", "/"))
  .concat("/home")
  .sort();

test.describe("migrated page inventory", () => {
  for (const route of routes) {
    test("loads " + route, async ({ page }, testInfo) => {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), "HTTP status for " + route).toBe(200);
      await expect(page.locator("#main-content")).toBeVisible();

      // /blog has an empty original extraction and must be repaired separately.
      if (route !== "/blog") {
        const mainText = (await page.locator("#main-content").innerText())
          .replace(/[\u00ad\u200b\u200c\u200d\u00a0]/g, "").trim();
        expect(mainText.length, "missing page content at " + route).toBeGreaterThan(0);
      }

      const brokenLinks = await page.locator("a[href]").evaluateAll((links, allowedPaths) => {
        return links.flatMap((link) => {
          const href = link.getAttribute("href");
          if (!href || href.startsWith("#")) return [];
          const url = new URL(href, document.baseURI);
          if (url.origin !== location.origin) return [];
          const path = url.pathname.replace(/\/+$/, "") || "/";
          return allowedPaths.includes(path) ? [] : [href];
        });
      }, routes);
      expect(brokenLinks, "broken in-app navigation at " + route).toEqual([]);

      const missingSources = await page.locator("img").evaluateAll((images) =>
        images.filter((img) => !img.getAttribute("src")).map((img) => img.outerHTML)
      );
      expect(missingSources, "images without a source at " + route).toEqual([]);

      if (testInfo.project.name === "mobile-chromium") {
        const overflow = await page.evaluate(() =>
          Math.max(0, document.documentElement.scrollWidth - window.innerWidth)
        );
        expect(overflow, "horizontal overflow at " + route).toBeLessThanOrEqual(2);
      }
    });
  }
});

test("header navigation reaches the community page", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile-chromium") {
    await page.locator(".mobile-menu summary").click();
    await page.getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Community" }).click();
  } else {
    await page.getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Community" }).click();
  }
  await expect(page).toHaveURL(/\/community\/?$/);
  await expect(page.locator("#main-content")).toBeVisible();
});
