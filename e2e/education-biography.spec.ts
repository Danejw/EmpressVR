import { test, expect } from "@playwright/test";

test("Education reads John Howard's published profile instead of blank fields", async ({ page }) => {
  await page.goto("/education");
  await expect(page.getByRole("heading", { name: "John Howard - Cyrnus" })).toBeVisible();
  await expect(page.getByText("John Howard brings over a decade of robust software development experience", { exact: false })).toBeVisible();
  await expect(page.getByText("dual Bachelor's degrees in Computer Science and Mathematics", { exact: false })).toBeVisible();
  await expect(page.locator("main img[src]")).toHaveCount(2);
  await expect(page.locator("main")).not.toContainText("Experience:\n\nEducation:");
  await page.goto("/john-howard");
  await expect(page.getByText("John Howard brings over a decade of robust software development experience", { exact: false })).toBeVisible();
});
