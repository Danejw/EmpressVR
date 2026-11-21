import { test, expect } from "@playwright/test";

test("The Self We Find gallery is complete and opens in-page", async ({ page }) => {
  await page.goto("/the-self-we-find");
  const photos = page.locator(".gallery-lightbox-trigger");
  await expect(photos).toHaveCount(21);
  await expect(page.locator('a[href*="images.squarespace-cdn.com"]')).toHaveCount(0);
  await photos.first().click();
  const viewer = page.getByRole("dialog");
  await expect(viewer).toBeVisible();
  await expect(viewer).toContainText("1 of 21");
  await viewer.getByRole("button", { name: "Next image" }).click();
  await expect(viewer).toContainText("2 of 21");
  await viewer.getByRole("button", { name: "Close image viewer" }).click();
  await expect(viewer).not.toBeVisible();
});

test("legacy Shadows gallery preserves article content without external fullsize links", async ({ page }) => {
  await page.goto("/shadows-of-combat");
  await expect(page.locator(".gallery-lightbox-trigger")).toHaveCount(6);
  await expect(page.locator('a[href*="images.squarespace-cdn.com"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Shadows of Combat" })).toBeVisible();
});

test("Community heading hierarchy and About section links", async ({ page }) => {
  await page.goto("/community");
  await expect(page.locator("h1")).toHaveCount(1);
  await page.goto("/about");
  await expect(page.locator('a[href="/community"]')).not.toHaveCount(0);
  await expect(page.locator('a[href="/education"]')).not.toHaveCount(0);
});
