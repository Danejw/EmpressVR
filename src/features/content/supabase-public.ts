/**
 * Read-only server adapter for published Supabase catalogs.
 *
 * GitHub Pages is a static export and intentionally uses the packaged snapshot.
 * A server-capable host can enable live reads by providing the project URL and
 * publishable key. Row-level security remains the source of access control.
 * Booking capacity, payment, admin and private records are never read here.
 */
import { cache } from "react";
import {
  getProjects, getProducts, getTeamMembers, getEvents, getPages,
  getMediaAsset, getMediaBySourceUrl, getSiteMediaId,
  type Project, type Product, type TeamMember, type EventRecord, type PageRecord, type MediaAsset,
} from "./repository";

type PublicTable = "projects" | "products" | "offerings" | "team_members" | "events" | "site_pages" | "media_assets" | "site_media";
export type PublicReadConfig = Readonly<{
  url: string;
  publishableKey: string;
  staticPreview: boolean;
}>;

const predicates: Readonly<Record<PublicTable, string>> = {
  projects: "status=eq.published&order=sort_order.asc",
  products: "status=in.(active,sold_out)&order=sort_order.asc",
  offerings: "published=eq.true&order=title.asc",
  team_members: "order=sort_order.asc",
  events: "status=eq.published&date_review_required=eq.false&order=start_at.asc",
  site_pages: "published=eq.true&order=path.asc",
  media_assets: "status=eq.imported",
  site_media: "order=slot.asc",
};

export function publicReadConfig(env: NodeJS.ProcessEnv = process.env): PublicReadConfig {
  return {
    url: env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "",
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
    staticPreview: env.GITHUB_PAGES_PREVIEW === "true",
  };
}

export async function fetchPublicRows<T>(
  table: PublicTable,
  fallback: () => T[],
  config: PublicReadConfig = publicReadConfig(),
  request: typeof fetch = fetch,
): Promise<T[]> {
  if (config.staticPreview || !config.url || !config.publishableKey) {
    return fallback();
  }
  try {
    const base = new URL(config.url);
    if (!["https:", "http:"].includes(base.protocol)) throw new Error("Invalid Supabase URL");
    const endpoint = new URL("/rest/v1/" + table, base);
    endpoint.search = "select=*&" + predicates[table];
    const response = await request(endpoint.toString(), {
      method: "GET",
      headers: {
        apikey: config.publishableKey,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Published catalog request failed");
    const rows: unknown = await response.json();
    if (!Array.isArray(rows)) throw new Error("Invalid published catalog response");
    return rows as T[];
  } catch {
    // A website content failure may show its verified snapshot. Never use
    // this fallback for transactions, entitlements, or booking availability.
    return fallback();
  }
}

export function getPublishedProjects(): Promise<Project[]> {
  return fetchPublicRows("projects", getProjects);
}

export function getPublishedProducts(): Promise<Product[]> {
  return fetchPublicRows("products", getProducts);
}

/** Live public catalogue. Archived store products are never a booking source. */
export type PublicOffering = Readonly<{
  id:string; title:string; description:string;kind:"class"|"appointment"|"informational";
  price_minor:number; currency:string; published:boolean;accepting_bookings:boolean;
}>;
export function getPublishedOfferings():Promise<PublicOffering[]> {
  return fetchPublicRows<PublicOffering>("offerings",()=>[]);
}

export async function getPublicTeamMembers(): Promise<TeamMember[]> {
  const rows = await fetchPublicRows<TeamMember & { group_name?: string }>(
    "team_members", getTeamMembers,
  );
  return rows.map(({ group_name, ...member }) => ({
    ...member,
    group: group_name ?? member.group,
  }));
}


/** Server-request reads, deduplicated within a React render. */
export const getPublicMediaAssets = cache(async (): Promise<MediaAsset[]> =>
  fetchPublicRows("media_assets", () => [])
);

export const getPublicSiteMedia = cache(async (): Promise<Array<{ slot: string; media_asset_id: string }>> =>
  fetchPublicRows("site_media", () => [])
);

export async function getPublicMediaAsset(id: string | null | undefined): Promise<MediaAsset | undefined> {
  if (!id) return undefined;
  const rows = await getPublicMediaAssets();
  // A missing published row must not hide a verified bundled image.
  return rows.find((asset) => asset.id === id) ?? (publicReadConfig().url ? undefined : getMediaAsset(id));
}

export async function getPublicMediaBySourceUrl(url: string): Promise<MediaAsset | undefined> {
  const source = url.split("?")[0].split("#")[0];
  const rows = await getPublicMediaAssets();
  return rows.find((asset) => asset.source_key === source || asset.source_url === source)
    ?? (publicReadConfig().url ? undefined : getMediaBySourceUrl(url));
}

export async function getPublicSiteMediaId(slot: string): Promise<string | undefined> {
  const rows = await getPublicSiteMedia();
  return rows.find((row) => row.slot === slot)?.media_asset_id
    ?? (publicReadConfig().url ? undefined : getSiteMediaId(slot));
}

export type PublicEventRecord = EventRecord & {
  time_zone?: string; all_day?: boolean;
  location?: string | null; external_url?: string | null;
  featured_media_id?: string | null;
};
export function getPublishedEvents(): Promise<PublicEventRecord[]> {
  return fetchPublicRows<PublicEventRecord>("events", () => getEvents().filter((event) =>
    event.status === "published" && !event.date_review_required
  ));
}

export type PublicPageRecord = PageRecord & { body_markdown?: string };
export function getPublishedPages(): Promise<PublicPageRecord[]> {
  return fetchPublicRows<PublicPageRecord>("site_pages", () =>
    getPages().filter((page) => page.published));
}

export async function fetchPublishedPageMarkdown(
  sourceKey: string,
  config: PublicReadConfig = publicReadConfig(),
  request: typeof fetch = fetch,
): Promise<{ connected: boolean; body: string | null }> {
  if (config.staticPreview || !config.url || !config.publishableKey) {
    return { connected: false, body: null };
  }
  try {
    const base = new URL(config.url);
    if (!["https:", "http:"].includes(base.protocol)) throw new Error("Invalid Supabase URL");
    const endpoint = new URL("/rest/v1/site_pages", base);
    endpoint.searchParams.set("select", "body_markdown");
    endpoint.searchParams.set("source_key", "eq." + sourceKey);
    endpoint.searchParams.set("published", "eq.true");
    endpoint.searchParams.set("limit", "1");
    const response = await request(endpoint.toString(), {
      method: "GET",
      headers: { apikey: config.publishableKey, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Published page request failed");
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error("Invalid published page response");
    const entry = payload[0] as { body_markdown?: unknown } | undefined;
    if (entry && typeof entry.body_markdown !== "string") {
      throw new Error("Invalid published page body");
    }
    // An empty authorized response means unpublished/missing: don't revive a
    // local archived page that staff intentionally unpublished.
    return { connected: true, body: typeof entry?.body_markdown === "string" ? entry.body_markdown : null };
  } catch {
    return { connected: false, body: null };
  }
}

/** Optional structured content. Older deployments still have body_markdown. */
export async function fetchPublishedPageSections(
  sourceKey: string,
  config: PublicReadConfig = publicReadConfig(),
  request: typeof fetch = fetch,
): Promise<import("./page-sections").PageSection[] | null> {
  if (config.staticPreview || !config.url || !config.publishableKey) return null;
  try {
    const endpoint = new URL("/rest/v1/site_pages", config.url);
    endpoint.searchParams.set("select", "body_sections");
    endpoint.searchParams.set("source_key", "eq." + sourceKey);
    endpoint.searchParams.set("published", "eq.true");
    endpoint.searchParams.set("limit", "1");
    const response = await request(endpoint.toString(), {
      headers: { apikey: config.publishableKey, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null; // Existing database may not have the migration.
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || !rows.length) return null;
    const sections = (rows[0] as { body_sections?: unknown }).body_sections;
    const { isPageSections } = await import("./page-sections");
    return isPageSections(sections) ? sections : null;
  } catch {
    return null;
  }
}

type GalleryRow = { media_asset_id: string; position: number };
/** Relationship-based image ordering; missing remote rows fall back to checked-in data. */
async function getPublicGallery(
  table: "page_media" | "project_media" | "product_media",
  relation: "page_id" | "project_id" | "product_id",
  id: string,
  fallback: () => GalleryRow[],
): Promise<string[]> {
  const config = publicReadConfig();
  if (!config.staticPreview && config.url && config.publishableKey) {
    try {
      const endpoint = new URL("/rest/v1/" + table, config.url);
      endpoint.searchParams.set("select", "media_asset_id,position");
      endpoint.searchParams.set(relation, "eq." + id);
      endpoint.searchParams.set("order", "position.asc");
      const response = await fetch(endpoint.toString(), {
        headers: {apikey: config.publishableKey, Accept: "application/json"},
        cache: "no-store", signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const remote: unknown = await response.json();
        if (Array.isArray(remote))
          return [...new Set((remote as GalleryRow[]).map(row => row.media_asset_id))];
      }
    } catch { /* verified bundled images remain available */ }
  }
  return [...new Set(fallback().sort((a,b) => a.position-b.position).map(row => row.media_asset_id))];
}

export async function getPublicPageGallery(pageId: string): Promise<string[]> {
  const { getPageGallery } = await import("./repository");
  return getPublicGallery("page_media", "page_id", pageId, () => getPageGallery(pageId));
}
export async function getPublicProjectGallery(projectId: string): Promise<string[]> {
  const { getProjectImages } = await import("./repository");
  return getPublicGallery("project_media", "project_id", projectId, () => getProjectImages(projectId));
}
export async function getPublicProductGallery(productId: string): Promise<string[]> {
  const { getProductImages } = await import("./repository");
  return getPublicGallery("product_media", "product_id", productId, () => getProductImages(productId));
}
