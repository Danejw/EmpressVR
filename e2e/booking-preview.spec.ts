import { expect, test } from "@playwright/test";

test("booking catalogue shows only verified slots and remains safe without database credentials", async ({ page }) => {
  await page.goto("/book");
  await expect(page.getByRole("heading", { name: "Find a session" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explore our classes" })).toBeVisible();
  await expect(page.locator(".booking-archived-grid article")).toHaveCount(3);
  await expect(page.getByText("No classes are currently published for online booking.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in to reserve" })).toBeDisabled();
  await expect(page.locator(".booking-planner-heading").getByRole("link", { name: "Current booking site" }))
    .toHaveAttribute("href", "https://www.empressvr.com/scheduling");
  const initial = await page.locator(".booking-calendar-nav h4").textContent();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".booking-calendar-nav h4")).not.toHaveText(initial || "");
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page.locator(".booking-calendar-nav h4")).toHaveText(initial || "");
  await expect(page.locator(".booking-calendar-date:not(:disabled)")).toHaveCount(0);
});
