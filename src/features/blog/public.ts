import "server-only";
import { publicReadConfig } from "@/features/content/supabase-public";

export type PublishedBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body_markdown: string;
  published_at: string | null;
  featured_media_id: string | null;
  author_id: string | null;
};

async function publishedBlogQuery(params: Record<string, string>): Promise<PublishedBlogPost[]> {
  const config = publicReadConfig();
  if (!config.url || !config.publishableKey || config.staticPreview) return [];
  try {
    const endpoint = new URL("/rest/v1/blog_posts", config.url);
    endpoint.searchParams.set("select", "id,slug,title,excerpt,body_markdown,published_at,featured_media_id,author_id");
    endpoint.searchParams.set("status", "eq.published");
    endpoint.searchParams.set("order", "published_at.desc");
    for (const [key, value] of Object.entries(params)) endpoint.searchParams.set(key, value);
    const response = await fetch(endpoint, {
      headers: { apikey: config.publishableKey, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    return Array.isArray(data) ? data as PublishedBlogPost[] : [];
  } catch { return []; }
}

export function getPublishedBlogPosts() {
  return publishedBlogQuery({ limit: "50" });
}

export async function getPublishedBlogPost(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 96) return null;
  const rows = await publishedBlogQuery({ slug: "eq." + slug, limit: "1" });
  return rows[0] ?? null;
}
