import { describe, expect, it } from "vitest";
import {
  addCartItem, displayMoney, isPurchasable, normalizeCart, summarizeCart,
  updateCartQuantity, type StoreProduct,
} from "./cart";

const fox: StoreProduct = {
  id: "fox_mask", slug: "fox-mask", title: "Fox Mask", description: "STL file",
  priceMinor: 500, currency: "GBP", soldOut: false, featuredMediaId: null,
};
const course: StoreProduct = {
  id: "class_1", slug: "class-1", title: "Class", description: "",
  priceMinor: 4000, currency: "GBP", soldOut: true, featuredMediaId: null,
};
const catalog = [fox, course];

describe("pre-integration cart", () => {
  it("allows real in-stock catalog entries and computes subtotal from catalog only", () => {
    const cart = addCartItem(addCartItem([], "fox_mask", catalog), "fox_mask", catalog);
    expect(cart).toEqual([{ productId: "fox_mask", quantity: 2 }]);
    expect(summarizeCart(cart, catalog)).toMatchObject({
      itemCount: 2, subtotalMinor: 1000, currency: "GBP",
    });
    expect(displayMoney(1000, "GBP")).toBe("£10.00");
  });

  it("does not allow sold-out or unknown products into the cart", () => {
    expect(isPurchasable(course)).toBe(false);
    expect(addCartItem([], "class_1", catalog)).toEqual([]);
    expect(addCartItem([], "unknown", catalog)).toEqual([]);
  });

  it("ignores malformed browser state and clamps quantity at the preview limit", () => {
    const old = [{ productId: "fox_mask", quantity: 1 }, { productId: "fox_mask", quantity: 50 },
      { productId: "class_1", quantity: 1 }, { productId: "unknown", quantity: 2 },
      { productId: "fox_mask", quantity: -2 }, { productId: "fox_mask", quantity: 1.3 }];
    expect(normalizeCart(old, catalog)).toEqual([{ productId: "fox_mask", quantity: 10 }]);
    expect(normalizeCart("anything", catalog)).toEqual([]);
    expect(normalizeCart([{ productId: "fox_mask", quantity: 3 }], [course])).toEqual([]);
  });

  it("supports changing, removing and limiting quantities without storing prices", () => {
    const start = [{ productId: "fox_mask", quantity: 1 }];
    expect(updateCartQuantity(start, "fox_mask", 4, catalog)).toEqual([
      { productId: "fox_mask", quantity: 4 },
    ]);
    expect(updateCartQuantity(start, "fox_mask", 1000, catalog)[0].quantity).toBe(10);
    expect(updateCartQuantity(start, "fox_mask", 0, catalog)).toEqual([]);
    expect(updateCartQuantity(start, "fox_mask", -3, catalog)).toEqual(start);
  });

  it("recomputes all totals from current catalog price and ignores a stale line", () => {
    const cart = [{ productId: "fox_mask", quantity: 3 }];
    expect(summarizeCart(cart, [{ ...fox, priceMinor: 700 }]).subtotalMinor).toBe(2100);
    expect(summarizeCart(cart, [{ ...fox, soldOut: true }]).itemCount).toBe(0);
  });
});
