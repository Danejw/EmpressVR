"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/staff";
import { validateBlogInput } from "@/features/blog/validation";

export type SaveResult = { ok: true; id: string; status: string } | { ok: false; error: string };

export async function saveBlogPost(value: unknown): Promise<SaveResult> {
  const { data, error: validationError } = validateBlogInput(value);
  if (!data) return { ok: false, error: validationError ?? "Invalid post." };
  const { auth, user } = await requireStaff();

  let previous: { slug: string; published_at: string | null } | null = null;
  if (data.id) {
    const { data: existing, error } = await auth.from("blog_posts")
      .select("id,slug,published_at").eq("id", data.id).maybeSingle();
    if (error || !existing) return { ok: false, error: "That post could not be found." };
    previous = existing;
    // Preserve public permalinks after first publication.
    if (existing.published_at && existing.slug !== data.slug)
      return { ok: false, error: "A published post's URL cannot be changed." };
  }

  const now = new Date().toISOString();
  const fields = {
    title: data.title, slug: data.slug, excerpt: data.excerpt,
    body_markdown: data.body_markdown, featured_media_id: data.featured_media_id,
    author_id: data.author_id, status: data.status,
    published_at: previous?.published_at ?? (data.status === "published" ? now : null),
    updated_at: now, updated_by: user.id,
  };

  const result = data.id
    ? await auth.from("blog_posts").update(fields).eq("id", data.id).select("id").single()
    : await auth.from("blog_posts").insert({ ...fields, created_by: user.id })
      .select("id").single();

  if (result.error || !result.data) {
    const duplicate = result.error?.code === "23505";
    return { ok: false, error: duplicate ? "That URL slug is already in use." : "Could not save the post. Check your staff permissions and try again." };
  }

  revalidatePath("/blog");
  revalidatePath("/blog/" + data.slug);
  if (previous?.slug && previous.slug !== data.slug) revalidatePath("/blog/" + previous.slug);
  revalidatePath("/staff");
  revalidatePath("/staff/blog");
  revalidatePath("/staff/blog/" + result.data.id);
  return { ok: true, id: result.data.id, status: data.status };
}
