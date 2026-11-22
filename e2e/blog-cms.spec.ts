import { expect, test } from "@playwright/test";

test("blog index is public and includes navigation", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("heading", { name: "Blog", exact: true })).toBeVisible();
  await page.locator(".header-menu summary").click();
  await expect(page.getByRole("navigation",{name:"Primary navigation"})
    .getByRole("link",{name:"Blog",exact:true})).toHaveAttribute("href","/blog");
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

test("unauthenticated media uploads are rejected without storing a file", async ({ request }) => {
  const response = await request.post("/api/staff/blog-media", {
    headers: { origin: "http://127.0.0.1:3000" },
    multipart: { file: { name: "image.png", mimeType: "image/png", buffer: Buffer.from([137,80,78,71,13,10,26,10]) } },
  });
  expect(response.status()).toBe(403);
});

test("public navigation shows sign-in, without exposing dashboard to visitors", async ({ page }) => {
  await page.goto("/");
  await page.locator(".header-menu summary").click();
  const nav = page.getByRole("navigation",{name:"Primary navigation"});
  await expect(nav.getByRole("link",{name:"Sign in"})).toHaveCount(1);
  await expect(nav.locator('a[href="/staff"]')).toHaveCount(0);
});
