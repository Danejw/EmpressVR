import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { authConfig } from "./config";

/** Per-request auth client. User sessions only, no service-role credentials. */
export async function getServerAuth() {
  const { url, key, ready } = authConfig();
  if (!ready) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies. proxy.ts refreshes sessions.
        }
      },
    },
  });
}
