import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LegacyMarkdown } from "@/components/legacy-markdown";
import { CommunityCalendar } from "@/components/community-calendar";
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

  // Preserve the archived community copy while replacing the captured, nonfunctional
  // Squarespace calendar table with a live Google-backed calendar display.
  const calendarHeading = "### Community Calendar!";
  const nextHeading = "# Building a Global Community";
  const calendarStart = key === "community" ? markdown.indexOf(calendarHeading) : -1;
  const calendarEnd = calendarStart >= 0 ? markdown.indexOf(nextHeading, calendarStart) : -1;
  const hasCalendar = calendarStart >= 0 && calendarEnd > calendarStart;
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
      </> : <LegacyMarkdown markdown={markdown} />}
      {key === "scheduling" || key === "fun-raiser" || key.startsWith("store__p__") ? (
        <p className="legacy-checkout-note">Booking and payment processing are still handled on the existing website during migration.{" "}
          <a href={sourcePageUrl(key)} rel="noopener noreferrer">Continue on the current EmpressVR site ↗</a>
        </p>
      ) : null}
    </div>
  </article>;
}
