import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
export const metadata: Metadata = { title: "Manage team", robots: { index: false, follow: false } };
export default async function StaffTeam() {
  const { auth } = await requireStaff();
  const { data, error } = await auth.from("team_members")
    .select("id,name,slug,group_name,roles").order("sort_order");
  return <section className="auth-page"><div className="page-container auth-dashboard">
    <div className="auth-dashboard-heading"><div>
      <p className="auth-eyebrow"><Link href="/staff">Dashboard</Link> / Team</p>
      <h1>Team</h1></div><Link className="pill-button" href="/staff/team/new">+ New profile</Link>
    </div>
    {error ? <p role="alert" className="auth-error">Unable to load team profiles.</p> :
      !data?.length ? <div className="auth-panel"><p>No team profiles yet.</p></div> :
      <div className="auth-panel cms-list">{data.map(item =>
        <div key={item.id} className="cms-list-row"><div>
          <Link href={"/staff/team/" + item.id}><strong>{item.name}</strong></Link>
          <p className="auth-small">{item.group_name} · {(item.roles as string[]).join(", ")}</p>
        </div><Link className="auth-link" href={"/staff/team/" + item.id}>Edit</Link></div>)}</div>}
  </div></section>;
}
