/**
 * Reservation domain. No browser endpoint or provider writes are exposed.
 * ASVS 2.2.1/2.2.2: validate inputs at the trusted service boundary.
 * ASVS 2.3.3/2.3.4: the eventual database must reserve capacity atomically.
 */
export type Slot = Readonly<{
  id: string;
  offeringId: string;
  startsAt: string; // canonical UTC ISO timestamp
  endsAt: string;
  timeZone: string; // IANA zone, e.g. Europe/London for local display
  capacity: number;
  maxSeatsPerBooking: number;
  available: boolean;
  requiresPayment: boolean;
}>;

export type HoldRequest = Readonly<{
  offeringId: string;
  slotId: string;
  attendeeRef: string; // opaque server-authorized identity; never an email
  seats: number;
  idempotencyKey: string;
}>;

export type HoldCommand = HoldRequest & Readonly<{
  createdAt: string;
  expiresAt: string;
  requiresPayment: boolean;
}>;

export type BookingStatus = "held" | "confirmed" | "cancelled" | "expired";

export type BookingRecord = Readonly<HoldCommand & {
  id: string;
  status: BookingStatus;
  paymentOrderId: string | null;
}>;

/** This implementation is a required transactional boundary, not a stub.
 * The future Supabase adapter must lock the slot / use an atomic DB function,
 * count unexpired holds and confirmed seats, enforce unique idempotency keys
 * with payload conflict checks, then insert the hold in the SAME transaction.
 */
export interface BookingStore {
  reserveAtomically(command: HoldCommand): Promise<BookingRecord>;
}

export interface SlotCatalog {
  getSlot(slotId: string): Promise<Slot | null>;
}

export class BookingRuleError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "BookingRuleError";
  }
}

function requireRef(value: string, label: string, minLength = 1): void {
  if (typeof value !== "string" || value.length < minLength ||
      value.length > 128 || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)) {
    throw new BookingRuleError("invalid_input", `Invalid ${label}`);
  }
}

function utcTime(value: string): number {
  const time = typeof value === "string" ? Date.parse(value) : NaN;
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) {
    throw new BookingRuleError("invalid_slot", "Slot timestamps must be canonical UTC ISO strings");
  }
  return time;
}

function checkSlot(slot: Slot, request: HoldRequest, now: number): number {
  requireRef(slot.id, "slot ID");
  requireRef(slot.offeringId, "offering ID");
  if (slot.id !== request.slotId || slot.offeringId !== request.offeringId) {
    throw new BookingRuleError("mismatched_offering", "Slot does not belong to the selected offering");
  }
  if (!Number.isSafeInteger(slot.capacity) || slot.capacity < 1 ||
      !Number.isSafeInteger(slot.maxSeatsPerBooking) || slot.maxSeatsPerBooking < 1 ||
      slot.maxSeatsPerBooking > slot.capacity ||
      typeof slot.requiresPayment !== "boolean" ||
      typeof slot.available !== "boolean") {
    throw new BookingRuleError("invalid_slot", "Slot configuration is invalid");
  }
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: slot.timeZone }).format();
  } catch {
    throw new BookingRuleError("invalid_slot", "Invalid slot time zone");
  }
  const start = utcTime(slot.startsAt);
  const end = utcTime(slot.endsAt);
  if (end <= start) throw new BookingRuleError("invalid_slot", "Slot end must follow start");
  if (!slot.available || start <= now) {
    throw new BookingRuleError("unavailable", "This slot is no longer bookable");
  }
  if (request.seats > slot.maxSeatsPerBooking) {
    throw new BookingRuleError("seat_limit", "Requested seats exceed the booking limit");
  }
  return start;
}

/** Performs deterministic checks, then delegates the race-sensitive step to persistence. */
export async function requestBookingHold(
  request: HoldRequest,
  catalog: SlotCatalog,
  store: BookingStore,
  now: Date,
  holdMinutes = 15,
): Promise<BookingRecord> {
  requireRef(request.offeringId, "offering ID");
  requireRef(request.slotId, "slot ID");
  requireRef(request.attendeeRef, "attendee reference");
  requireRef(request.idempotencyKey, "idempotency key", 16);
  if (!Number.isSafeInteger(request.seats) || request.seats < 1) {
    throw new BookingRuleError("invalid_input", "Seats must be a positive integer");
  }
  if (!Number.isInteger(holdMinutes) || holdMinutes < 1 || holdMinutes > 60) {
    throw new BookingRuleError("invalid_configuration", "Hold duration must be 1-60 minutes");
  }
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) throw new BookingRuleError("invalid_configuration", "Invalid clock");
  const slot = await catalog.getSlot(request.slotId);
  if (!slot) throw new BookingRuleError("unavailable", "This slot is not available");
  const startsAt = checkSlot(slot, request, nowMs);
  const command: HoldCommand = {
    ...request,
    createdAt: now.toISOString(),
    expiresAt: new Date(Math.min(startsAt, nowMs + holdMinutes * 60_000)).toISOString(),
    requiresPayment: slot.requiresPayment,
  };
  return store.reserveAtomically(command);
}

export type BookingAction = "confirm" | "cancel" | "expire";

/**
 * Pure lifecycle decision. Call from an authorized server-side transaction.
 * For paid bookings, paymentOrderId is assigned by trusted persistence and the
 * matching order MUST have been settled by a signature-verified webhook.
 * Never expose trustedPaidOrderId as a client-supplied HTTP argument.
 */
export function transitionBooking(
  booking: BookingRecord,
  action: BookingAction,
  now: Date,
  trustedPaidOrderId?: string,
): BookingRecord {
  const time = now.getTime();
  if (!Number.isFinite(time)) throw new BookingRuleError("invalid_configuration", "Invalid clock");
  if (action === "confirm") {
    if (booking.status === "confirmed") return booking;
    if (booking.status !== "held" || time >= utcTime(booking.expiresAt)) {
      throw new BookingRuleError("invalid_transition", "Booking hold cannot be confirmed");
    }
    if (booking.requiresPayment &&
        (!booking.paymentOrderId || booking.paymentOrderId !== trustedPaidOrderId)) {
      throw new BookingRuleError("payment_required", "A matching verified paid order is required");
    }
    return { ...booking, status: "confirmed" };
  }
  if (action === "cancel") {
    if (booking.status === "cancelled") return booking;
    if (booking.status !== "held" && booking.status !== "confirmed") {
      throw new BookingRuleError("invalid_transition", "Booking cannot be cancelled");
    }
    return { ...booking, status: "cancelled" };
  }
  if (action === "expire") {
    if (booking.status === "expired") return booking;
    if (booking.status !== "held" || time < utcTime(booking.expiresAt)) {
      throw new BookingRuleError("invalid_transition", "Only expired holds can be released");
    }
    return { ...booking, status: "expired" };
  }
  throw new BookingRuleError("invalid_transition", "Unknown booking action");
}
