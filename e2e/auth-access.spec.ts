import { test, expect } from "@playwright/test";

test("login uses email and password instead of OTP", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in to EmpressVR" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", "/forgot-password");
  await expect(page.getByRole("button", { name: "Send sign-in code" })).toHaveCount(0);
});

test("signup requires two matching passwords and does not grant membership", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your EmpressVR account" })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("minlength", "8");
  await expect(page.getByLabel("Confirm password")).toHaveAttribute("type", "password");
  await page.getByLabel("Email address").fill("example@example.com");
  await page.getByLabel("Password", { exact: true }).fill("sufficient-test-password");
  await page.getByLabel("Confirm password").fill("different-test-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.locator(".auth-panel .auth-error")).toContainText("Passwords do not match");
  await expect(page.getByText("Membership approval is separate.")).toBeVisible();
});

test("forgot password has a reset-link request without triggering emails", async ({ page }) => {
  await page.goto("/forgot-password");
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
});

test("reset password without an authenticated recovery link shows recovery instructions", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page.getByRole("link", { name: "Request another link" })).toBeVisible();
});

test("invalid callback redirects to login instead of opening private pages", async ({ page }) => {
  await page.goto("/auth/callback?next=https://example.org/");
  await expect(page).toHaveURL(/\/login\?error=link$/);
  await expect(page.locator(".auth-panel .auth-error")).toContainText("invalid or has expired");
});

test("unauthenticated account and staff routes redirect to login", async ({ page }) => {
  for (const path of ["/account", "/staff", "/staff/security"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in to EmpressVR" })).toBeVisible();
  }
});

test("login is visible in site navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('.site-nav a[href="/login"]')).toHaveAttribute("href", "/login");
});
