import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageSections } from "@/components/page-sections";
import { CommunityCalendar } from "@/components/community-calendar";
import { PublishedEvents } from "@/components/published-events";
import { cleanLegacyContent, sectionsFromMarkdown } from "@/features/content/page-sections";
import { monthKey, shiftMonth } from "@/features/scheduling/calendar-month";
import { getPublishedEvents, publicReadConfig } from "@/features/content/supabase-public";
import { toCalendarEvent } from "@/features/events/calendar-adapter";
import type { PublicCalendarEvent } from "@/features/scheduling/calendar-month";
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
  // Supabase is the canonical event catalogue. Google Calendar integration is
  // deferred to a separately authorized one-way synchronization adapter.
  const rows = start >= 0 && end > start ? await getPublishedEvents() : [];
  const events = rows.map(toCalendarEvent)
    .filter((item): item is PublicCalendarEvent => item !== null);
  const config = publicReadConfig();
  const status = config.staticPreview || !config.url || !config.publishableKey
    ? "unconfigured" as const : "connected" as const;
  return <article className="legacy-page"><div className="page-container">
    <PageSections sections={sectionsFromMarkdown(start >= 0 && end > start ? markdown.slice(0,start) : markdown)}/>
    {start >= 0 && end > start ? <>
      <section className="community-calendar-section" aria-label="Community Calendar">
        <h2>Community Calendar!</h2>
        <CommunityCalendar events={events} status={status} initialMonth={month}
          firstMonth={firstMonth} lastMonth={lastMonth}/>
      </section>
      <PageSections sections={sectionsFromMarkdown(markdown.slice(end))}/>
    </> : null}
    <PublishedEvents/>
  </div></article>;
}
