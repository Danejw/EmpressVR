import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const contentDir = join(process.cwd(), "src", "content", "legacy");
const files = readdirSync(contentDir).filter((name) => name.endsWith(".md")).sort();
const routeFor = (file) => file === "home.md" ? "/" : "/" + file.slice(0, -3).replaceAll("__", "/");
const routes = new Set(["/home", ...files.map(routeFor)]);
const allowedLegacyServices = new Set(["/cart", "/checkout"]);
const blankPages = [];
const thinPages = [];
const missingAlt = [];
const unmigratedSourceLinks = [];
const brokenLocalLinks = [];
const remoteImages = new Set();
const errors = [];

if (files.length < 48) errors.push("Expected at least 48 original content snapshots; found " + files.length);

for (const file of files) {
  const content = readFileSync(join(contentDir, file), "utf8");
  const route = routeFor(file);
  const meaningful = content.replace(/[\u00ad\u200b\u200c\u200d\u00a0\s]/g, "");
  if (meaningful.length < 30) blankPages.push(route);
  else if (meaningful.length < 200) thinPages.push(route);

  for (const match of content.matchAll(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g)) {
    const url = match[2];
    if (!match[1].trim()) missingAlt.push({ route, image: url });
    if (url.startsWith("https://images.squarespace-cdn.com/")) remoteImages.add(url);
  }

  // These are Markdown links, not a network reachability check. Existing
  // checkout/calendar links intentionally remain on the Squarespace domain.
  for (const match of content.matchAll(/\]\((https?:\/\/[^\s)]+|\/[^\s)]+)/g)) {
    const href = match[1].replaceAll("&amp;", "&");
    const isLocal = href.startsWith("/") && !href.startsWith("//");
    let target;
    try { target = new URL(href, "https://www.empressvr.com"); }
    catch { continue; }
    if (!["www.empressvr.com", "empressvr.com"].includes(target.hostname)) continue;
    if (target.searchParams.get("format") === "ical") continue;
    const path = target.pathname.replace(/\/+$/, "") || "/";
    if (routes.has(path) || allowedLegacyServices.has(path)) continue;

    if (isLocal) brokenLocalLinks.push({ from: route, to: path });
    else unmigratedSourceLinks.push({ from: route, to: target.pathname });
  }
}

if (brokenLocalLinks.length) {
  errors.push(brokenLocalLinks.length + " local links point to routes not in the migration inventory");
}

const dedupe = (items) => [...new Map(items.map((item) => [item.from + "|" + item.to, item])).values()];
const report = {
  generatedAt: new Date().toISOString(),
  scope: "Source Markdown and local routes only; external URL and CDN reachability not verified",
  totals: {
    snapshots: files.length,
    expectedPublicRoutesIncludingHomeAlias: routes.size,
    blankPages: blankPages.length,
    thinPages: thinPages.length,
    imagesWithBlankAlt: missingAlt.length,
    uniqueSquarespaceImages: remoteImages.size,
    unresolvedSourceLinkPaths: dedupe(unmigratedSourceLinks).length,
    invalidLocalLinks: brokenLocalLinks.length
  },
  blankPages,
  thinPages,
  missingAlt,
  unresolvedSourceLinks: dedupe(unmigratedSourceLinks),
  brokenLocalLinks,
  errors
};

mkdirSync("test-results", { recursive: true });
writeFileSync("test-results/content-audit.json", JSON.stringify(report, null, 2) + "\n");
console.log("Content audit: " + files.length + " snapshots / " + routes.size + " public paths");
console.log("Blank: " + blankPages.join(", ") + "; thin: " + thinPages.join(", "));
console.log("Squarespace image URLs: " + remoteImages.size + "; empty image alt: " + missingAlt.length);
console.log("Source-only link targets requiring review: " + report.totals.unresolvedSourceLinkPaths);
console.log("Invalid local links: " + brokenLocalLinks.length);
console.log("Full report: test-results/content-audit.json");
if (errors.length) {
  for (const error of errors) console.error("ERROR: " + error);
  process.exitCode = 1;
}
