import type { Metadata } from "next";
import { BookingPlanner } from "@/components/booking-planner";
import { getProducts } from "@/features/content/repository";
import { getPublishedOfferings, publicReadConfig } from "@/features/content/supabase-public";
import { monthKey } from "@/features/scheduling/calendar-month";

export const metadata: Metadata = {
  title: "Classes and bookings",
  description: "Explore EmpressVR classes, community sessions, and booking dates.",
  alternates: { canonical: "/book" },
  robots: { index: false, follow: false }, // Hold indexing until real bookings are enabled.
};

/** Hosted bookings read published offerings; static previews use clearly archived products.
 * Never infer capacity from a course, a product or an old event calendar.
 */
export default async function BookingPage() {
  const config = publicReadConfig();
  const rows = await getPublishedOfferings();
  const offerings = rows.filter((item) =>
    (item.kind === "class" || item.kind === "appointment") &&
    item.published === true &&
    typeof item.id === "string" && typeof item.title === "string" &&
    typeof item.description === "string" &&
    Number.isSafeInteger(item.price_minor) && item.price_minor >= 0 &&
    typeof item.currency === "string" && /^[A-Z]{3}$/.test(item.currency) &&
    typeof item.accepting_bookings === "boolean"
  ).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    kind: item.kind as "class" | "appointment",
    priceMinor: item.price_minor,
    currency: item.currency,
    acceptingBookings: item.accepting_bookings,
  }));

  // Preserve offline/GitHub Pages source snapshots; never mix product prices into live offerings.
  const snapshotOnly = config.staticPreview || !config.url || !config.publishableKey;
  const archivedCourses = snapshotOnly
    ? getProducts()
      .filter((product) => product.sold_out && product.slug !== "fox-mask-stl-file-for-3d-printing")
      .map((product) => ({
        id: product.id,
        slug: product.slug,
        title: product.title,
        description: product.description,
        priceMinor: product.price_minor,
        currency: product.currency,
        soldOut: product.sold_out,
      }))
    : [];

  return <section className="booking-page">
    <div className="page-container">
      <BookingPlanner
        archivedCourses={archivedCourses}
        offerings={offerings}
        slots={[]}
        initialMonth={monthKey()}
      />
    </div>
  </section>;
}
