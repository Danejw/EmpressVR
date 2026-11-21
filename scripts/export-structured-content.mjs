import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Safe, reviewable SQL export. It never contacts or changes a database. */
const root = "src/content/legacy";
const files = readdirSync(root).filter(name => name.endsWith(".md")).sort();
function clean(key, body) {
  let text = body.replace(/[\u00ad\u200b\u200c\u200d]/g, "");
  if (["community","education"].includes(key)) {
    const lines = text.split("\n");
    const first = lines.find(line => line.startsWith("# "));
    text = lines.filter((line, i) => !(i > 0 && first &&
      line.startsWith("# ") && line.replaceAll("\\*", "*").includes(
        first.slice(2).replaceAll("\\*", "*").repeat(2)))).join("\n");
  }
  if (key === "about") text = text.replace(/\nName\s+First Name\(required\)[\s\S]*?SendSend\s*/, "\n");
  if (key === "community") text = text.replace(/^Item 1 of 6\s*$/gm, "");
  if (key === "education") {
    text = text.replace("Schedule Appointment with Empress VR", "[Schedule an appointment](/scheduling)");
    text = text.replace(/\bExperience:\s*Education:\s*$/, "");
  }
  if (key === "fun-raiser") {
    text = text.replace(/Choose Which Project to Contribute to:[\s\S]*?(?=We operate as a business)/, "");
    text = text.replace(/^\[There's no page for this one yet[^\n]+\n?/gm, "");
  }
  if (key === "techalchemy26") {
    text = text.replace("Click the button below to reserve your spot!",
      "Contact the organizers for ticket and availability information.");
    text = text.replace(/£5\.00\s+£10\.00\s+£25\.00\s+£50\.00[\s\S]*?DonateDonate/, "");
  }
  if (key === "store__masks") text = text.replace(/#### No results found[\s\S]*$/, "");
  return text.trim();
}
function toSections(markdown) {
  const sections = [];
  let lines = [];
  let images = [];
  function flushLines() {
    if (lines.join("\n").trim()) sections.push({ type: "rich_text", markdown: lines.join("\n").trim() });
    lines = [];
  }
  function flushImages() {
    if (images.length) sections.push({ type: "gallery", images });
    images = [];
  }
  for (const line of markdown.split("\n")) {
    const match = line.trim().match(/^!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)$/);
    if (match) {
      flushLines();
      images.push({
        sourceUrl: match[2],
        alt: /\.(png|jpe?g|gif|webp|jfif)$/i.test(match[1]) ? "" : match[1],
      });
    } else {
      if (line.trim()) flushImages();
      lines.push(line);
    }
  }
  flushLines(); flushImages();
  return sections;
}

const quotes = value => value.replaceAll("'", "''");
const sql = [
  "-- Review before applying: body_sections backfill only, preserves existing authored sections.",
  "-- Requires migration 20261121000001_structured_page_sections.sql.",
  "begin;",
];
for (const filename of files) {
  const key = filename.slice(0,-3);
  const sections = toSections(clean(key, readFileSync(join(root,filename),"utf8")));
  sql.push("update public.site_pages set body_sections = '" +
    quotes(JSON.stringify(sections)) + "'::jsonb where source_key = '" +
    quotes(key) + "' and body_sections is null and published = true;");
}
sql.push("commit;","");
if (files.length !== 48) throw Error("Unexpected page count: " + files.length);
const output = "supabase/seed-sections.sql";
writeFileSync(output, sql.join("\n"));
console.log("Wrote " + output + " for " + files.length + " pages. Review before applying.");
