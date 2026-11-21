import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "New password", robots: { index: false, follow: false } };

export default function ResetPasswordPage() {
  return <section className="auth-page"><div className="page-container">
    <ResetPasswordForm/>
  </div></section>;
}
