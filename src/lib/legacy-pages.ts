import "server-only";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const contentDirectory = join(process.cwd(), "src", "content", "legacy");

/** Every snapshot is public copy extracted from empressvr.com. */
export async function listLegacySlugs(): Promise<string[]> {
  const files = await readdir(contentDirectory);
  return files.filter((name) => name.endsWith(".md")).map((name) => name.slice(0, -3));
}

export async function readLegacyPage(slug: string): Promise<string | null> {
  if (!/^[a-z0-9-]+(?:__[a-z0-9-]+)*$/.test(slug)) return null;
  try {
    return await readFile(join(contentDirectory, slug + ".md"), "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

export function sourcePageUrl(slug: string): string {
  return "https://www.empressvr.com/" + (slug === "home" ? "" : slug.replaceAll("__", "/"));
}

export function sourceImages(markdown: string): string[] {
  return [...markdown.matchAll(/!\[[^\]]*\]\((https:\/\/images\.squarespace-cdn\.com[^)]+)\)/g)].map((match) => match[1]);
}
