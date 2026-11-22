import type { OfferingInput, SessionInput, ManualBookingInput } from "./admin-types";

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validId(value: string): boolean { return idPattern.test(value); }
type Result<T> = { data: T; error?: never } | { data?: never; error: string };
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function string(value: unknown, max: number, required = false): value is string {
  return typeof value === "string" && value.length <= max && (!required || value.trim().length > 0);
}
function integer(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}
function recordId(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && validId(value));
}
function utc(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString() === new Date(value).toISOString();
}

/** ASVS 2.2.1/2.2.2: only permitted fields and values cross the server action boundary. */
export function validateOffering(value: unknown): Result<OfferingInput> {
  const v = object(value);
  if (!v || !recordId(v.id)) return { error: "Invalid offering." };
  if (!string(v.title, 160, true)) return { error: "Enter a title (up to 160 characters)." };
  if (!string(v.slug, 128, true) || !slugPattern.test(v.slug)) return { error: "Enter a lowercase URL slug." };
  if (!string(v.description, 4000)) return { error: "Description is too long." };
  if (v.kind !== "class" && v.kind !== "appointment" && v.kind !== "informational") return { error: "Invalid offering type." };
  if (!integer(v.price_minor, 0, 1000000000)) return { error: "Enter a valid price in minor currency units." };
  if (!string(v.currency, 3) || !/^[A-Z]{3}$/.test(v.currency)) return { error: "Use a three-letter currency code." };
  if (typeof v.published !== "boolean") return { error: "Invalid visibility." };
  if (typeof v.accepting_bookings !== "boolean") return { error: "Invalid booking acceptance." };
  if (v.accepting_bookings && (!v.published || v.kind === "informational" || v.price_minor !== 0))
    return { error: "Only published free classes or appointments can accept online bookings." };
  return { data: {
    ...(v.id ? { id: v.id as string } : {}),
    title: v.title.trim(), slug: v.slug, description: v.description.trim(),
    kind: v.kind, price_minor: v.price_minor, currency: v.currency, published: v.published,
    accepting_bookings: v.accepting_bookings,
  } };
}

export function validateSession(value: unknown, now = new Date()): Result<SessionInput> {
  const v = object(value);
  if (!v || !recordId(v.id) || typeof v.offering_id !== "string" || !validId(v.offering_id))
    return { error: "Choose a valid offering." };
  if (!utc(v.starts_at) || !utc(v.ends_at) || Date.parse(v.starts_at) <= now.getTime() ||
      Date.parse(v.ends_at) <= Date.parse(v.starts_at))
    return { error: "Session dates must be in the future, with the end after the start." };
  if (!string(v.time_zone, 64, true)) return { error: "Choose a time zone." };
  try { new Intl.DateTimeFormat("en-GB", { timeZone: v.time_zone }); }
  catch { return { error: "Invalid IANA time zone." }; }
  if (!integer(v.capacity, 1, 10000) || !integer(v.max_seats_per_booking, 1, v.capacity))
    return { error: "Capacity and seat limits must be positive, with seat limit at most capacity." };
  if (v.resource_id !== null && (typeof v.resource_id !== "string" || !validId(v.resource_id)))
    return { error: "Select a valid resource." };
  if (v.resource_id === undefined) return {error:"Choose the session resource setting."};
  if (typeof v.available !== "boolean" || typeof v.requires_payment !== "boolean")
    return { error: "Invalid availability or payment setting." };
  return { data: {
    ...(v.id ? { id: v.id as string } : {}), offering_id: v.offering_id,
    starts_at: v.starts_at, ends_at: v.ends_at, time_zone: v.time_zone,
    capacity: v.capacity, max_seats_per_booking: v.max_seats_per_booking,
    available: v.available, requires_payment: v.requires_payment,
    resource_id: v.resource_id as string | null,
  } };
}
export function validateManualBooking(value: unknown): Result<ManualBookingInput> {
  const v = object(value);
  if (!v || typeof v.slot_id !== "string" || !validId(v.slot_id)) return { error: "Select a session." };
  if (!string(v.name, 200, true) || !string(v.email, 254, true) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()))
    return { error: "Enter an attendee name and valid email." };
  if (!integer(v.seats, 1, 10000)) return { error: "Enter a valid seat count." };
  if (!string(v.idempotency_key, 128, true) || !/^[A-Za-z0-9_-]{16,128}$/.test(v.idempotency_key))
    return { error: "Invalid booking request ID." };
  return { data: {
    slot_id: v.slot_id, name: v.name.trim(), email: v.email.trim().toLowerCase(),
    seats: v.seats, idempotency_key: v.idempotency_key,
  } };
}
