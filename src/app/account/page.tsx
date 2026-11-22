import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/auth/server";
import { createMemberProfile, updateDisplayName } from "@/app/auth/actions";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function AccountPage({
  searchParams,
}: { searchParams: Promise<{ status?: string }> }) {
  const auth = await getServerAuth();
  if (!auth) redirect("/login");
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (!user || authError) redirect("/login");

  const [{ data: customer }, { data: staff }] = await Promise.all([
    auth.from("customers").select("id,display_name,contact_email").eq("user_id", user.id).maybeSingle(),
    auth.from("staff_roles").select("role").eq("user_id", user.id).maybeSingle(),
  ]);
  const [{ data: memberships }, { data: applications }] = customer
    ? await Promise.all([
      auth.from("memberships").select("status,approved_at").eq("customer_id", customer.id),
      auth.from("membership_applications").select("kind,status,submitted_at").eq("customer_id", customer.id),
    ]) : [{ data: [] }, { data: [] }];
  const active = memberships?.some(member => member.status === "active") ?? false;
  const latestApplication = applications?.at(-1);
  const { status } = await searchParams;

  return <section className="auth-page"><div className="page-container auth-dashboard">
    <div className="auth-dashboard-heading">
      <div><p className="auth-eyebrow">My account</p><h1>Welcome to EmpressVR</h1></div>
      <SignOutButton />
    </div>
    {status === "updated" ? <p role="status" className="auth-message">Profile updated.</p> : null}
    {status === "error" || status === "invalid" ?
      <p role="alert" className="auth-error">Unable to save that change. Try again.</p> : null}
    <p><Link className="auth-link" href="/account/bookings">View my reservations</Link></p>
    <div className="auth-dashboard-grid">
      <section className="auth-panel">
        <h2>Your profile</h2>
        <p><strong>Email:</strong> {user.email}</p>
        {customer ? <form className="auth-form" action={updateDisplayName}>
          <label htmlFor="display_name">Display name</label>
          <input id="display_name" name="display_name" maxLength={200}
            defaultValue={customer.display_name ?? ""} placeholder="Name" />
          <button type="submit" className="pill-button">Save profile</button>
        </form> : <form action={createMemberProfile}>
          <p>Your profile is not set up yet.</p>
          <button className="pill-button" type="submit">Create profile</button>
        </form>}
      </section>
      <section className="auth-panel">
        <h2>Membership</h2>
        <p><strong>Status:</strong> {active ? "Active member" :
          latestApplication ? "Application " + latestApplication.status : "No approved membership"}</p>
        <p className="auth-small">Creating an account does not automatically approve a membership.</p>
        <Link className="auth-link" href="/membership">Explore memberships</Link>
      </section>
    </div>
    {staff?.role === "admin" || staff?.role === "editor" ?
      <div className="auth-panel"><h2>Staff access</h2>
        <p>Your assigned role is <strong>{staff.role}</strong>.</p>
        <Link className="pill-button" href="/staff">Open staff workspace</Link>
      </div> : null}
  </div></section>;
}
