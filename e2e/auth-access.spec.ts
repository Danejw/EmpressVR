import { test, expect } from "@playwright/test";

test("public sign-in presents the email-OTP flow without passwords", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to EmpressVR" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send sign-in code" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test("unauthenticated account and staff routes redirect to login", async ({ page }) => {
  for (const path of ["/account", "/staff", "/staff/security"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in to EmpressVR" })).toBeVisible();
  }
});

test("signup uses the same sign-in flow", async ({ page }) => {
  await page.goto("/signup");
  await expect(page).toHaveURL(/\/login$/);
});

test("login is visible in site navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".site-nav").getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
});
