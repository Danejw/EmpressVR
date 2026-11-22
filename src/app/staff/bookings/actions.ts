"use server";
import { revalidatePath } from "next/cache";
import { requireBookingAdmin } from "@/lib/auth/booking-admin";
import { validateOffering, validateSession, validateManualBooking, validId } from "@/features/scheduling/admin-validation";
import type { ActionResult } from "@/features/scheduling/admin-types";
const fail = (error: string): ActionResult => ({ ok: false, error });
function refreshed() { revalidatePath("/staff"); revalidatePath("/staff/bookings"); }

export async function saveOffering(value: unknown): Promise<ActionResult> {
  const checked = validateOffering(value);
  if (!checked.data) return fail(checked.error);
  const { auth } = await requireBookingAdmin();
  const { id, ...fields } = checked.data;
  if (id) {
    const { data: existing, error: readError } = await auth.from("offerings")
      .select("slug,kind").eq("id", id).maybeSingle();
    if (readError || !existing) return fail("Offering not found.");
    if (existing.slug !== fields.slug) return fail("Offering URLs cannot be changed after creation.");
    if (existing.kind !== fields.kind) {
      const { count, error: sessionsError } = await auth.from("booking_slots")
        .select("id", { count:"exact", head:true }).eq("offering_id", id);
      if (sessionsError) return fail("Could not check related sessions.");
      if (count) return fail("Offering type cannot change while it has sessions.");
    }
  }
  const newId = id ?? crypto.randomUUID();
  // No public reservation handler exists. Leave accepting_bookings disabled for new offerings.
  const payload = { ...fields, updated_at: new Date().toISOString() };
  const { error, data } = id
    ? await auth.from("offerings").update(payload).eq("id", id).select("id").maybeSingle()
    : await auth.from("offerings").insert({ ...payload, id: newId, accepting_bookings: false }).select("id").maybeSingle();
  if (error || !data) return fail(error?.code === "23505" ? "That offering URL is already used." : "Could not save offering.");
  refreshed(); return { ok: true, id: data.id };
}

export async function saveSession(value: unknown): Promise<ActionResult> {
  const checked = validateSession(value);
  if (!checked.data) return fail(checked.error);
  const { auth } = await requireBookingAdmin();
  const { id, ...fields } = checked.data;
  const { data: offering } = await auth.from("offerings").select("id,kind").eq("id", fields.offering_id).maybeSingle();
  if (!offering || offering.kind === "informational") return fail("Choose a class or appointment.");
  if (offering.kind==="appointment" && fields.available && !fields.resource_id)
    return fail("Assign an active resource to open appointment availability.");
  const { data: collision, error: collisionError } = await auth.from("booking_slots").select("id")
    .eq("offering_id", fields.offering_id)
    .lt("starts_at", fields.ends_at).gt("ends_at", fields.starts_at).limit(10);
  if (collisionError) return fail("Could not check existing sessions.");
  if (collision?.some(row => row.id !== id)) return fail("This offering already has a session at that time.");
  if (id) {
    const { data: existing } = await auth.from("booking_slots").select("id,offering_id,starts_at").eq("id", id).maybeSingle();
    if (!existing || existing.offering_id !== fields.offering_id) return fail("Session not found.");
    if (Date.parse(existing.starts_at) <= Date.now()) return fail("Past sessions cannot be edited.");
    const { data: held, error: readBookingsError } = await auth.from("bookings")
      .select("seats,status,expires_at").eq("slot_id",id);
    if (readBookingsError) return fail("Could not verify reservations on this session.");
    const active = (held ?? []).filter(row =>
      row.status === "confirmed" || (row.status === "held" && Date.parse(row.expires_at) > Date.now()));
    if (active.length) return fail("This session has reservations. Close availability instead of changing its details.");
  }
  const newId = id ?? crypto.randomUUID();
  const payload = { ...fields, updated_at: new Date().toISOString() };
  const { error, data } = id
    ? await auth.from("booking_slots").update(payload).eq("id", id).select("id").maybeSingle()
    : await auth.from("booking_slots").insert({ ...payload, id: newId }).select("id").maybeSingle();
  if (error || !data) return fail("Could not save session. Check dates and permissions.");
  refreshed(); return { ok: true, id: data.id };
}

export async function closeSession(id: string): Promise<ActionResult> {
  if (!validId(id)) return fail("Invalid session.");
  const { auth } = await requireBookingAdmin();
  const { error, data } = await auth.from("booking_slots").update({
    available: false, updated_at: new Date().toISOString(),
  }).eq("id", id).select("id").maybeSingle();
  if (error || !data) return fail("Could not close availability.");
  refreshed(); return { ok: true, id: data.id };
}

export async function makeFreeReservation(value: unknown): Promise<ActionResult> {
  const checked = validateManualBooking(value);
  if (!checked.data) return fail(checked.error);
  const { auth } = await requireBookingAdmin();
  // ASVS 2.3.3: the SECURITY INVOKER RPC locks the slot and reserves seats atomically.
  const input = checked.data;
  const { data, error } = await auth.rpc("admin_reserve_free_booking", {
    p_slot_id: input.slot_id, p_attendee_name: input.name, p_attendee_email: input.email,
    p_seats: input.seats, p_idempotency_key: input.idempotency_key,
  });
  if (error || typeof data !== "string") return fail(error?.message ?? "Could not reserve seats.");
  refreshed(); return { ok: true, id: data };
}

export async function cancelFreeReservation(id: string): Promise<ActionResult> {
  if (!validId(id)) return fail("Invalid reservation.");
  const { auth } = await requireBookingAdmin();
  const { error, data } = await auth.rpc("admin_cancel_free_booking", { p_booking_id: id });
  if (error || data !== true) return fail(error?.message ?? "Could not cancel reservation.");
  refreshed(); return { ok: true, id };
}

export async function saveBookingResource(value:unknown):Promise<ActionResult> {
  if(!value || typeof value!=="object")return fail("Invalid resource.");
  const v=value as Record<string,unknown>;
  const id=v.id;
  if(id!==undefined && (typeof id!=="string"||!validId(id)))return fail("Invalid resource ID.");
  if(typeof v.name!=="string"||v.name.trim().length<1||v.name.trim().length>120 ||
     typeof v.active!=="boolean")return fail("Enter a resource name (up to 120 characters).");
  const {auth}=await requireBookingAdmin();
  const data={name:v.name.trim(),active:v.active};
  const result=id?
    await auth.from("booking_resources").update(data).eq("id",id).select("id").maybeSingle():
    await auth.from("booking_resources").insert(data).select("id").maybeSingle();
  if(result.error||!result.data)return fail(result.error?.code==="23505"?
    "A resource with that name already exists.":"Unable to save resource.");
  refreshed();
  return {ok:true,id:result.data.id};
}
