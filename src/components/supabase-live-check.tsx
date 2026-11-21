"use client";

import { useEffect, useState } from "react";

type TableName = "site_pages" | "projects" | "team_members" | "products" | "events" | "media_assets";
type CheckResult = Readonly<{
  name: TableName;
  label: string;
  count: number | null;
  expected: number;
  error: string | null;
}>;

const TABLES: ReadonlyArray<{ name: TableName; label: string; expected: number }> = [
  { name: "site_pages", label: "Published pages", expected: 48 },
  { name: "projects", label: "Published projects", expected: 7 },
  { name: "team_members", label: "Team members", expected: 9 },
  { name: "products", label: "Published products", expected: 4 },
  { name: "events", label: "Archived and published events", expected: 7 },
  { name: "media_assets", label: "Imported media database records", expected: 160 },
];

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

async function readCount(item: (typeof TABLES)[number]): Promise<CheckResult> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { ...item, count: null, error: "Public preview API configuration is missing" };
  }
  try {
    const endpoint = new URL("/rest/v1/" + item.name, SUPABASE_URL);
    endpoint.searchParams.set("select", "id");
    endpoint.searchParams.set("limit", "1");
    const response = await fetch(endpoint.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        apikey: SUPABASE_KEY,
        Prefer: "count=exact",
        Range: "0-0",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return { ...item, count: null, error: "Read denied or unavailable (HTTP " + response.status + ")" };
    }
    const contentRange = response.headers.get("content-range");
    const total = contentRange?.match(/\/(\d+)$/)?.[1];
    if (!total) return { ...item, count: null, error: "API count header unavailable" };
    return { ...item, count: Number(total), error: null };
  } catch {
    return { ...item, count: null, error: "Unable to reach Supabase from this browser" };
  }
}

async function runChecks(): Promise<CheckResult[]> {
  return Promise.all(TABLES.map(readCount));
}

/**
 * This page intentionally tests live, anonymous, read-only Supabase REST calls.
 * The other statically exported GitHub Pages routes remain the packaged
 * snapshot. Real Next.js server-side reads require a server-capable host.
 */
export function SupabaseLiveCheck() {
  const [results, setResults] = useState<CheckResult[] | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    runChecks().then((data) => {
      if (active) { setResults(data); setChecking(false); }
    }).catch(() => {
      if (active) { setResults([]); setChecking(false); }
    });
    return () => { active = false; };
  }, []);

  const healthy = results?.filter((result) => result.error === null).length ?? 0;
  return <section className="supabase-checker" aria-label="Live Supabase read verification">
    <div className="supabase-checker-header">
      <div>
        <h2>Live database checks</h2>
        <p>This section queries the connected EmpressVR Supabase project from your browser. It performs public, read-only requests with row-level security.</p>
      </div>
      <button type="button" onClick={() => {
        setChecking(true);
        runChecks().then((data) => { setResults(data); setChecking(false); })
          .catch(() => { setResults([]); setChecking(false); });
      }} disabled={checking}>Run checks again</button>
    </div>
    <p className="supabase-checker-summary" role="status" aria-live="polite">
      {checking ? "Checking Supabase…" :
        healthy === TABLES.length ? "All public reads succeeded" :
          healthy + " of " + TABLES.length + " public reads succeeded"}
    </p>
    <div className="supabase-checker-results">
      {TABLES.map((item) => {
        const result = results?.find((entry) => entry.name === item.name);
        return <div className="supabase-checker-result" key={item.name}>
          <div><strong>{item.label}</strong><small>Imported reference: {item.expected}</small></div>
          <div className="supabase-checker-number">
            {checking ? "…" : result?.error ? "Unavailable" : result ? String(result.count) : "Unavailable"}
            {!checking && result?.error ? <small>{result.error}</small> : null}
          </div>
        </div>;
      })}
    </div>
    <p className="supabase-checker-footnote">
      All 148 distinct site images and the favicon are now verified in the public Supabase Storage
      bucket. The media record count above reflects database records, not Storage objects.
      The integration preview serves the site images directly from Supabase; the local files
      remain available only as an offline fallback.
    </p>
  </section>;
}
