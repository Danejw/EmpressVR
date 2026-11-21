import { describe, expect, it } from "vitest";
import {
  decideVerifiedPayment, PaymentRuleError,
  type Order, type VerifiedProviderOutcome,
} from "./payment-state";

const order: Order = {
  id: "order_1", providerSessionId: "checkout_1",
  amountMinor: 500, currency: "GBP", status: "awaiting_payment",
};
const paid: VerifiedProviderOutcome = {
  eventId: "event_1", orderId: "order_1", providerSessionId: "checkout_1",
  amountMinor: 500, currency: "GBP", kind: "paid",
};
const rejectsCode = (code: string) => (fn: () => unknown) => {
  try { fn(); return false; }
  catch (error) { return error instanceof PaymentRuleError && error.code === code; }
};

describe("signature-verified payment outcome decisions", () => {
  it("queues fulfillment only on the initial verified paid transition", () => {
    expect(decideVerifiedPayment(order, paid)).toEqual({
      nextStatus: "paid", changed: true, queueFulfillment: true,
    });
    expect(decideVerifiedPayment({ ...order, status: "paid" }, paid)).toEqual({
      nextStatus: "paid", changed: false, queueFulfillment: false,
    });
  });

  it("does not grant access for failures or delayed unpaid checkout", () => {
    expect(decideVerifiedPayment(order, { ...paid, kind: "failed" })).toEqual({
      nextStatus: "failed", changed: true, queueFulfillment: false,
    });
    expect(rejectsCode("invalid_transition")(() =>
      decideVerifiedPayment({ ...order, status: "failed" }, paid))).toBe(true);
  });

  it("handles a full refund without reactivating an old paid event", () => {
    const settled = { ...order, status: "paid" as const };
    const refunded = decideVerifiedPayment(settled, { ...paid, kind: "full_refund" });
    expect(refunded).toEqual({ nextStatus: "refunded", changed: true, queueFulfillment: false });
    expect(decideVerifiedPayment({ ...order, status: "refunded" }, paid)).toEqual({
      nextStatus: "refunded", changed: false, queueFulfillment: false,
    });
    expect(rejectsCode("invalid_transition")(() =>
      decideVerifiedPayment(order, { ...paid, kind: "full_refund" }))).toBe(true);
  });

  it("rejects mismatched identities, amounts and currency", () => {
    for (const mismatch of [
      { orderId: "other_order" }, { providerSessionId: "checkout_other" },
      { eventId: "" },
    ]) {
      expect(rejectsCode("identity_mismatch")(() =>
        decideVerifiedPayment(order, { ...paid, ...mismatch }))).toBe(true);
    }
    for (const mismatch of [
      { amountMinor: 499 }, { amountMinor: -10 }, { currency: "USD" },
    ]) {
      expect(rejectsCode("amount_mismatch")(() =>
        decideVerifiedPayment(order, { ...paid, ...mismatch }))).toBe(true);
    }
  });
});
