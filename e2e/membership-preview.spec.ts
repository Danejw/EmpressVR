import { expect, test } from "@playwright/test";

test("free community application validates required fields, reviews locally, never submits", async ({ page }) => {
  await page.goto("/membership");
  await expect(page.getByRole("heading", { name: "Find your membership" })).toBeVisible();
  await expect(page.locator(".membership-option")).toHaveCount(4);
  await expect(page.getByText("Not available to apply")).toBeVisible();
  await expect(page.getByRole("button", { name: "Applications not yet connected" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "use the current EmpressVR application" }))
    .toHaveAttribute("href", "https://www.empressvr.com/join-the-community");
  await expect(page.getByRole("button", { name: "Review application" })).toBeDisabled();

  await page.getByRole("textbox", { name: "First name" }).fill("Avery");
  await page.getByRole("textbox", { name: "Last name" }).fill("Taylor");
  await page.getByRole("textbox", { name: "Email" }).fill("avery@example.com");
  await page.getByRole("textbox", { name: "Country of residence" }).fill("United Kingdom");
  await page.getByRole("combobox", { name: "How did you hear about us?" }).selectOption("friend");
  await page.getByRole("textbox", { name: "Community contribution" }).fill("I can share VR storytelling resources.");
  await page.getByRole("checkbox", { name: /I accept the Privacy Policy/ }).check();
  await page.getByRole("button", { name: "Review application" }).click();
  await expect(page.getByRole("heading", { name: "Review your application" })).toBeVisible();
  await expect(page.locator(".membership-review")).toContainText("avery@example.com");
  await expect(page.getByRole("button", { name: "Applications not yet connected" })).toBeDisabled();
  await expect(page.getByText("These details have not been sent to EmpressVR.")).toBeVisible();
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(page.getByRole("textbox", { name: "First name" })).toHaveValue("Avery");
});

test("user membership shows the sourced quarterly range and requires both consents", async ({ page }) => {
  await page.goto("/membership");
  await page.getByRole("button", { name: "Choose User Member" }).click();
  await expect(page.getByRole("slider", { name: /Quarterly contribution:/ })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Membership summary" })).toContainText("£14.00");
  await page.getByRole("slider", { name: /Quarterly contribution:/ }).fill("27");
  await expect(page.getByRole("complementary", { name: "Membership summary" })).toContainText("£28.00");
  await expect(page.getByRole("complementary", { name: "Membership summary" })).toContainText("£27.00");
  await expect(page.getByRole("link", { name: "use the current EmpressVR application" }))
    .toHaveAttribute("href", "https://www.empressvr.com/join-the-coop");
  await expect(page.getByRole("checkbox", { name: /I accept the Membership Terms/ })).not.toBeChecked();
  await page.getByRole("button", { name: "Choose Supporter Member" }).click();
  await expect(page.getByRole("slider", { name: /Quarterly contribution:/ })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Membership summary" })).toContainText("£1.00");
  await expect(page.getByRole("button", { name: "Applications not yet connected" })).toBeDisabled();
});

test("old membership pages link to replacement preview without showing static form debris", async ({ page }) => {
  for (const [path, label] of [
    ["/join-the-community", "Join the Community!"],
    ["/join-the-coop", "Join the Co-operative!"],
    ["/join-the-coop-na", "Join the Co-operative!"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: label }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore the new membership form" }))
      .toHaveAttribute("href", "/membership");
    await expect(page.locator(".page-sections")).not.toContainText("SubmitSubmit");
  }
  await expect(page.getByRole("heading", { name: "Applications are currently closed" })).toBeVisible();
});

test("application status pages never claim a real application exists", async ({ page }) => {
  for (const state of ["pending", "approved", "rejected", "withdrawn"]) {
    await page.goto("/membership/status/" + state);
    await expect(page.getByText("Preview only. No application was submitted or retrieved.")).toBeVisible();
    await expect(page.getByText("Example application status")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});
