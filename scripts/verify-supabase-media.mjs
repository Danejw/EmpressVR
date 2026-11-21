import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const index = JSON.parse(readFileSync("src/features/content/content-index.json", "utf8"));
const root = (process.env.SUPABASE_MEDIA_URL ||
  "https://zxsrixbjsmyzmqywukwa.supabase.co").replace(/\/$/, "");
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(root)) {
  throw new Error("Invalid public Supabase Storage URL");
}
const unique = new Map(index.media_assets.map(asset =>
  [asset.storage_key, { key: asset.storage_key, sha: asset.sha256, size: asset.byte_size }]));
if (index.media_assets.length !== 160 || unique.size !== 148) {
  throw new Error("Source image inventory changed; review migration and verification counts");
}
const favicon = {
  key: "media/7d47d13b010dcf98a25cf2d22b5fe2a41f3ff9cd1a958375ab3b10749e9471c7.webp",
  sha: "7d47d13b010dcf98a25cf2d22b5fe2a41f3ff9cd1a958375ab3b10749e9471c7",
  size: 2924,
};
const items = [...unique.values(), favicon];
const failures = [];
let indexCursor = 0;
let verified = 0;

async function verifyOne(item) {
  if (!/^media\/[a-f0-9]{64}\.webp$/.test(item.key) ||
      !Number.isSafeInteger(item.size) || item.size < 1) {
    throw new Error("Unrecognized media manifest entry: " + item.key);
  }
  const url = root + "/storage/v1/object/public/site-media/" + item.key;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const bytes = Buffer.from(await res.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (bytes.byteLength !== item.size || hash !== item.sha) {
    throw new Error("Stored size or hash differs from the approved source");
  }
}
async function worker() {
  while (indexCursor < items.length) {
    const item = items[indexCursor++];
    try {
      await verifyOne(item);
      verified++;
    } catch (error) {
      failures.push({ key: item.key, error: String(error).slice(0,200) });
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(JSON.stringify({
  sourceRecords: index.media_assets.length,
  uniqueSiteImages: unique.size,
  favicon: 1,
  verifiedObjects: verified,
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;
