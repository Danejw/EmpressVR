import type { Metadata } from "next";
import { PublishedEvents } from "@/components/published-events";

export const metadata: Metadata = {
  title: "Events",
  description: "Published EmpressVR events.",
  alternates: { canonical: "/events" },
};

export default function EventsPage() {
  return <PublishedEvents showEmpty />;
}
