import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PageSections } from "@/components/page-sections";
import { ContactForm } from "@/components/contact-form";
import { ArtworkDetail, ProductDetail, StoreCategory } from "@/components/detail-templates";
import { CommunityCalendar } from "@/components/community-calendar";
import { PublishedEvents } from "@/components/published-events";
import { getStoreCatalog } from "@/features/commerce/store-catalog";
import { getPublishedProjects, getPublicTeamMembers, fetchPublishedPageSections } from "@/features/content/supabase-public";
import { cleanLegacyContent, sectionsFromMarkdown } from "@/features/content/page-sections";
import { monthKey, shiftMonth } from "@/features/scheduling/calendar-month";
import { fetchCommunityEvents } from "@/features/scheduling/google-calendar";
import { readLegacyPage, sourcePageUrl } from "@/lib/legacy-pages";

type Props = { params: Promise<{ slug: string[] }> };
const specialPages = new Set(["home", "projects", "who-we-are", "store"]);
const faqMail = "mailto:info@empressvr.com?subject=TechAlchemy%202026%20tickets";

export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const key = slug.join("__");
  const markdown = await readLegacyPage(key);
  const title = markdown?.match(/^#{1,3} (.+)$/m)?.[1]?.replaceAll("*", "") ||
    slug.at(-1)?.replaceAll("-", " ") || "EmpressVR";
  return { title, alternates: { canonical: "/" + slug.join("/") },
    ...(key === "blog" || key === "coming-soon" ? { robots: { index: false, follow: false } } : {}) };
}

function Copy({ markdown, keyName }: { markdown: string; keyName: string }) {
  return <PageSections sections={sectionsFromMarkdown(cleanLegacyContent(keyName, markdown))}/>;
}

export default async function ContentRoute({ params }: Props) {
  const { slug } = await params;
  const key = slug.join("__");
  const original = await readLegacyPage(key);
  if (original === null || specialPages.has(key)) notFound();
  const markdown = cleanLegacyContent(key, original);
  const productSlug = key.startsWith("store__p__") ? key.slice("store__p__".length) : null;
  const products = productSlug || key === "store__masks" ? await getStoreCatalog() : [];
  const product = productSlug ? products.find(item => item.slug === productSlug) : undefined;
  if (productSlug && !product) notFound();

  if (product) return <article className="legacy-page"><div className="page-container">
    <ProductDetail product={product} markdown={original}/>
  </div></article>;
  if (key === "store__masks") return <article className="legacy-page"><div className="page-container">
    <StoreCategory products={products}/>
  </div></article>;
  if (key === "projects-digital-2d-art" || key === "projects-metalwork") return (
    <article className="legacy-page"><div className="page-container">
      <ArtworkDetail keyName={key} markdown={original}/>
    </div></article>);

  const project = (await getPublishedProjects()).find(item => item.slug === key);
  const team = (await getPublicTeamMembers()).find(item => item.slug === key);
  const isDetail = Boolean(project || team);
  const detailName = project?.title ?? team?.name;
  const copy = detailName && markdown.replace(new RegExp("^#{1,3}\\s+" +
    detailName.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") + "\\s*$", "im"), "").trim() || markdown;

  // Calendar and membership are real React experiences; source captures never become widgets.
  const calendarHeading = "### Community Calendar!";
  const nextHeading = "# Building a Global Community";
  const calendarStart = key === "community" ? copy.indexOf(calendarHeading) : -1;
  const calendarEnd = calendarStart >= 0 ? copy.indexOf(nextHeading, calendarStart) : -1;
  const hasCalendar = calendarStart >= 0 && calendarEnd > calendarStart;
  const membershipFormHeading = key === "join-the-coop" ? "# Applications Are Open!" :
    key === "join-the-coop-na" ? "# Applications Are Currently Closed" : null;
  const membershipStart = membershipFormHeading ? copy.indexOf(membershipFormHeading) :
    key === "join-the-community" ? copy.indexOf("\nName\n") : -1;
  const firstMonth = shiftMonth(monthKey(), -3);
  const lastMonth = shiftMonth(monthKey(), 12);
  const [startYear,startMonth] = firstMonth.split("-").map(Number);
  const [endYear,endMonth] = lastMonth.split("-").map(Number);
  const feed = hasCalendar ? await fetchCommunityEvents(
    new Date(Date.UTC(startYear, startMonth - 1, 0)),
    new Date(Date.UTC(endYear, endMonth, 2)),
  ) : { status: "unconfigured" as const, events: [] };
  const storedSections = !hasCalendar && membershipStart < 0 && !isDetail && key !== "about" &&
    key !== "fun-raiser" && key !== "techalchemy26" && key !== "education"
      ? await fetchPublishedPageSections(key) : null;

  return <article className="legacy-page">
    <div className="page-container">
      {isDetail ? <div className="detail-heading">
        <Link className="detail-back" href={project ? "/projects" : "/who-we-are"}>
          ← Back to {project ? "Projects" : "Who We Are"}
        </Link>
        <h1>{detailName}</h1>
        {project?.subtitle ? <p>{project.subtitle}</p> : null}
      </div> : null}
      {key === "scheduling" ? <div className="booking-preview-link">
        <Link className="pill-button" href="/book">Explore the new booking calendar</Link>
        <a href={sourcePageUrl(key)} rel="noopener noreferrer">Book on the current EmpressVR website</a>
      </div> : null}
      {key === "fun-raiser" ? <div className="content-cta">
        <a className="pill-button" href={sourcePageUrl(key)} rel="noopener noreferrer">Donate on the current EmpressVR site</a>
      </div> : null}
      {key === "techalchemy26" ? <>
        <Copy markdown={copy.slice(0, copy.indexOf("### Exhibition Map"))} keyName={key}/>
        <div className="content-cta"><a className="pill-button" href={faqMail}>
          Ask about TechAlchemy tickets
        </a></div>
        <Copy markdown={copy.slice(copy.indexOf("### Exhibition Map"))} keyName={key}/>
        <div className="content-cta"><Link className="pill-button" href="/fun-raiser">Support EmpressVR</Link></div>
      </> : key === "about" ? (() => {
        const contact = copy.indexOf("## Contact us.");
        const supporters = copy.indexOf("Gratitude for Our Early Supporters", contact);
        return contact >= 0 && supporters >= 0 ? <>
          <Copy markdown={copy.slice(0, supporters)} keyName={key}/>
          <ContactForm/>
          <Copy markdown={copy.slice(supporters)} keyName={key}/>
        </> : <><Copy markdown={copy} keyName={key}/><ContactForm/></>;
      })() : hasCalendar ? <>
        <Copy markdown={copy.slice(0, calendarStart)} keyName={key}/>
        <section className="community-calendar-section" aria-label="Community Calendar">
          <h3>Community Calendar!</h3>
          <CommunityCalendar events={feed.events} status={feed.status} initialMonth={monthKey()}
            firstMonth={firstMonth} lastMonth={lastMonth}/>
        </section>
        <Copy markdown={copy.slice(calendarEnd)} keyName={key}/>
      </> : membershipStart >= 0 ? <>
        <Copy markdown={copy.slice(0, membershipStart)} keyName={key}/>
        <section className="membership-legacy-handoff" aria-label="Membership application">
          <h2>Explore membership applications</h2>
          <p>The new form is a preview and does not submit an application.</p>
          <Link className="pill-button" href="/membership">Explore membership options</Link>
          <p><a href={sourcePageUrl(key)} rel="noopener noreferrer">Apply on the current EmpressVR site</a></p>
        </section>
      </> : storedSections
        ? <PageSections sections={storedSections}/>
        : <PageSections sections={sectionsFromMarkdown(copy)}/>}
      {key === "community" ? <PublishedEvents/> : null}
      {(key === "scheduling" || key.startsWith("store__p__")) ? (
        <p className="legacy-checkout-note">Bookings and payments are still handled on the current website.
          {" "}<a href={sourcePageUrl(key)} rel="noopener noreferrer">Continue on the current EmpressVR site</a>
        </p>
      ) : null}
    </div>
  </article>;
}
