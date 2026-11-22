import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MediaImage } from "@/components/media-image";
import { LegacyMarkdown } from "@/components/legacy-markdown";
import { getPublishedBlogPost } from "@/features/blog/public";
import { getPublicTeamMembers } from "@/features/content/supabase-public";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) return { title: "Article not found" };
  return {
    title: post.title, description: post.excerpt || undefined,
    alternates: { canonical: "/blog/" + post.slug },
    openGraph: { type: "article", title: post.title, description: post.excerpt || undefined },
  };
}

export default async function BlogArticle({ params }: Props) {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) notFound();
  const members = post.author_id ? await getPublicTeamMembers() : [];
  const author = members.find(member => member.id === post.author_id);
  return <article className="auth-page blog-article"><div className="page-container">
    <Link className="auth-link" href="/blog">All blog posts</Link>
    <header>
      <p className="auth-eyebrow">EmpressVR blog</p>
      <h1>{post.title}</h1>
      {post.published_at ? <p className="auth-small">Published {new Date(post.published_at).toLocaleDateString("en-US", { dateStyle: "long" })}{author ? " · " + author.name : ""}</p> : null}
      {post.excerpt ? <p className="blog-intro">{post.excerpt}</p> : null}
    </header>
    {post.featured_media_id ? <MediaImage assetId={post.featured_media_id} alt={post.title} className="blog-hero-image"/> : null}
    <LegacyMarkdown markdown={post.body_markdown}/>
  </div></article>;
}
