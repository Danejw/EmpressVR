import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegacyMarkdown } from "@/components/legacy-markdown";
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
  const markdown = await readLegacyPage(slug.join("__"));
  const title = markdown?.match(/^#{1,3} (.+)$/m)?.[1]?.replaceAll("*", "") || slug.at(-1)?.replaceAll("-", " ") || "EmpressVR";
  return { title, alternates: { canonical: "/" + slug.join("/") } };
}

export default async function ArchivedPage({ params }: Props) {
  const { slug } = await params;
  const key = slug.join("__");
  const markdown = await readLegacyPage(key);
  if (!markdown || specialPages.has(key)) notFound();

  return <article className="legacy-page">
    <div className="page-container">
      {key === "scheduling" || key === "fun-raiser" ? <p className="legacy-checkout-note"><a href={sourcePageUrl(key)} rel="noopener noreferrer">Continue booking or donating on the existing EmpressVR site ↗</a></p> : null}
      <LegacyMarkdown markdown={markdown} />
      {key === "scheduling" || key === "fun-raiser" || key.startsWith("store__p__") ? (
        <p className="legacy-checkout-note">Booking and payment processing are still handled on the existing website during migration.{" "}
          <a href={sourcePageUrl(key)} rel="noopener noreferrer">Continue on the current EmpressVR site ↗</a>
        </p>
      ) : null}
    </div>
  </article>;
}
