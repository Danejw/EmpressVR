import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "Create account", robots: { index: false, follow: false } };

export default function SignupPage() {
  return <section className="auth-page"><div className="page-container">
    <SignupForm />
  </div></section>;
}
