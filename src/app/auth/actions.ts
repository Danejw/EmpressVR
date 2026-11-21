"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerAuth } from "@/lib/auth/server";
import { normalizedInviteEmail } from "@/lib/auth/permissions";

export async function signOut() {
  const auth = await getServerAuth();
  if (auth) await auth.auth.signOut();
  redirect("/login");
}

export async function updateDisplayName(form: FormData) {
  const auth = await getServerAuth();
  if (!auth) redirect("/login");
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");
  const value = form.get("display_name");
  const name = typeof value === "string" ? value.trim() : "";
  if (name.length > 200) redirect("/account?status=invalid");
  const { error } = await auth.from("customers")
    .update({ display_name: name || null }).eq("user_id", user.id);
  if (error) redirect("/account?status=error");
  revalidatePath("/account");
  redirect("/account?status=updated");
}

export async function createMemberProfile() {
  const auth = await getServerAuth();
  if (!auth) redirect("/login");
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.email) redirect("/login");
  const { error } = await auth.from("customers").insert({
    user_id: user.id, contact_email: user.email.toLowerCase(),
  });
  if (error && error.code !== "23505") redirect("/account?status=error");
  revalidatePath("/account");
  redirect("/account");
}

async function verifiedAdmin() {
  const auth = await getServerAuth();
  if (!auth) redirect("/login");
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect("/login");
  const { data: role } = await auth.from("staff_roles")
    .select("role").eq("user_id", user.id).maybeSingle();
  if (role?.role !== "admin") redirect("/account");
  const { data: assurance } = await auth.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assurance?.currentLevel !== "aal2") redirect("/staff/security");
  return { auth, user };
}

export async function createStaffInvitation(form: FormData) {
  const { auth, user } = await verifiedAdmin();
  const email = normalizedInviteEmail(form.get("email"));
  const role = form.get("role");
  if (!email || (role !== "editor" && role !== "admin")) redirect("/staff?invite=invalid");
  const { error } = await auth.from("staff_invitations").insert({
    email, role, invited_by: user.id,
  });
  if (error) redirect("/staff?invite=error");
  revalidatePath("/staff");
  redirect("/staff?invite=created");
}

export async function revokeStaffInvitation(form: FormData) {
  const { auth } = await verifiedAdmin();
  const email = normalizedInviteEmail(form.get("email"));
  if (!email) redirect("/staff");
  const { error } = await auth.from("staff_invitations").delete()
    .eq("email", email).is("accepted_at", null);
  if (error) redirect("/staff?invite=error");
  revalidatePath("/staff");
  redirect("/staff?invite=revoked");
}
