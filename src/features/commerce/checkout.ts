/**
 * Trusted checkout quotation from an authoritative catalog.
 * This module does not create sessions, collect money or grant access.
 * ASVS 2.2.1/2.2.2: validate requests on the server.
 * ASVS 2.3.1/2.3.2: derive all product/plan prices from trusted records.
 */
export type Cadence = "once" | "weekly" | "monthly" | "quarterly" | "yearly";
export type CheckoutRequest =
  | Readonly<{ kind: "product"; productId: string; quantity: number }>
  | Readonly<{ kind: "donation"; campaignId: string; amountMinor: number; cadence: Cadence }>
  | Readonly<{ kind: "membership"; membershipPlanId: string }>;

export type ProductOffer = Readonly<{
  id: string; currency: string; unitAmountMinor: number;
  available: boolean; maxQuantity: number;
}>;
export type DonationCampaign = Readonly<{
  id: string; currency: string; acceptingContributions: boolean;
  minimumMinor: number; maximumMinor: number; allowedCadences: readonly Cadence[];
}>;
export type MembershipPlan = Readonly<{
  id: string; currency: string; acceptingApplications: boolean;
  joiningFeeMinor: number; quarterlyAmountMinor: number;
}>;

export interface CheckoutCatalog {
  getProduct(id: string): Promise<ProductOffer | null>;
  getCampaign(id: string): Promise<DonationCampaign | null>;
  getMembershipPlan(id: string): Promise<MembershipPlan | null>;
}

export type CheckoutLine = Readonly<{
  reference: string;
  amountMinor: number;
  quantity: number;
  cadence: Cadence;
}>;
export type CheckoutQuote = Readonly<{
  kind: CheckoutRequest["kind"];
  mode: "payment" | "subscription";
  currency: string;
  lines: readonly CheckoutLine[];
  dueNowMinor: number; // excludes provider-calculated tax/fees
  recurringMinor: number; // amount per billing interval, not a lifetime total
  requiresMembershipApproval: boolean;
}>;

export class CheckoutRuleError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "CheckoutRuleError";
  }
}

function requireId(value: string): void {
  if (typeof value !== "string" || value.length < 1 || value.length > 128 ||
      !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)) {
    throw new CheckoutRuleError("invalid_request", "Invalid catalog reference");
  }
}
function requireMoney(value: number, allowZero = false): void {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > 1_000_000_000) {
    throw new CheckoutRuleError("invalid_amount", "Amount is outside permitted integer minor-unit range");
  }
}
function requireCurrency(currency: string): void {
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) {
    throw new CheckoutRuleError("invalid_catalog", "Invalid currency");
  }
}
function sumMinor(lines: readonly CheckoutLine[], cadence: Cadence): number {
  const result = lines.filter(line => line.cadence === cadence)
    .reduce((total, line) => total + line.amountMinor * line.quantity, 0);
  if (!Number.isSafeInteger(result) || result > 1_000_000_000) {
    throw new CheckoutRuleError("invalid_amount", "Quoted total exceeds supported range");
  }
  return result;
}

/** Make a quote from server-owned catalog values. Revalidate again at session creation. */
export async function quoteCheckout(
  request: CheckoutRequest,
  catalog: CheckoutCatalog,
): Promise<CheckoutQuote> {
  if (request.kind === "product") {
    requireId(request.productId);
    if (!Number.isSafeInteger(request.quantity) || request.quantity < 1) {
      throw new CheckoutRuleError("invalid_request", "Quantity must be positive");
    }
    const product = await catalog.getProduct(request.productId);
    if (!product || !product.available) {
      throw new CheckoutRuleError("unavailable", "Product is not available");
    }
    requireId(product.id);
    requireCurrency(product.currency);
    requireMoney(product.unitAmountMinor);
    if (product.id !== request.productId || !Number.isSafeInteger(product.maxQuantity) ||
        product.maxQuantity < 1 || request.quantity > product.maxQuantity) {
      throw new CheckoutRuleError("unavailable", "Requested quantity is not available");
    }
    const lines: CheckoutLine[] = [{
      reference: product.id, amountMinor: product.unitAmountMinor,
      quantity: request.quantity, cadence: "once",
    }];
    return {
      kind: "product", mode: "payment", currency: product.currency, lines,
      dueNowMinor: sumMinor(lines, "once"), recurringMinor: 0, requiresMembershipApproval: false,
    };
  }
  if (request.kind === "donation") {
    requireId(request.campaignId);
    if (!["once", "weekly", "monthly", "quarterly", "yearly"].includes(request.cadence)) {
      throw new CheckoutRuleError("invalid_request", "Unsupported contribution cadence");
    }
    const campaign = await catalog.getCampaign(request.campaignId);
    if (!campaign || !campaign.acceptingContributions) {
      throw new CheckoutRuleError("unavailable", "Campaign is not accepting contributions");
    }
    requireId(campaign.id);
    requireCurrency(campaign.currency);
    requireMoney(campaign.minimumMinor);
    requireMoney(campaign.maximumMinor);
    if (campaign.maximumMinor < campaign.minimumMinor || campaign.id !== request.campaignId) {
      throw new CheckoutRuleError("invalid_catalog", "Campaign configuration is invalid");
    }
    requireMoney(request.amountMinor);
    if (request.amountMinor < campaign.minimumMinor || request.amountMinor > campaign.maximumMinor ||
        !campaign.allowedCadences.includes(request.cadence)) {
      throw new CheckoutRuleError("invalid_request", "Contribution is outside approved campaign rules");
    }
    const recurring = request.cadence !== "once";
    const lines: CheckoutLine[] = [{
      reference: campaign.id, amountMinor: request.amountMinor, quantity: 1,
      cadence: request.cadence,
    }];
    return {
      kind: "donation", mode: recurring ? "subscription" : "payment",
      currency: campaign.currency, lines, dueNowMinor: request.amountMinor,
      recurringMinor: recurring ? request.amountMinor : 0, requiresMembershipApproval: false,
    };
  }
  if (request.kind === "membership") {
    requireId(request.membershipPlanId);
    const plan = await catalog.getMembershipPlan(request.membershipPlanId);
    if (!plan || !plan.acceptingApplications) {
      throw new CheckoutRuleError("unavailable", "Membership applications are not open");
    }
    requireId(plan.id);
    requireCurrency(plan.currency);
    requireMoney(plan.joiningFeeMinor, true);
    requireMoney(plan.quarterlyAmountMinor, true);
    if (plan.id !== request.membershipPlanId) {
      throw new CheckoutRuleError("invalid_catalog", "Membership plan does not match request");
    }
    if (plan.joiningFeeMinor === 0 && plan.quarterlyAmountMinor === 0) {
      throw new CheckoutRuleError("invalid_catalog", "Free community membership requires a separate application flow");
    }
    const lines: CheckoutLine[] = [];
    if (plan.joiningFeeMinor > 0) lines.push({
      reference: plan.id + "_joining", amountMinor: plan.joiningFeeMinor,
      quantity: 1, cadence: "once",
    });
    if (plan.quarterlyAmountMinor > 0) lines.push({
      reference: plan.id + "_quarterly", amountMinor: plan.quarterlyAmountMinor,
      quantity: 1, cadence: "quarterly",
    });
    return {
      kind: "membership",
      mode: plan.quarterlyAmountMinor > 0 ? "subscription" : "payment",
      currency: plan.currency, lines,
      dueNowMinor: plan.joiningFeeMinor + plan.quarterlyAmountMinor,
      recurringMinor: plan.quarterlyAmountMinor,
      requiresMembershipApproval: true,
    };
  }
  throw new CheckoutRuleError("invalid_request", "Unsupported checkout kind");
}
