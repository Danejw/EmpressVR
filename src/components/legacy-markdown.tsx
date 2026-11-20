import "server-only";
import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { MediaImage } from "@/components/media-image";

const contentDirectory = join(process.cwd(), "src", "content", "legacy");

/** Keep migrated links local; keep other working links pointing at the original site. */
function pageHref(href: string): string {
  try {
    const parsed = new URL(href, "https://www.empressvr.com");
    if (!["empressvr.com", "www.empressvr.com"].includes(parsed.hostname)) return href;
    if (parsed.pathname === "/") return "/";
    const key = parsed.pathname.slice(1).replaceAll("/", "__");
    if (!/^[a-z0-9-]+(?:__[a-z0-9-]+)*$/.test(key)) return href;
    if (!existsSync(join(contentDirectory, key + ".md"))) return href;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return href;
  }
}

const components: Components = {
  a: ({ href, children }) => {
    const target = pageHref(href || "#");
    return target.startsWith("/") && !target.startsWith("//")
      ? <Link href={target}>{children}</Link>
      : <a href={target} rel="noopener noreferrer">{children}</a>;
  },
  img: ({ src, alt }) => {
    if (!src || typeof src !== "string" || !src.startsWith("https://")) return null;
    return <MediaImage sourceUrl={src} className="source-image" alt={alt || undefined} loading="lazy" />;
  },
};

export function LegacyMarkdown({ markdown, className = "" }: { markdown: string; className?: string }) {
  return <div className={["legacy-copy", className].filter(Boolean).join(" ")}><ReactMarkdown components={components}>{markdown}</ReactMarkdown></div>;
}
