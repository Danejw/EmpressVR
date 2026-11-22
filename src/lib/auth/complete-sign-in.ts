"use client";

import { getBrowserAuth } from "./browser";

/** Provision the member profile, then read the staff role granted by database-owned invitation triggers. */
export async function completeSignIn(): Promise<"/staff" | "/account"> {
  const auth = getBrowserAuth();
  if (!auth) throw new Error("Authentication is not configured.");
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (authError || !user?.email) throw new Error("Your session could not be verified.");

  const { data: customer, error: readError } = await auth.from("customers")
    .select("id").eq("user_id", user.id).maybeSingle();
  if (readError) throw new Error("Could not load your member profile.");
  if (!customer) {
    const { error } = await auth.from("customers").insert({
      user_id: user.id,
      contact_email: user.email.toLowerCase(),
    });
    if (error && error.code !== "23505")
      throw new Error("Signed in, but your member profile could not be created.");
  }

  // ASVS 4.1: no privileged RPC is exposed to or called by the browser.
  // Only the verified-email and admin-invitation database triggers can assign staff roles.
  const { data: staff, error: staffError } = await auth.from("staff_roles")
    .select("role").eq("user_id", user.id).maybeSingle();
  if (staffError) throw new Error("Could not verify your access permissions.");
  return staff?.role === "admin" || staff?.role === "editor" ? "/staff" : "/account";
}
