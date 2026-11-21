import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const states = {
  success: {
    heading: "Payment successful",
    description: "Once connected to Stripe, confirmed paid orders will appear here after server verification.",
    next: "Return to store",
    href: "/store",
  },
  pending: {
    heading: "Payment pending",
    description: "Some payment methods take longer to complete. An actual order would remain pending until Stripe confirms its status.",
    next: "Return to cart",
    href: "/cart",
  },
  cancelled: {
    heading: "Checkout cancelled",
    description: "An actual cancelled checkout would return here. No payment confirmation is granted by visiting this page.",
    next: "Return to cart",
    href: "/cart",
  },
  error: {
    heading: "Checkout unavailable",
    description: "A real checkout failure would show next steps here. You can return to your cart or use the current EmpressVR store.",
    next: "Return to cart",
    href: "/cart",
  },
} as const;

type State = keyof typeof states;
type Props = { params: Promise<{ state: string }> };
export const dynamicParams = false;
export function generateStaticParams(): { state: State }[] {
  return (Object.keys(states) as State[]).map((state) => ({ state }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params;
  return {
    title: state in states ? states[state as State].heading + " (preview)" : "Checkout",
    robots: { index: false, follow: false },
  };
}

/** Preview-only, deliberately untrusted routes. No query string can assert paid status. */
export default async function CheckoutStatusPreview({ params }: Props) {
  const { state } = await params;
  if (!(state in states)) notFound();
  const info = states[state as State];
  return <section className="commerce-page commerce-status-page">
    <div className="page-container">
      <div className="commerce-status-card">
        <p className="commerce-eyebrow">Example screen</p>
        <h1>{info.heading}</h1>
        <p>{info.description}</p>
        <strong>Preview only. No payment has been processed.</strong>
        <Link className="pill-button" href={info.href}>{info.next}</Link>
        <a href="https://www.empressvr.com/store" rel="noopener noreferrer">
          Visit the current EmpressVR store
        </a>
      </div>
    </div>
  </section>;
}
