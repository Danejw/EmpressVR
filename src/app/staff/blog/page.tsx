import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";

export const metadata: Metadata = { title: "Manage blog", robots: { index: false, follow: false } };

export default async function ManageBlog() {
  const { auth } = await requireStaff();
  const { data: posts, error } = await auth.from("blog_posts")
    .select("id,title,slug,status,updated_at,published_at")
    .order("updated_at", { ascending: false });
  return <section className="auth-page"><div className="page-container auth-dashboard">
    <div className="auth-dashboard-heading">
      <div><p className="auth-eyebrow"><Link href="/staff">Dashboard</Link> / Blog</p>
        <h1>Blog posts</h1>
        <p>Create, edit and publish news and stories.</p></div>
      <Link className="pill-button" href="/staff/blog/new">New post</Link>
    </div>
    {error ? <p className="auth-error" role="alert">Unable to load posts. Please try again.</p> :
      !posts?.length ? <div className="auth-panel"><h2>No posts yet</h2>
        <p>Create the first EmpressVR blog post.</p>
        <Link className="auth-link" href="/staff/blog/new">Write a post</Link>
      </div> : <div className="auth-panel">
        <div className="cms-list">
          {posts.map(post => <div className="cms-list-row" key={post.id}>
            <div>
              <Link href={"/staff/blog/" + post.id}><strong>{post.title}</strong></Link>
              <p className="auth-small">/blog/{post.slug} · {post.status}</p>
            </div>
            <Link href={"/staff/blog/" + post.id} className="auth-link">Edit</Link>
          </div>)}
        </div>
      </div>}
    <Link className="auth-link" href="/blog">View public blog</Link>
  </div></section>;
}
