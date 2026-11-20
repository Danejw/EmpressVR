import { describe, expect, it } from "vitest";
import {
  CheckoutRuleError, quoteCheckout, type CheckoutCatalog, type ProductOffer,
} from "./checkout";

const product: ProductOffer = {
  id: "fox_mask", currency: "GBP", unitAmountMinor: 500,
  available: true, maxQuantity: 3,
};
const catalog: CheckoutCatalog = {
  getProduct: async () => product,
  getCampaign: async () => ({
    id: "fun_raiser", currency: "GBP", acceptingContributions: true,
    minimumMinor: 100, maximumMinor: 10_000,
    allowedCadences: ["once", "monthly", "quarterly"],
  }),
  getMembershipPlan: async () => ({
    id: "user_member", currency: "GBP", acceptingApplications: true,
    joiningFeeMinor: 100, quarterlyAmountMinor: 1300,
  }),
};
const rejectsCode = (code: string) => (error: unknown) =>
  error instanceof CheckoutRuleError && error.code === code;

describe("checkout quotes from trusted catalog records", () => {
  it("derives the existing £5 Fox Mask price from the catalog", async () => {
    const quote = await quoteCheckout({ kind: "product", productId: "fox_mask", quantity: 2 }, catalog);
    expect(quote.currency).toBe("GBP");
    expect(quote.mode).toBe("payment");
    expect(quote.dueNowMinor).toBe(1000);
    expect(quote.recurringMinor).toBe(0);
    expect(quote.lines).toEqual([{ reference: "fox_mask", amountMinor: 500, quantity: 2, cadence: "once" }]);
  });

  it("rejects sold-out and over-limit purchases", async () => {
    const unavailable = { ...catalog, getProduct: async () => ({ ...product, available: false }) };
    await expect(quoteCheckout({ kind: "product", productId: "fox_mask", quantity: 1 }, unavailable))
      .rejects.toSatisfy(rejectsCode("unavailable"));
    await expect(quoteCheckout({ kind: "product", productId: "fox_mask", quantity: 4 }, catalog))
      .rejects.toSatisfy(rejectsCode("unavailable"));
    await expect(quoteCheckout({ kind: "product", productId: "fox_mask", quantity: -1 }, catalog))
      .rejects.toSatisfy(rejectsCode("invalid_request"));
  });

  it("only permits authorized contribution amounts and cadence", async () => {
    const once = await quoteCheckout({
      kind: "donation", campaignId: "fun_raiser", amountMinor: 500, cadence: "once",
    }, catalog);
    const monthly = await quoteCheckout({
      kind: "donation", campaignId: "fun_raiser", amountMinor: 500, cadence: "monthly",
    }, catalog);
    expect(once.mode).toBe("payment");
    expect(once.recurringMinor).toBe(0);
    expect(monthly.mode).toBe("subscription");
    expect(monthly.recurringMinor).toBe(500);
    for (const amountMinor of [0, 99, 10_001, 2.5]) {
      await expect(quoteCheckout({
        kind: "donation", campaignId: "fun_raiser", amountMinor, cadence: "once",
      }, catalog)).rejects.toBeInstanceOf(CheckoutRuleError);
    }
    await expect(quoteCheckout({
      kind: "donation", campaignId: "fun_raiser", amountMinor: 500, cadence: "weekly",
    }, catalog)).rejects.toSatisfy(rejectsCode("invalid_request"));
  });

  it("separates one-time joining fee from the ongoing quarterly fee", async () => {
    const quote = await quoteCheckout({ kind: "membership", membershipPlanId: "user_member" }, catalog);
    expect(quote.mode).toBe("subscription");
    expect(quote.dueNowMinor).toBe(1400);
    expect(quote.recurringMinor).toBe(1300);
    expect(quote.requiresMembershipApproval).toBe(true);
    expect(quote.lines.map(x => x.cadence)).toEqual(["once", "quarterly"]);
  });

  it("supports joining-fee-only membership without inventing a subscription", async () => {
    const local = {
      ...catalog, getMembershipPlan: async () => ({
        id: "supporter", currency: "GBP", acceptingApplications: true,
        joiningFeeMinor: 100, quarterlyAmountMinor: 0,
      }),
    };
    const quote = await quoteCheckout({ kind: "membership", membershipPlanId: "supporter" }, local);
    expect(quote.mode).toBe("payment");
    expect(quote.recurringMinor).toBe(0);
    expect(quote.requiresMembershipApproval).toBe(true);
  });

  it("refuses unknown offers, invalid prices and unauthorized checkout modes", async () => {
    const unknown = { ...catalog, getProduct: async () => null };
    await expect(quoteCheckout({ kind: "product", productId: "fox_mask", quantity: 1 }, unknown))
      .rejects.toSatisfy(rejectsCode("unavailable"));
    const invalid = { ...catalog, getProduct: async () => ({ ...product, unitAmountMinor: 0 }) };
    await expect(quoteCheckout({ kind: "product", productId: "fox_mask", quantity: 1 }, invalid))
      .rejects.toSatisfy(rejectsCode("invalid_amount"));
    const blocked = {
      ...catalog, getMembershipPlan: async () => ({
        id: "user_member", currency: "GBP", acceptingApplications: false,
        joiningFeeMinor: 100, quarterlyAmountMinor: 1300,
      }),
    };
    await expect(quoteCheckout({ kind: "membership", membershipPlanId: "user_member" }, blocked))
      .rejects.toSatisfy(rejectsCode("unavailable"));
  });
});
