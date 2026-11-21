import { describe, expect, it } from "vitest";
import { getMediaAsset, getMediaBySourceUrl, getSiteMediaId } from "./repository";
import { mediaSource, publicStorageMediaUrl } from "./media-url";
import index from "./content-index.json";

const base = "https://zxsrixbjsmyzmqywukwa.supabase.co";
const localBasePath = "/EmpressVR/supabase-integration";

describe("Supabase media resolver", () => {
  it("routes every imported image and logo to public Storage", () => {
    const urls = index.media_assets.map((asset) =>
      mediaSource(asset, { supabaseUrl: base, localBasePath }));
    expect(urls).toHaveLength(160);
    expect(new Set(urls).size).toBe(148);
    for (const url of urls) {
      expect(url).toMatch(/^https:\/\/zxsrixbjsmyzmqywukwa\.supabase\.co\/storage\/v1\/object\/public\/site-media\/media\/[a-f0-9]{64}\.webp$/);
      expect(url).not.toContain("squarespace");
    }
    for (const slot of index.site_media) {
      expect(mediaSource(getMediaAsset(getSiteMediaId(slot.slot)),
        { supabaseUrl: base, localBasePath })).toContain("/site-media/media/");
    }
  });

  it("resolves legacy Markdown Squarespace source URLs through their imported asset IDs", () => {
    for (const asset of index.media_assets) {
      const resolved = getMediaBySourceUrl(asset.source_url);
      expect(resolved?.id).toBe(asset.id);
      expect(mediaSource(resolved, { supabaseUrl: base, localBasePath }))
        .toContain("/storage/v1/object/public/site-media/");
    }
  });

  it("uses local optimized files for offline preview without ever returning the old CDN", () => {
    const source = mediaSource(index.media_assets[0], { supabaseUrl: "", localBasePath });
    expect(source).toBe(localBasePath + "/" + index.media_assets[0].storage_key);
    expect(mediaSource(undefined, { supabaseUrl: base, localBasePath })).toBeNull();
  });

  it("rejects invalid Storage origins, path injection and unknown source images", () => {
    const valid = index.media_assets[0].storage_key;
    expect(publicStorageMediaUrl(valid, "https://supabase.co.evil.example")).toBeNull();
    expect(publicStorageMediaUrl("../../private", base)).toBeNull();
    expect(publicStorageMediaUrl(valid, "http://zxsrixbjsmyzmqywukwa.supabase.co")).toBeNull();
  });
});
