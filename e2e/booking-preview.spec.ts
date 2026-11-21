import { expect, test } from "@playwright/test";

test("booking preview uses only real archived catalog data and no fabricated times", async ({ page }) => {
  await page.goto("/book");
  await expect(page.getByRole("heading", { name: "Find a session" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explore our classes" })).toBeVisible();
  await expect(page.locator(".booking-archived-grid article")).toHaveCount(3);
  await expect(page.getByText("No classes are currently published for online booking.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Online booking not yet connected" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Current booking site" }))
    .toHaveAttribute("href", "https://www.empressvr.com/scheduling");
  const initial = await page.locator(".booking-calendar-nav h4").textContent();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.locator(".booking-calendar-nav h4")).not.toHaveText(initial || "");
  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page.locator(".booking-calendar-nav h4")).toHaveText(initial || "");
  await expect(page.locator(".booking-calendar-date:not(:disabled)")).toHaveCount(0);
});
