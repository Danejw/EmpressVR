import type { Metadata } from "next";
import { BookingPlanner } from "@/components/booking-planner";
import { getProducts } from "@/features/content/repository";
import { monthKey } from "@/features/scheduling/calendar-month";

export const metadata: Metadata = {
  title: "Classes and bookings",
  description: "Explore EmpressVR classes, community sessions, and booking dates.",
  alternates: { canonical: "/book" },
};

/**
 * Snapshot mode: historical product data is real, but contains no bookable slots.
 * Once published offerings and slots are connected, provide them as trusted
 * server-side props. Never infer availability from archived products or events.
 */
export default function BookingPage() {
  const archivedCourses = getProducts()
    .filter((product) => product.sold_out && product.slug !== "fox-mask-stl-file-for-3d-printing")
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      priceMinor: product.price_minor,
      currency: product.currency,
      soldOut: product.sold_out,
    }));
  return <main className="booking-page">
    <div className="page-container">
      <BookingPlanner
        archivedCourses={archivedCourses}
        offerings={[]}
        slots={[]}
        initialMonth={monthKey()}
      />
    </div>
  </main>;
}
