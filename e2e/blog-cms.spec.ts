import { expect, test } from "@playwright/test";

test("blog index is public and includes navigation", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: "Blog", exact: true })).toBeVisible();
  await expect(page.locator(".site-nav a[href='/blog']")).toHaveAttribute("href", "/blog");
});

test("unpublished or missing articles cannot be accessed publicly", async ({ page }) => {
  const response = await page.goto("/blog/this-post-does-not-exist");
  expect(response?.status()).toBe(404);
});

test("unauthenticated visitors cannot access staff dashboard and editor", async ({ page }) => {
  for (const path of ["/staff", "/staff/blog", "/staff/blog/new", "/staff/blog/123e4567-e89b-42d3-a456-426614174000"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test("public navigation shows sign-in, without exposing dashboard to visitors", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".site-nav a[href='/login']")).toHaveCount(1);
  await expect(page.locator(".site-nav a[href='/staff']")).toHaveCount(0);
});
