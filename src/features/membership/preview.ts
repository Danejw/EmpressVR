/**
 * Source-backed membership brochure and client-side review rules.
 * Prices are indicative until approved plans are published from Supabase.
 * This module neither submits applications nor grants membership.
 */
export type MembershipKind = "community" | "supporter" | "user" | "employee";
export type SelectableMembership = Exclude<MembershipKind, "employee">;
export type CommunityChannel = "whatsapp" | "discord" | "already_member";
export type DiscoverySource =
  | "friend" | "website" | "instagram" | "facebook" | "linkedin"
  | "meetup" | "tiktok" | "other";

export const membershipOptions: ReadonlyArray<Readonly<{
  kind: MembershipKind;
  title: string;
  description: string;
  priceLabel: string;
  note: string;
  selectable: boolean;
}>> = [
  {
    kind: "community", title: "Community Member",
    description: "Join the Discord server, WhatsApp community, or both. Community membership is free and does not include co-operative voting rights.",
    priceLabel: "Free", note: "No co-operative subscription", selectable: true,
  },
  {
    kind: "supporter", title: "Supporter Member",
    description: "Support the co-operative, participate in its governance and contribute to projects. The published expectation is 2–4 hours of project work each week.",
    priceLabel: "£1 joining fee", note: "One time, before applicable taxes and fees", selectable: true,
  },
  {
    kind: "user", title: "User Member",
    description: "For people and businesses using Empress Immersive services, including creators and audience members. Includes relevant discounts and governance participation.",
    priceLabel: "£1 + £13–£52 / quarter", note: "Sliding-scale quarterly contribution", selectable: true,
  },
  {
    kind: "employee", title: "Employee Member",
    description: "For employees who voluntarily join the co-operative. The source site currently states that the co-operative has no employees.",
    priceLabel: "£1 joining fee", note: "Not currently open for applications", selectable: false,
  },
] as const;

export const discoveryOptions: ReadonlyArray<{ value: DiscoverySource; label: string }> = [
  { value: "friend", label: "A friend in the community" },
  { value: "website", label: "EmpressVR website" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "meetup", label: "MeetUp" },
  { value: "tiktok", label: "TikTok" },
  { value: "other", label: "Other" },
];

export type MembershipDraft = Readonly<{
  kind: SelectableMembership;
  quarterlyPounds: number; // display-only brochure range, not an authorized subscription price
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  channels: readonly CommunityChannel[];
  discovery: DiscoverySource | "";
  website: string;
  communityContribution: string;
  joke: string;
  story: string;
  coopContribution: string;
  objectiveAlignment: string;
  acceptsPrivacy: boolean;
  acceptsTerms: boolean;
}>;

export function initialMembershipDraft(): MembershipDraft {
  return {
    kind: "community", quarterlyPounds: 13,
    firstName: "", lastName: "", email: "", phone: "", country: "",
    channels: [], discovery: "", website: "", communityContribution: "",
    joke: "", story: "", coopContribution: "", objectiveAlignment: "",
    acceptsPrivacy: false, acceptsTerms: false,
  };
}

export function isQuarterlyContributionValid(pounds: number): boolean {
  return Number.isSafeInteger(pounds) && pounds >= 13 && pounds <= 52;
}

export function membershipCost(kind: MembershipKind, quarterlyPounds: number) {
  if (kind === "community") return { dueNowMinor: 0, recurringQuarterlyMinor: 0 };
  if (kind === "supporter" || kind === "employee") return {
    dueNowMinor: 100, recurringQuarterlyMinor: 0,
  };
  if (!isQuarterlyContributionValid(quarterlyPounds)) return null;
  return {
    dueNowMinor: 100 + quarterlyPounds * 100,
    recurringQuarterlyMinor: quarterlyPounds * 100,
  };
}

/** Preview-only validation; server validation will be required before live submissions. */
export function validateMembershipDraft(draft: MembershipDraft): string[] {
  const errors: string[] = [];
  if (draft.kind === "user" && !isQuarterlyContributionValid(draft.quarterlyPounds)) {
    errors.push("Choose a quarterly contribution between £13 and £52.");
  }
  if (!draft.firstName.trim() || draft.firstName.length > 100 ||
      !draft.lastName.trim() || draft.lastName.length > 100) {
    errors.push("Enter your first and last name.");
  }
  if (draft.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    errors.push("Enter a valid email address.");
  }
  if (draft.phone.length > 40) errors.push("Phone number is too long.");
  if (!draft.country.trim() || draft.country.length > 100) {
    errors.push("Enter your country of residence.");
  }
  if (!discoveryOptions.some((item) => item.value === draft.discovery)) {
    errors.push("Tell us how you found EmpressVR.");
  }
  if (draft.kind === "community") {
    if (draft.communityContribution.trim().length < 5 ||
        draft.communityContribution.length > 3000) {
      errors.push("Tell us what you do and how you could contribute.");
    }
  } else {
    if (draft.coopContribution.trim().length < 5 ||
        draft.coopContribution.length > 3000) {
      errors.push("Tell us how you would contribute to the co-operative.");
    }
    if (draft.objectiveAlignment.trim().length < 5 ||
        draft.objectiveAlignment.length > 3000) {
      errors.push("Tell us how your interests align with the co-operative.");
    }
    if (!draft.acceptsTerms) errors.push("Accept the membership terms.");
  }
  if (draft.story.length > 3000 || draft.joke.length > 500 ||
      draft.website.length > 250 || draft.communityContribution.length > 3000) {
    errors.push("One of the optional responses is too long.");
  }
  if (!draft.acceptsPrivacy) errors.push("Accept the privacy policy.");
  return errors;
}

export function officialMembershipUrl(kind: MembershipKind): string {
  return kind === "community"
    ? "https://www.empressvr.com/join-the-community"
    : "https://www.empressvr.com/join-the-coop";
}
