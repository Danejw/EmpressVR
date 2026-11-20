import { expect, test } from "@playwright/test";

test("homepage preserves the original hero and live content", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome to the Metaverse" })).toBeVisible();
  await expect(page.getByText("Fun-Raiser 2026")).toBeVisible();
  await expect(page.getByRole("link", { name: "View All VR Tours & Classes" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("homepage.png"), fullPage: true, animations: "disabled" });
});

test("project grid retains all seven featured works", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.locator(".project-tile")).toHaveCount(7);
  await expect(page.getByRole("heading", { name: "Exploring the Shadows" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Robotic Echoes" })).toBeVisible();
});

test("team page shows current members and photographs", async ({ page }) => {
  await page.goto("/who-we-are");
  await expect(page.getByRole("heading", { name: "Who We Are" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dominique Vyborna" })).toBeVisible();
  await expect(page.locator(".people-grid .member-card")).toHaveCount(6);
});

test("store preserves the four published product listings", async ({ page }) => {
  await page.goto("/store");
  await expect(page.locator(".store-card")).toHaveCount(4);
  await expect(page.getByRole("heading", { name: "Fox Mask - STL File for 3D Printing" })).toBeVisible();
  await expect(page.getByText("£5.00")).toBeVisible();
});

test("legacy detail pages resolve locally", async ({ page }) => {
  await page.goto("/robotic-echoes");
  await expect(page.locator(".legacy-copy")).not.toBeEmpty();
  await page.goto("/privacypolicy");
  await expect(page.locator(".legacy-copy")).not.toBeEmpty();
});
