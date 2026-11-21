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

  it("keeps secret credentials out of public content configuration", () => {
    const env = {
      SUPABASE_URL: config.url,
      SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
      SUPABASE_SERVICE_ROLE_KEY: "must-never-be-used",
      GITHUB_PAGES_PREVIEW: "false",
    } as NodeJS.ProcessEnv;
    expect(publicReadConfig(env)).toEqual(config);
  });
});
