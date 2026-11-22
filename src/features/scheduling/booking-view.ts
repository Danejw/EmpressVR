import { monthCells } from "./calendar-month";

export type BookingOffering = Readonly<{
  id: string;
  title: string;
  description: string;
  kind: "class" | "appointment";
  priceMinor: number;
  currency: string;
  acceptingBookings: boolean;
}>;

export type BookingSlot = Readonly<{
  id: string;
  offeringId: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  capacity: number;
  maxSeatsPerBooking: number;
  available: boolean;
  requiresPayment: boolean;
  remainingSeats?: number;
}>;

export type ArchivedCourse = Readonly<{
  id: string;
  slug: string;
  title: string;
  description: string;
  priceMinor: number;
  currency: string;
  soldOut: boolean;
}>;

export function dayInZone(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid slot timestamp");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return part("year") + "-" + part("month") + "-" + part("day");
}

/** Show only source-verified future slots belonging to approved, open offerings. */
export function bookableSlots(
  offering: BookingOffering | null,
  slots: readonly BookingSlot[],
  now: Date,
): BookingSlot[] {
  if (!offering || !offering.acceptingBookings) return [];
  return slots.filter((slot) => {
    const start = Date.parse(slot.startsAt);
    const end = Date.parse(slot.endsAt);
    if (slot.offeringId !== offering.id || !slot.available ||
        !Number.isFinite(start) || !Number.isFinite(end) || start <= now.getTime() ||
        end <= start || !Number.isSafeInteger(slot.capacity) || slot.capacity < 1 ||
        !Number.isSafeInteger(slot.maxSeatsPerBooking) ||
        slot.maxSeatsPerBooking < 1 || slot.maxSeatsPerBooking > slot.capacity ||
        typeof slot.requiresPayment !== "boolean" || slot.requiresPayment ||
        (slot.remainingSeats !== undefined && (
          !Number.isSafeInteger(slot.remainingSeats) || slot.remainingSeats < 1 ||
          slot.remainingSeats > slot.capacity))) return false;
    try { dayInZone(slot.startsAt, slot.timeZone); }
    catch { return false; }
    return true;
  }).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}

export function slotsOnDay(slots: readonly BookingSlot[], day: string): BookingSlot[] {
  return slots.filter((slot) => dayInZone(slot.startsAt, slot.timeZone) === day);
}

export function formatSlotTime(slot: BookingSlot): string {
  const display = new Intl.DateTimeFormat("en-GB", {
    timeZone: slot.timeZone, hour: "2-digit", minute: "2-digit",
  });
  return display.format(new Date(slot.startsAt)) + "–" +
    display.format(new Date(slot.endsAt));
}

export function formatPrice(amountMinor: number, currency: string): string {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0 ||
      !/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid price");
  return new Intl.NumberFormat("en-GB", { style: "currency", currency })
    .format(amountMinor / 100);
}

export function canReviewRequest({
  offering, slot, seats, name, email,
}: {
  offering: BookingOffering | null;
  slot: BookingSlot | null;
  seats: number;
  name: string;
  email: string;
}): boolean {
  return Boolean(offering && slot && offering.acceptingBookings &&
    slot.offeringId === offering.id && slot.available &&
    Number.isInteger(seats) && seats >= 1 && seats <= slot.maxSeatsPerBooking &&
    name.trim().length >= 1 && name.trim().length <= 200 &&
    email.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
}

export { monthCells };
