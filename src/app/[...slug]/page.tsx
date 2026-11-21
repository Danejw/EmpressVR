import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LegacyMarkdown } from "@/components/legacy-markdown";
import { CommunityCalendar } from "@/components/community-calendar";
import { StoreAddButton } from "@/components/store-add-button";
import { getStoreCatalog } from "@/features/commerce/store-catalog";
import { displayMoney } from "@/features/commerce/cart";
import { monthKey, shiftMonth } from "@/features/scheduling/calendar-month";
import { fetchCommunityEvents } from "@/features/scheduling/google-calendar";
import { listLegacySlugs, readLegacyPage, sourcePageUrl } from "@/lib/legacy-pages";

type Props = { params: Promise<{ slug: string[] }> };
const specialPages = new Set(["home", "projects", "who-we-are", "store"]);

export async function generateStaticParams() {
  const pages = await listLegacySlugs();
  return pages.filter((slug) => !specialPages.has(slug)).map((slug) => ({ slug: slug.split("__") }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const key = slug.join("__");
  const markdown = await readLegacyPage(key);
  const title = markdown?.match(/^#{1,3} (.+)$/m)?.[1]?.replaceAll("*", "") || slug.at(-1)?.replaceAll("-", " ") || "EmpressVR";
  return {
    title,
    alternates: { canonical: "/" + slug.join("/") },
    ...(key === "blog" || key === "coming-soon" ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function ArchivedPage({ params }: Props) {
  const { slug } = await params;
  const key = slug.join("__");
  const markdown = await readLegacyPage(key);
  if (!markdown || specialPages.has(key)) notFound();
  const productSlug = key.startsWith("store__p__") ? key.slice("store__p__".length) : null;
  const storeProduct = productSlug
    ? (await getStoreCatalog()).find((item) => item.slug === productSlug)
    : null;
  // The Squarespace scrape included non-functional button labels. The real
  // shopping control is rendered separately and those stale labels are removed.
  const productMarkdown = storeProduct
    ? markdown.replace(/Add To Cart\s+Added!/g, "")
    : markdown;

  // Preserve the archived community copy while replacing the captured, nonfunctional
  // Squarespace calendar table with a live Google-backed calendar display.
  const calendarHeading = "### Community Calendar!";
  const nextHeading = "# Building a Global Community";
  const calendarStart = key === "community" ? markdown.indexOf(calendarHeading) : -1;
  const calendarEnd = calendarStart >= 0 ? markdown.indexOf(nextHeading, calendarStart) : -1;
  const hasCalendar = calendarStart >= 0 && calendarEnd > calendarStart;
  // Replace nonfunctional Squarespace application-form text in the source
  // snapshot. The real, live application remains on the existing site.
  const membershipFormHeading = key === "join-the-coop"
    ? "# Applications Are Open!"
    : key === "join-the-coop-na" ? "# Applications Are Currently Closed" : null;
  const membershipFormStart = membershipFormHeading
    ? markdown.indexOf(membershipFormHeading)
    : key === "join-the-community" ? markdown.indexOf("\nName\n") : -1;
  const hasLegacyMembershipForm = membershipFormStart >= 0;
  const thisMonth = monthKey();
  const firstMonth = shiftMonth(thisMonth, -3);
  const lastMonth = shiftMonth(thisMonth, 12);
  const [startYear, startMonth] = firstMonth.split("-").map(Number);
  const [endYear, endMonth] = lastMonth.split("-").map(Number);
  const feed = hasCalendar && process.env.GITHUB_PAGES_PREVIEW !== "true"
    ? await fetchCommunityEvents(
        new Date(Date.UTC(startYear, startMonth - 1, 0)),
        new Date(Date.UTC(endYear, endMonth, 2)),
      )
    : { status: "unconfigured" as const, events: [] };

  return <article className="legacy-page">
    <div className="page-container">
      {key === "scheduling" ? (
        <div className="booking-preview-link">
          <Link className="pill-button" href="/book">Explore the new booking calendar</Link>
          <a href={sourcePageUrl(key)} rel="noopener noreferrer">Book on the current EmpressVR website</a>
        </div>
      ) : key === "fun-raiser" ? (
        <p className="legacy-checkout-note"><a href={sourcePageUrl(key)} rel="noopener noreferrer">Continue donating on the existing EmpressVR site</a></p>
      ) : null}
      {storeProduct ? <div className="store-detail-purchase">
        <div>
          <span className="commerce-eyebrow">Store product</span>
          <strong>{displayMoney(storeProduct.priceMinor, storeProduct.currency)}</strong>
        </div>
        <StoreAddButton productId={storeProduct.id} />
      </div> : null}
      {hasCalendar ? <>
        <LegacyMarkdown markdown={markdown.slice(0, calendarStart)} />
        <section className="community-calendar-section" aria-label="Community Calendar">
          <h3>Community Calendar!</h3>
          <CommunityCalendar
            events={feed.events}
            status={feed.status}
            initialMonth={thisMonth}
            firstMonth={firstMonth}
            lastMonth={lastMonth}
          />
        </section>
        <LegacyMarkdown markdown={markdown.slice(calendarEnd)} />
      </> : hasLegacyMembershipForm ? <>
        <LegacyMarkdown markdown={markdown.slice(0, membershipFormStart)} />
        <section className="membership-legacy-handoff" aria-label="Membership application">
          <h2>{key === "join-the-coop-na" ? "Applications are currently closed" : "Explore membership applications"}</h2>
          <p>Preview the membership types, application questions, and joining costs in our new interface. This preview does not submit an application.</p>
          <div>
            <Link className="pill-button" href="/membership">Explore the new membership form</Link>
            <a href={sourcePageUrl(key)} rel="noopener noreferrer">
              {key === "join-the-coop-na" ? "Check the current application status" : "Apply on the current EmpressVR website"}
            </a>
          </div>
        </section>
      </> : <LegacyMarkdown markdown={productMarkdown} />}
      {key === "scheduling" || key === "fun-raiser" || key.startsWith("store__p__") ? (
        <p className="legacy-checkout-note">Booking and payment processing are still handled on the existing website during migration.{" "}
          <a href={sourcePageUrl(key)} rel="noopener noreferrer">Continue on the current EmpressVR site ↗</a>
        </p>
      ) : null}
    </div>
  </article>;
}
