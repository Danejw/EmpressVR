import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
export const metadata: Metadata = { title: "Manage projects", robots: { index: false, follow: false } };
export default async function StaffProjects() {
  const { auth } = await requireStaff();
  const { data, error } = await auth.from("projects")
    .select("id,title,slug,status,sort_order").order("sort_order");
  return <section className="auth-page"><div className="page-container auth-dashboard">
    <div className="auth-dashboard-heading"><div>
      <p className="auth-eyebrow"><Link href="/staff">Dashboard</Link> / Projects</p>
      <h1>Projects</h1></div><Link className="pill-button" href="/staff/projects/new">+ New project</Link>
    </div>
    {error ? <p role="alert" className="auth-error">Unable to load projects.</p> :
      !data?.length ? <div className="auth-panel"><p>No projects yet.</p></div> :
      <div className="auth-panel cms-list">{data.map(item =>
        <div key={item.id} className="cms-list-row"><div>
          <Link href={"/staff/projects/" + item.id}><strong>{item.title}</strong></Link>
          <p className="auth-small">{item.status} · /projects/{item.slug}</p>
        </div><Link className="auth-link" href={"/staff/projects/" + item.id}>Edit</Link></div>)}</div>}
  </div></section>;
}
