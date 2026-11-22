import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ verified?: string; reset?: string; error?: string; returnTo?:string }>;
}) {
  const params = await searchParams;
  const notice = params.verified === "1" ? "verified"
    : params.reset === "1" ? "reset" : params.error ? "error" : undefined;
  return <section className="auth-page"><div className="page-container">
    <LoginForm notice={notice} returnTo={params.returnTo==="/book"?"/book":undefined} />
  </div></section>;
}
