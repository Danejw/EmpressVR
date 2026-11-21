export type BlogStatus = "draft" | "published";
export type BlogInput = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body_markdown: string;
  featured_media_id: string | null;
  author_id: string | null;
  status: BlogStatus;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return input.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 96).replace(/-$/, "");
}

export function validateBlogInput(value: unknown): { data?: BlogInput; error?: string } {
  if (!value || typeof value !== "object") return { error: "Invalid post." };
  const v = value as Record<string, unknown>;
  if (v.id !== undefined && (typeof v.id !== "string" || !uuid.test(v.id)))
    return { error: "Invalid post ID." };
  if (typeof v.title !== "string" || !v.title.trim() || v.title.trim().length > 160)
    return { error: "Enter a title (up to 160 characters)." };
  if (typeof v.slug !== "string" || v.slug.length > 96 || !slugPattern.test(v.slug))
    return { error: "Enter a URL slug using lowercase letters, numbers and hyphens." };
  if (typeof v.excerpt !== "string" || v.excerpt.length > 400)
    return { error: "Keep the excerpt under 400 characters." };
  if (typeof v.body_markdown !== "string" || v.body_markdown.length > 100000)
    return { error: "Article body is too long." };
  if (v.status !== "draft" && v.status !== "published")
    return { error: "Invalid publication state." };
  if (v.status === "published" && !v.body_markdown.trim())
    return { error: "Add article content before publishing." };
  if (v.featured_media_id !== null && v.featured_media_id !== undefined &&
      (typeof v.featured_media_id !== "string" || !uuid.test(v.featured_media_id)))
    return { error: "Invalid cover image." };
  if (v.author_id !== null && v.author_id !== undefined &&
      (typeof v.author_id !== "string" || !uuid.test(v.author_id)))
    return { error: "Invalid author." };

  return { data: {
    ...(v.id ? { id: v.id as string } : {}),
    title: v.title.trim(), slug: v.slug,
    excerpt: v.excerpt.trim(), body_markdown: v.body_markdown,
    featured_media_id: (v.featured_media_id ?? null) as string | null,
    author_id: (v.author_id ?? null) as string | null,
    status: v.status,
  }};
}
