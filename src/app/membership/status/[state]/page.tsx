import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const examples = {
  pending: {
    title: "Application pending review",
    text: "Once the service is connected, submitted applications will be pending until reviewed by Empress Immersive.",
  },
  approved: {
    title: "Application approved",
    text: "An authorized co-operative reviewer must approve an application. Payment alone never grants membership or voting rights.",
  },
  rejected: {
    title: "Application not approved",
    text: "If an application is declined, the actual outcome and next steps will be communicated through the official process.",
  },
  withdrawn: {
    title: "Application withdrawn",
    text: "A withdrawal must be recorded by the authorized application service. Opening this page cannot change an application.",
  },
} as const;
type State = keyof typeof examples;
type Props = { params: Promise<{ state: string }> };

export const dynamicParams = false;
export function generateStaticParams(): Array<{ state: State }> {
  return (Object.keys(examples) as State[]).map((state) => ({ state }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params;
  return { title: state in examples ? examples[state as State].title + " (example)" : "Membership",
    robots: { index: false, follow: false } };
}

export default async function MembershipStatusExample({ params }: Props) {
  const { state } = await params;
  if (!(state in examples)) notFound();
  const example = examples[state as State];
  return <section className="membership-page membership-status-page">
    <div className="page-container"><div className="commerce-status-card">
      <p className="commerce-eyebrow">Example application status</p>
      <h1>{example.title}</h1>
      <p>{example.text}</p>
      <strong>Preview only. No application was submitted or retrieved.</strong>
      <Link className="pill-button" href="/membership">Back to membership options</Link>
    </div></div>
  </section>;
}
