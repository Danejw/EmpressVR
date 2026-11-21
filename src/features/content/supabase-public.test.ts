import { describe, expect, it, vi } from "vitest";
import { fetchPublicRows, publicReadConfig } from "./supabase-public";

const config = {
  url: "https://example-ref.supabase.co",
  publishableKey: "test_publishable_key",
  staticPreview: false,
};

describe("public Supabase content adapter", () => {
  it("uses the packaged snapshot without credentials or on static GitHub Pages", async () => {
    const fallback = vi.fn(() => [{ id: "snapshot" }]);
    const request = vi.fn<typeof fetch>();
    expect(await fetchPublicRows("projects", fallback, { ...config, staticPreview: true }, request))
      .toEqual([{ id: "snapshot" }]);
    expect(await fetchPublicRows("projects", fallback, { ...config, publishableKey: "" }, request))
      .toEqual([{ id: "snapshot" }]);
    expect(request).not.toHaveBeenCalled();
  });

  it("reads only public project catalogs using the publishable API key", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([{ id: "published", status: "published" }]), { status: 200 }),
    );
    const result = await fetchPublicRows("projects", () => [], config, request);
    expect(result).toEqual([{ id: "published", status: "published" }]);
    expect(request).toHaveBeenCalledOnce();
    const [url, init] = request.mock.calls[0];
    expect(url).toContain("/rest/v1/projects?select=*&status=eq.published");
    expect(init?.headers).toEqual({
      apikey: "test_publishable_key", Accept: "application/json",
    });
    expect(init?.cache).toBe("no-store");
  });

  it("treats an empty server response as intentionally empty, without reviving snapshot data", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("[]", { status: 200 }));
    expect(await fetchPublicRows("products", () => [{ id: "legacy" }], config, request))
      .toEqual([]);
  });

  it("falls back safely when the public API is unavailable", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("error", { status: 503 }));
    expect(await fetchPublicRows("team_members", () => [{ id: "cached" }], config, request))
      .toEqual([{ id: "cached" }]);
  });


  it("filters public events to published, date-reviewed records", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("[]", { status: 200 }));
    const fallback = vi.fn(() => [{ id: "archived" }]);
    expect(await fetchPublicRows("events", fallback, config, request)).toEqual([]);
    const [url] = request.mock.calls[0];
    expect(url).toContain("status=eq.published");
    expect(url).toContain("date_review_required=eq.false");
    expect(fallback).not.toHaveBeenCalled();
  });

  it("reads the current public image library and editable image slots", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("[]", { status: 200 }));
    await fetchPublicRows("media_assets", () => [], config, request);
    await fetchPublicRows("site_media", () => [], config, request);
    expect(String(request.mock.calls[0][0])).toContain("media_assets?select=*&status=eq.imported");
    expect(String(request.mock.calls[1][0])).toContain("site_media?select=*&order=slot.asc");
    for (const [,init] of request.mock.calls) {
      expect(init?.headers).toEqual({ apikey: config.publishableKey, Accept: "application/json" });
      expect(init?.cache).toBe("no-store");
    }
  });

  it("accepts browser publishable configuration without any secret key", () => {
    const env = {
      NODE_ENV: "test",
      NEXT_PUBLIC_SUPABASE_URL: config.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
      SUPABASE_SERVICE_ROLE_KEY: "not-used",
    } as NodeJS.ProcessEnv;
    expect(publicReadConfig(env)).toEqual(config);
  });

  it("keeps secret credentials out of public content configuration", () => {
    const env = {
      NODE_ENV: "test",
      SUPABASE_URL: config.url,
      SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
      SUPABASE_SERVICE_ROLE_KEY: "must-never-be-used",
      GITHUB_PAGES_PREVIEW: "false",
    } as NodeJS.ProcessEnv;
    expect(publicReadConfig(env)).toEqual(config);
  });
});

describe("published page content", () => {
  it("reads approved Markdown through public RLS", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([{ body_markdown: "# New page" }]), { status: 200 }),
    );
    const { fetchPublishedPageMarkdown } = await import("./supabase-public");
    const result = await fetchPublishedPageMarkdown("about", config, request);
    expect(result).toEqual({ connected: true, body: "# New page" });
    const [url] = request.mock.calls[0];
    expect(url).toContain("source_key=eq.about");
    expect(url).toContain("published=eq.true");
  });

  it("does not revive a removed or unpublished database page from a local snapshot", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("[]", { status: 200 }));
    const { fetchPublishedPageMarkdown } = await import("./supabase-public");
    expect(await fetchPublishedPageMarkdown("retired-page", config, request))
      .toEqual({ connected: true, body: null });
  });
});
