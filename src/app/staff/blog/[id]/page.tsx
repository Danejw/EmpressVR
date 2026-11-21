import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { BlogEditor, type EditableBlog } from "@/components/auth/blog-editor";
import { getBlogEditorOptions } from "@/features/blog/editor-data";

export const metadata: Metadata = { title: "Edit blog post", robots: { index: false, follow: false } };

export default async function EditBlogPost({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { auth } = await requireStaff();
  const [{ data: post }, options] = await Promise.all([
    auth.from("blog_posts")
      .select("id,title,slug,excerpt,body_markdown,status,featured_media_id,author_id,published_at")
      .eq("id", id).maybeSingle(),
    getBlogEditorOptions(auth),
  ]);
  if (!post) notFound();
  return <section className="auth-page"><div className="page-container">
    <BlogEditor initial={post as EditableBlog} authors={options.authors} images={options.images}/>
  </div></section>;
}
