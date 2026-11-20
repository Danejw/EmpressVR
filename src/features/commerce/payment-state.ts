/**
 * Deterministic order transitions for already-VERIFIED provider events.
 * This module cannot verify Stripe signatures. Only a server-side webhook
 * verifier may produce events for this function.
 * ASVS 2.3.1/2.3.3: transitions are ordered and must commit atomically.
 */
export type OrderStatus = "awaiting_payment" | "paid" | "failed" | "refunded";
export type Order = Readonly<{
  id: string;
  providerSessionId: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
}>;

export type VerifiedProviderOutcome = Readonly<{
  eventId: string;
  orderId: string;
  providerSessionId: string;
  kind: "paid" | "failed" | "full_refund";
  amountMinor: number;
  currency: string;
}>;

export type OrderDecision = Readonly<{
  nextStatus: OrderStatus;
  changed: boolean;
  queueFulfillment: boolean;
}>;

export class PaymentRuleError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "PaymentRuleError";
  }
}

/** The ledger MUST record eventId uniquely, transition the order, and enqueue
 * fulfillment exactly once in one transaction. The outbox worker must be
 * retry-safe. Duplicate webhook deliveries may never create duplicate access.
 */
export interface PaymentEventLedger {
  applyVerifiedOutcomeAtomically(event: VerifiedProviderOutcome): Promise<OrderDecision>;
}

export function decideVerifiedPayment(
  order: Order,
  event: VerifiedProviderOutcome,
): OrderDecision {
  if (!event.eventId || event.eventId.length > 255 ||
      !event.orderId || !event.providerSessionId ||
      event.orderId !== order.id || event.providerSessionId !== order.providerSessionId) {
    throw new PaymentRuleError("identity_mismatch", "Verified payment identity does not match order");
  }
  if (!Number.isSafeInteger(order.amountMinor) || order.amountMinor <= 0 ||
      !Number.isSafeInteger(event.amountMinor) || event.amountMinor <= 0 ||
      order.amountMinor !== event.amountMinor ||
      order.currency !== event.currency || !/^[A-Z]{3}$/.test(order.currency)) {
    throw new PaymentRuleError("amount_mismatch", "Verified amount or currency differs from the order");
  }
  let nextStatus: OrderStatus = order.status;
  if (event.kind === "paid") {
    if (order.status === "awaiting_payment") nextStatus = "paid";
    else if (order.status !== "paid" && order.status !== "refunded") {
      throw new PaymentRuleError("invalid_transition", "Cannot pay an already failed order");
    }
  } else if (event.kind === "failed") {
    if (order.status === "awaiting_payment") nextStatus = "failed";
  } else if (event.kind === "full_refund") {
    if (order.status === "paid") nextStatus = "refunded";
    else if (order.status !== "refunded") {
      throw new PaymentRuleError("invalid_transition", "Cannot refund an unpaid order");
    }
  } else {
    throw new PaymentRuleError("invalid_event", "Unrecognized payment outcome");
  }
  return {
    nextStatus,
    changed: nextStatus !== order.status,
    queueFulfillment: order.status === "awaiting_payment" && nextStatus === "paid",
  };
}
