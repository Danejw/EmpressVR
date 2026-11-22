import { slugify } from "@/features/blog/validation";

export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type State = "draft" | "published" | "archived";
type Group = "current" | "other" | "past";
type Result<T> = { data: T; error?: never } | { data?: never; error: string };

export type ProjectInput = {
  id?: string; title: string; slug: string; subtitle: string; status: State;
  featured_media_id: string | null; sort_order: number; gallery_media_ids: string[];
  page_body_markdown: string;
};
export type TeamInput = {
  id?: string; name: string; slug: string; external_url: string | null;
  roles: string[]; group_name: Group; headshot_media_id: string | null;
  sort_order: number; page_body_markdown: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function validId(value: unknown): boolean {
  return value == null || (typeof value === "string" && uuid.test(value));
}
function validOrder(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10000;
}
function text(value: unknown, max: number, required = false): value is string {
  return typeof value === "string" && value.length <= max && (!required || value.trim().length > 0);
}
function shared(v: Record<string, unknown>): string | null {
  if (v.id !== undefined && !validId(v.id)) return "Invalid ID.";
  if (!validOrder(v.sort_order)) return "Sort order must be between 0 and 10000.";
  if (!text(v.page_body_markdown, 100000)) return "Description is too long.";
  return null;
}
// ASVS 2.2.1, 2.2.2: validate allowlisted fields on the server.
export function validateProject(value: unknown): Result<ProjectInput> {
  const v = record(value);
  if (!v) return { error: "Invalid project." };
  const err = shared(v);
  if (err) return { error: err };
  if (!text(v.title, 160, true)) return { error: "Enter a title up to 160 characters." };
  if (!text(v.slug, 96, true) || !slug.test(v.slug)) return { error: "Enter a valid URL slug." };
  if (!text(v.subtitle, 600)) return { error: "Subtitle is too long." };
  if (v.status !== "draft" && v.status !== "published" && v.status !== "archived")
    return { error: "Invalid status." };
  if (!validId(v.featured_media_id)) return { error: "Invalid featured image." };
  if (!Array.isArray(v.gallery_media_ids) || v.gallery_media_ids.length > 30 ||
      !v.gallery_media_ids.every(x => typeof x === "string" && uuid.test(x)) ||
      new Set(v.gallery_media_ids).size !== v.gallery_media_ids.length)
    return { error: "Select up to 30 unique gallery images." };
  return { data: {
    ...(v.id ? { id: v.id as string } : {}),
    title: (v.title as string).trim(), slug: v.slug as string,
    subtitle: (v.subtitle as string).trim(), status: v.status,
    featured_media_id: (v.featured_media_id || null) as string | null,
    sort_order: v.sort_order as number, gallery_media_ids: v.gallery_media_ids as string[],
    page_body_markdown: v.page_body_markdown as string,
  } };
}
export function validateTeam(value: unknown): Result<TeamInput> {
  const v = record(value);
  if (!v) return { error: "Invalid team profile." };
  const err = shared(v);
  if (err) return { error: err };
  if (!text(v.name, 160, true)) return { error: "Enter a name up to 160 characters." };
  if (!text(v.slug, 96, true) || !slug.test(v.slug)) return { error: "Enter a valid URL slug." };
  if (v.group_name !== "current" && v.group_name !== "other" && v.group_name !== "past")
    return { error: "Invalid group." };
  if (!validId(v.headshot_media_id)) return { error: "Invalid headshot." };
  if (!Array.isArray(v.roles) || v.roles.length > 12 ||
      !v.roles.every(x => text(x, 80, true)) ||
      new Set(v.roles.map(x => (x as string).trim())).size !== v.roles.length)
    return { error: "Enter up to 12 unique roles." };
  if (v.external_url !== null && v.external_url !== "") {
    if (!text(v.external_url, 500)) return { error: "Invalid external link." };
    try {
      const url = new URL(v.external_url as string);
      if (url.protocol !== "https:" || !url.hostname || url.username || url.password)
        return { error: "External links must use HTTPS." };
    } catch { return { error: "Enter a valid HTTPS link." }; }
  }
  return { data: {
    ...(v.id ? { id: v.id as string } : {}),
    name: (v.name as string).trim(), slug: v.slug as string,
    external_url: (v.external_url || null) as string | null,
    roles: (v.roles as string[]).map(x => x.trim()),
    group_name: v.group_name, headshot_media_id: (v.headshot_media_id || null) as string | null,
    sort_order: v.sort_order as number, page_body_markdown: v.page_body_markdown as string,
  } };
}
export { slugify };
