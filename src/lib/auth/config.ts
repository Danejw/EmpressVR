/** Shared public client settings; never include privileged API keys. */
export function authConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  return { url, key, ready: !!url && !!key };
}
