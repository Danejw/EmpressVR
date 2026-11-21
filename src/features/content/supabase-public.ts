/**
 * Read-only server adapter for published Supabase catalogs.
 *
 * GitHub Pages is a static export and intentionally uses the packaged snapshot.
 * A server-capable host can enable live reads by providing the project URL and
 * publishable key. Row-level security remains the source of access control.
 * Booking capacity, payment, admin and private records are never read here.
 */
import {
  getProjects, getProducts, getTeamMembers,
  type Project, type Product, type TeamMember,
} from "./repository";

type PublicTable = "projects" | "products" | "team_members";
export type PublicReadConfig = Readonly<{
  url: string;
  publishableKey: string;
  staticPreview: boolean;
}>;

const predicates: Readonly<Record<PublicTable, string>> = {
  projects: "status=eq.published&order=sort_order.asc",
  products: "status=in.(active,sold_out)&order=sort_order.asc",
  team_members: "order=sort_order.asc",
};

export function publicReadConfig(env: NodeJS.ProcessEnv = process.env): PublicReadConfig {
  return {
    url: env.SUPABASE_URL ?? "",
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY ?? "",
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

export async function getPublicTeamMembers(): Promise<TeamMember[]> {
  const rows = await fetchPublicRows<TeamMember & { group_name?: string }>(
    "team_members", getTeamMembers,
  );
  return rows.map(({ group_name, ...member }) => ({
    ...member,
    group: group_name ?? member.group,
  }));
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
