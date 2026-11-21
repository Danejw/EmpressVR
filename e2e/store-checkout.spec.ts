import { expect, test } from "@playwright/test";

test("store keeps sold-out products unavailable and adds the real £5 item to cart", async ({ page }) => {
  await page.goto("/store");
  const active = page.locator(".store-card").filter({
    has: page.getByRole("heading", { name: "Fox Mask - STL File for 3D Printing" }),
  });
  await expect(page.locator(".store-card")).toHaveCount(4);
  await expect(page.locator(".store-card .availability")).toHaveCount(3);
  await expect(page.locator(".store-card .store-add-controls button")).toHaveCount(1);
  await active.getByRole("button", { name: "Add Fox Mask - STL File for 3D Printing to cart" }).click();
  await expect(active.getByRole("link", { name: "View cart (1)" })).toBeVisible();

  await active.getByRole("link", { name: "View cart (1)" }).click();
  await expect(page).toHaveURL(/\/cart\/?$/);
  await expect(page.getByRole("heading", { name: "Shopping cart" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fox Mask - STL File for 3D Printing" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Cart items" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Order summary" })).toContainText("£5.00");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Fox Mask - STL File for 3D Printing" })).toBeVisible();
  await page.getByRole("combobox", { name: "Quantity" }).selectOption("3");
  await expect(page.getByRole("complementary", { name: "Order summary" })).toContainText("£15.00");
  await page.getByRole("link", { name: "Review checkout" }).click();
  await expect(page).toHaveURL(/\/checkout\/?$/);
  await expect(page.getByRole("heading", { name: "Ready for checkout" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Checkout summary" })).toContainText("£15.00");
  await expect(page.getByRole("button", { name: "Checkout not yet connected" })).toBeDisabled();
  await expect(page.getByText("Stripe has not been connected.")).toBeVisible();

  await page.getByRole("link", { name: "Edit cart" }).click();
  await page.getByRole("button", { name: "Remove Fox Mask - STL File for 3D Printing" }).click();
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible();
});

test("product detail provides the cart control and existing checkout remains available", async ({ page }) => {
  await page.goto("/store/p/fox-mask-stl-file-for-3d-printing");
  await expect(page.getByRole("button", { name: "Add Fox Mask - STL File for 3D Printing to cart" }))
    .toBeEnabled();
  await expect(page.getByRole("link", { name: "Buy on current store" }))
    .toHaveAttribute("href", "https://www.empressvr.com/store/p/fox-mask-stl-file-for-3d-printing");
  await page.getByRole("button", { name: "Add Fox Mask - STL File for 3D Printing to cart" }).click();
  await page.getByRole("link", { name: "View cart (1)" }).click();
  await expect(page.getByRole("heading", { name: "Fox Mask - STL File for 3D Printing" })).toBeVisible();
});

test("preview payment outcomes cannot claim real paid orders", async ({ page }) => {
  for (const state of ["success", "pending", "cancelled", "error"]) {
    await page.goto("/checkout/status/" + state);
    await expect(page.getByText("Preview only. No payment has been processed.")).toBeVisible();
    await expect(page.getByText("Example screen")).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  }
});
