import { describe, expect, it } from "vitest";
import {
  initialMembershipDraft, isQuarterlyContributionValid,
  membershipCost, membershipOptions, officialMembershipUrl, validateMembershipDraft,
  type MembershipDraft,
} from "./preview";

const completeCommunity: MembershipDraft = {
  ...initialMembershipDraft(),
  firstName: "Avery", lastName: "Taylor", email: "avery@example.com",
  country: "United Kingdom", discovery: "friend",
  communityContribution: "I teach community art workshops.", acceptsPrivacy: true,
};
const completeCoop: MembershipDraft = {
  ...completeCommunity, kind: "user", coopContribution: "I can organize meetups.",
  objectiveAlignment: "I want to increase access to creative technology.",
  acceptsTerms: true,
};

describe("membership review: source-backed options", () => {
  it("shows free community, supporter, user, and non-applicable employee options", () => {
    expect(membershipOptions.map((plan) => plan.kind)).toEqual([
      "community", "supporter", "user", "employee",
    ]);
    expect(membershipOptions.find((p) => p.kind === "employee")?.selectable).toBe(false);
    expect(officialMembershipUrl("community")).toBe("https://www.empressvr.com/join-the-community");
    expect(officialMembershipUrl("user")).toBe("https://www.empressvr.com/join-the-coop");
  });
  it("keeps brochure costs separate from live subscriptions", () => {
    expect(membershipCost("community", 13)).toEqual({ dueNowMinor: 0, recurringQuarterlyMinor: 0 });
    expect(membershipCost("supporter", 13)).toEqual({ dueNowMinor: 100, recurringQuarterlyMinor: 0 });
    expect(membershipCost("user", 13)).toEqual({ dueNowMinor: 1400, recurringQuarterlyMinor: 1300 });
    expect(membershipCost("user", 52)).toEqual({ dueNowMinor: 5300, recurringQuarterlyMinor: 5200 });
    expect(membershipCost("user", 12)).toBeNull();
    for (const invalid of [12, 53, 13.5, Infinity, NaN]) {
      expect(isQuarterlyContributionValid(invalid)).toBe(false);
    }
  });
  it("validates a community draft independently from the paid application", () => {
    expect(validateMembershipDraft(completeCommunity)).toEqual([]);
    expect(validateMembershipDraft({ ...completeCommunity, acceptsPrivacy: false }))
      .toContain("Accept the privacy policy.");
    expect(validateMembershipDraft({ ...completeCommunity, email: "invalid" }))
      .toContain("Enter a valid email address.");
    expect(validateMembershipDraft({ ...completeCommunity, country: "" }))
      .toContain("Enter your country of residence.");
  });
  it("requires cooperative contribution, alignment and legal acceptance", () => {
    expect(validateMembershipDraft(completeCoop)).toEqual([]);
    expect(validateMembershipDraft({ ...completeCoop, coopContribution: "" }))
      .toContain("Tell us how you would contribute to the co-operative.");
    expect(validateMembershipDraft({ ...completeCoop, objectiveAlignment: "" }))
      .toContain("Tell us how your interests align with the co-operative.");
    expect(validateMembershipDraft({ ...completeCoop, acceptsTerms: false }))
      .toContain("Accept the membership terms.");
  });
});
