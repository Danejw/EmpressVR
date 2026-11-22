import "server-only";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";

/** ASVS 2.1.2: booking and attendee administration is restricted to an MFA-verified admin. */
export async function requireBookingAdmin() {
  const context = await requireStaff();
  if (context.role !== "admin") redirect("/staff");
  return context;
}
