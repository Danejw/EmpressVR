"use client";

import { createBrowserClient } from "@supabase/ssr";
import { authConfig } from "./config";

/** One browser session, shared between login and MFA controls. */
let browserClient: ReturnType<typeof createBrowserClient> | null = null;
export function getBrowserAuth() {
  if (browserClient) return browserClient;
  const { url, key, ready } = authConfig();
  if (!ready) return null;
  browserClient = createBrowserClient(url, key);
  return browserClient;
}
