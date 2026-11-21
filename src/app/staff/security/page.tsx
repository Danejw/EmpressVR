import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/auth/server";
import { StaffMfa } from "@/components/auth/staff-mfa";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata: Metadata = { title: "Staff security", robots: { index: false, follow: false } };

export default async function StaffSecurity() {
  const auth = await getServerAuth();
  if (!auth) redirect("/login");
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await auth.from("staff_roles")
    .select("role").eq("user_id", user.id).maybeSingle();
  if (role?.role !== "admin" && role?.role !== "editor") redirect("/account");
  const { data: assurance } = await auth.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.currentLevel === "aal2") redirect("/staff");
  return <section className="auth-page"><div className="page-container">
    <StaffMfa />
    <div className="auth-signout"><SignOutButton /></div>
  </div></section>;
}
