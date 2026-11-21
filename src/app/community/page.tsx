import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageSections } from "@/components/page-sections";
import { CommunityCalendar } from "@/components/community-calendar";
import { PublishedEvents } from "@/components/published-events";
import { cleanLegacyContent, sectionsFromMarkdown } from "@/features/content/page-sections";
import { monthKey, shiftMonth } from "@/features/scheduling/calendar-month";
import { fetchCommunityEvents } from "@/features/scheduling/google-calendar";
import { readLegacyPage } from "@/lib/legacy-pages";

export const metadata: Metadata = { title: "Community" };

export default async function Community() {
  const raw = await readLegacyPage("community");
  if (raw === null) notFound();
  const markdown = cleanLegacyContent("community", raw);
  const start = markdown.indexOf("### Community Calendar!");
  const end = start >= 0 ? markdown.indexOf("## Building a Global Community", start) : -1;
  const month = monthKey();
  const firstMonth = shiftMonth(month, -3);
  const lastMonth = shiftMonth(month, 12);
  const [sy,sm] = firstMonth.split("-").map(Number);
  const [ey,em] = lastMonth.split("-").map(Number);
  const feed = start >= 0 && end > start ? await fetchCommunityEvents(
    new Date(Date.UTC(sy, sm-1, 0)), new Date(Date.UTC(ey, em, 2)),
  ) : { status: "unconfigured" as const, events: [] };
  return <article className="legacy-page"><div className="page-container">
    <PageSections sections={sectionsFromMarkdown(start >= 0 && end > start ? markdown.slice(0,start) : markdown)}/>
    {start >= 0 && end > start ? <>
      <section className="community-calendar-section" aria-label="Community Calendar">
        <h2>Community Calendar!</h2>
        <CommunityCalendar events={feed.events} status={feed.status} initialMonth={month}
          firstMonth={firstMonth} lastMonth={lastMonth}/>
      </section>
      <PageSections sections={sectionsFromMarkdown(markdown.slice(end))}/>
    </> : null}
    <PublishedEvents/>
  </div></article>;
}
