import "server-only";
import { redirect } from "next/navigation";
import { getServerAuth } from "@/lib/auth/server";
import { isStaffRole } from "@/lib/auth/permissions";

/** Read permissions from the database, never user-editable metadata. */
export async function getStaffContext() {
  const auth = await getServerAuth();
  if (!auth) return null;
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) return null;
  const { data: staff, error: roleError } = await auth.from("staff_roles")
    .select("role").eq("user_id", user.id).maybeSingle();
  if (roleError) return { auth, user, role: null, mfaVerified: false };
  const role = isStaffRole(staff?.role) ? staff.role : null;
  if (!role) return { auth, user, role: null, mfaVerified: false };
  const { data: assurance } = await auth.auth.mfa.getAuthenticatorAssuranceLevel();
  return { auth, user, role, mfaVerified: assurance?.currentLevel === "aal2" };
}

/** Protects page rendering and all server-side blog mutations. */
export async function requireStaff() {
  const context = await getStaffContext();
  if (!context) redirect("/login");
  if (!context.role) redirect("/account");
  if (!context.mfaVerified) redirect("/staff/security");
  return { ...context, role: context.role };
}
