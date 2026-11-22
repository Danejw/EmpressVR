import type { Metadata } from "next";
import Link from "next/link";
import { MediaImage } from "@/components/media-image";
import { getPublishedBlogPosts } from "@/features/blog/public";

export const metadata: Metadata = {
  title: "Blog",
  description: "Stories, ideas and updates from EmpressVR.",
};

export default async function BlogIndex() {
  const posts = await getPublishedBlogPosts();
  return <section className="auth-page blog-public-page"><div className="page-container">
    <div className="auth-dashboard-heading"><div>
      <p className="auth-eyebrow">EmpressVR stories</p>
      <h1>Blog</h1>
      <p>News, creativity and immersive storytelling.</p>
    </div></div>
    {posts.length ? <div className="blog-card-grid">
      {posts.map(post => <article className="blog-card" key={post.id}>
        {post.featured_media_id ? <Link href={"/blog/" + post.slug}>
          <MediaImage assetId={post.featured_media_id} alt={post.title} className="blog-card-image" />
        </Link> : null}
        <div className="blog-card-copy">
          {post.published_at ? <p className="auth-small">{new Date(post.published_at).toLocaleDateString("en-US", { dateStyle: "medium" })}</p> : null}
          <h2><Link href={"/blog/" + post.slug}>{post.title}</Link></h2>
          {post.excerpt ? <p>{post.excerpt}</p> : null}
          <Link className="auth-link" href={"/blog/" + post.slug}>Read article</Link>
        </div>
      </article>)}
    </div> : <p>No articles published yet.</p>}
  </div></section>;
}
