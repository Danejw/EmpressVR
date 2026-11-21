import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/auth/server";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createStaffInvitation, revokeStaffInvitation } from "@/app/auth/actions";
import { isStaffRole } from "@/lib/auth/permissions";

export const metadata: Metadata = { title: "Staff workspace", robots: { index: false, follow: false } };

export default async function StaffPage({
  searchParams,
}: { searchParams: Promise<{ invite?: string }> }) {
  const auth = await getServerAuth();
  if (!auth) redirect("/login");
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");
  const { data: staff } = await auth.from("staff_roles")
    .select("role").eq("user_id", user.id).maybeSingle();
  if (!isStaffRole(staff?.role)) redirect("/account");
  const { data: assurance } = await auth.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.currentLevel !== "aal2") redirect("/staff/security");
  const { invite } = await searchParams;
  const { data: invitations } = staff.role === "admin"
    ? await auth.from("staff_invitations")
        .select("email,role,expires_at,accepted_at")
        .is("accepted_at", null).order("created_at", { ascending: false }).limit(25)
    : { data: [] };

  return <section className="auth-page"><div className="page-container auth-dashboard">
    <div className="auth-dashboard-heading">
      <div><p className="auth-eyebrow">Staff workspace</p>
        <h1>EmpressVR administration</h1>
        <p>Signed in as {user.email} · {staff.role}</p>
      </div><SignOutButton />
    </div>
    <div className="auth-dashboard-grid">
      <section className="auth-panel">
        <h2>Content administration</h2>
        <p>Secure staff access is enabled. Content editing and publishing are planned for EVR-17.</p>
        <Link className="auth-link" href="/account">My account</Link>
      </section>
      <section className="auth-panel">
        <h2>Access control</h2>
        <p>Role verified from Supabase. Authenticator-app MFA is active.</p>
        <Link className="auth-link" href="/staff/security">Security settings</Link>
      </section>
    </div>
    {staff.role === "admin" ? <section className="auth-panel">
      <h2>Invite staff</h2>
      <p className="auth-small">Assign an existing or future login to a staff role. Invitations expire after seven days.
        Send the person the <Link className="auth-link" href="/login">login page</Link> yourself; no invitation email is sent yet.</p>
      {invite === "created" ? <p className="auth-message" role="status">Invitation created.</p> : null}
      {invite === "revoked" ? <p className="auth-message" role="status">Invitation revoked.</p> : null}
      {invite === "error" || invite === "invalid" ?
        <p className="auth-error" role="alert">Invitation could not be saved. Check for an existing invitation.</p> : null}
      <form className="auth-form auth-invite-form" action={createStaffInvitation}>
        <label htmlFor="staff-email">Staff email</label>
        <input id="staff-email" name="email" type="email" required maxLength={254} placeholder="staff@example.com" />
        <label htmlFor="staff-role">Role</label>
        <select id="staff-role" name="role" defaultValue="editor">
          <option value="editor">Editor</option>
          <option value="admin">Administrator</option>
        </select>
        <button className="pill-button" type="submit">Create invitation</button>
      </form>
      {invitations?.length ? <div className="auth-invitations">
        <h3>Pending invitations</h3>
        {invitations.map(item=><div className="auth-invitation" key={item.email}>
          <span>{item.email} · {item.role}</span>
          <form action={revokeStaffInvitation}>
            <input type="hidden" name="email" value={item.email} />
            <button type="submit" className="auth-text-button">Revoke</button>
          </form>
        </div>)}
      </div> : null}
    </section> : null}
  </div></section>;
}
