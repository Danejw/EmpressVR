/** Normalize a staff role read from Supabase; never trust editable metadata. */
export type StaffRole = "admin" | "editor";

export function isStaffRole(role: unknown): role is StaffRole {
  return role === "admin" || role === "editor";
}

export function normalizedInviteEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length < 5 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}
