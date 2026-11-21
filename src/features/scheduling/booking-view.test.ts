import { describe, expect, it } from "vitest";
import { bookableSlots, canReviewRequest, dayInZone, formatPrice, formatSlotTime, slotsOnDay,
  type BookingOffering, type BookingSlot } from "./booking-view";

const offering: BookingOffering = {
  id: "approved", title: "VR session", description: "A class", kind: "class",
  priceMinor: 1200, currency: "GBP", acceptingBookings: true,
};
const future = new Date("2027-06-01T10:00:00.000Z");
const slot: BookingSlot = {
  id: "live", offeringId: "approved", startsAt: "2027-06-01T18:00:00.000Z",
  endsAt: "2027-06-01T19:00:00.000Z", timeZone: "Europe/London",
  capacity: 4, maxSeatsPerBooking: 2, available: true, requiresPayment: true,
};

describe("booking interface view contract", () => {
  it("shows no bookable slots without an approved, open offering", () => {
    expect(bookableSlots(null, [slot], future)).toEqual([]);
    expect(bookableSlots({ ...offering, acceptingBookings: false }, [slot], future)).toEqual([]);
    expect(bookableSlots(offering, [], future)).toEqual([]);
  });
  it("excludes expired, unavailable and misconfigured source slots", () => {
    const input = [
      slot,
      { ...slot, id: "past", startsAt: "2026-06-01T18:00:00.000Z" },
      { ...slot, id: "other", offeringId: "another" },
      { ...slot, id: "closed", available: false },
      { ...slot, id: "invalid", maxSeatsPerBooking: 5 },
      { ...slot, id: "timezone", timeZone: "Mars/Crater" },
    ];
    expect(bookableSlots(offering, input, future)).toEqual([slot]);
  });
  it("handles London time in daylight saving and standard time", () => {
    expect(dayInZone("2027-06-01T23:30:00.000Z", "Europe/London")).toBe("2027-06-02");
    expect(dayInZone("2027-01-01T23:30:00.000Z", "Europe/London")).toBe("2027-01-01");
    expect(formatSlotTime(slot)).toBe("19:00–20:00");
    expect(slotsOnDay([slot], "2027-06-01")).toEqual([slot]);
  });
  it("does not treat selections as reservations and validates contact details", () => {
    const args = { offering, slot, seats: 2, name: "Alex", email: "alex@example.com" };
    expect(canReviewRequest(args)).toBe(true);
    expect(canReviewRequest({ ...args, seats: 3 })).toBe(false);
    expect(canReviewRequest({ ...args, email: "not-an-email" })).toBe(false);
    expect(canReviewRequest({ ...args, slot: { ...slot, offeringId: "different" } })).toBe(false);
  });
  it("formats catalog prices without inventing pricing", () => {
    expect(formatPrice(1200, "GBP")).toMatch(/£12\.00/);
    expect(() => formatPrice(-10, "GBP")).toThrow();
  });
});
