import type { Metadata } from "next";
import { MembershipPlanner } from "@/components/membership-planner";

export const metadata: Metadata = {
  title: "Membership application preview",
  description: "Compare free community membership and Empress Immersive co-operative memberships.",
  robots: { index: false, follow: false },
};

export default function MembershipPage() {
  return <section className="membership-page"><div className="page-container">
    <MembershipPlanner />
  </div></section>;
}
