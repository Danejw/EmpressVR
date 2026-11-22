import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { createStaffInvitation, revokeStaffInvitation } from "@/app/auth/actions";

export const metadata: Metadata = { title: "Staff dashboard", robots: { index: false, follow: false } };

export default async function StaffDashboard({
  searchParams,
}: { searchParams: Promise<{ invite?: string }> }) {
  const { auth, user, role } = await requireStaff();
  const [{ count }, { count: projectCount }, { count: teamCount }, { count: eventCount }, { count: bookingCount }, { data: invitations }] = await Promise.all([
    auth.from("blog_posts").select("id", { count: "exact", head: true }),
    auth.from("projects").select("id", { count: "exact", head: true }),
    auth.from("team_members").select("id", { count: "exact", head: true }),
    auth.from("events").select("id", { count: "exact", head: true }),
    role === "admin" ? auth.from("bookings").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: null }),
    role === "admin" ? auth.from("staff_invitations")
      .select("email,role,expires_at,accepted_at")
      .is("accepted_at", null).order("created_at", { ascending: false }).limit(25) :
      Promise.resolve({ data: [] }),
  ]);
  const { invite } = await searchParams;
  return <section className="auth-page"><div className="page-container auth-dashboard">
    <div className="auth-dashboard-heading">
      <div><p className="auth-eyebrow">Staff workspace</p>
        <h1>Dashboard</h1>
        <p>Signed in as {user.email} · {role === "admin" ? "Administrator" : "Editor"}</p>
      </div><SignOutButton />
    </div>
    <nav className="cms-dashboard-list" aria-label="Content management">
      <div className="cms-dashboard-row">
        <Link href="/staff/blog" className="cms-dashboard-link">
          <strong>Blog</strong>
          <span>{count ?? 0} posts</span>
        </Link>
        <Link href="/staff/blog/new" className="cms-dashboard-add" aria-label="Create blog post" title="Create blog post">+</Link>
      </div>
      <div className="cms-dashboard-row">
        <Link href="/staff/projects" className="cms-dashboard-link">
          <strong>Projects</strong><span>{projectCount ?? 0} projects</span>
        </Link>
        <Link href="/staff/projects/new" className="cms-dashboard-add" aria-label="Create project" title="Create project">+</Link>
      </div>
      <div className="cms-dashboard-row">
        <Link href="/staff/team" className="cms-dashboard-link">
          <strong>Team</strong><span>{teamCount ?? 0} profiles</span>
        </Link>
        <Link href="/staff/team/new" className="cms-dashboard-add" aria-label="Create team profile" title="Create team profile">+</Link>
      </div>
      <div className="cms-dashboard-row">
        <Link href="/staff/events" className="cms-dashboard-link">
          <strong>Events</strong><span>{eventCount ?? 0} events</span>
        </Link>
        <Link href="/staff/events" className="cms-dashboard-add"
          aria-label="Manage events" title="Manage events">›</Link>
      </div>
      {role === "admin" ? <div className="cms-dashboard-row">
        <Link href="/staff/bookings" className="cms-dashboard-link">
          <strong>Bookings</strong><span>{bookingCount ?? 0} reservations</span>
        </Link>
      </div> : null}
    </nav>
    <Link href="/staff/security" className="auth-link">Account security</Link>
    {role === "admin" ? <details className="cms-dashboard-invitations" open={Boolean(invite)}>
      <summary>Staff invitations</summary>
      <div className="auth-panel">
      <p className="auth-small">Invite an editor or administrator. Invitations expire after seven days.
        Share the <Link className="auth-link" href="/login">sign-in page</Link> with the invited person.</p>
      {invite === "created" ? <p className="auth-message" role="status">Invitation created.</p> : null}
      {invite === "revoked" ? <p className="auth-message" role="status">Invitation revoked.</p> : null}
      {invite === "error" || invite === "invalid" ?
        <p className="auth-error" role="alert">Unable to save the invitation. Check for duplicates.</p> : null}
      <form className="auth-form auth-invite-form" action={createStaffInvitation}>
        <label htmlFor="staff-email">Email address</label>
        <input id="staff-email" name="email" type="email" required maxLength={254} placeholder="staff@example.com"/>
        <label htmlFor="staff-role">Role</label>
        <select id="staff-role" name="role" defaultValue="editor">
          <option value="editor">Editor</option>
          <option value="admin">Administrator</option>
        </select>
        <button type="submit" className="pill-button">Create invitation</button>
      </form>
      {invitations?.length ? <div className="auth-invitations">
        <h3>Pending invitations</h3>
        {invitations.map(item => <div key={item.email} className="auth-invitation">
          <span>{item.email} · {item.role}</span>
          <form action={revokeStaffInvitation}>
            <input type="hidden" name="email" value={item.email}/>
            <button className="auth-text-button" type="submit">Revoke</button>
          </form>
        </div>)}
      </div> : null}
      </div>
    </details> : null}
  </div></section>;
}
