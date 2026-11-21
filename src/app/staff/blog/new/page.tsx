import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/staff";
import { BlogEditor } from "@/components/auth/blog-editor";
import { getBlogEditorOptions } from "@/features/blog/editor-data";

export const metadata: Metadata = { title: "New blog post", robots: { index: false, follow: false } };

export default async function NewBlogPost() {
  const { auth } = await requireStaff();
  const options = await getBlogEditorOptions(auth);
  return <section className="auth-page"><div className="page-container">
    <BlogEditor authors={options.authors} images={options.images} />
  </div></section>;
}
