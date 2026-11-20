import { describe, expect, it } from "vitest";
import {
  BookingRuleError, requestBookingHold, transitionBooking,
  type BookingRecord, type BookingStore, type HoldRequest, type Slot,
} from "./domain";

const clock = new Date("2026-11-20T12:00:00.000Z");
const slot: Slot = {
  id: "slot_1", offeringId: "offering_1",
  startsAt: "2026-11-20T13:00:00.000Z", endsAt: "2026-11-20T14:00:00.000Z",
  timeZone: "Europe/London", capacity: 3, maxSeatsPerBooking: 2,
  available: true, requiresPayment: false,
};
const request: HoldRequest = {
  offeringId: "offering_1", slotId: "slot_1", attendeeRef: "user_1",
  seats: 1, idempotencyKey: "idempotency_key_001",
};

function fixture(override: Partial<Slot> = {}) {
  const actualSlot = { ...slot, ...override };
  let last: BookingRecord | null = null;
  const catalog = { getSlot: async () => actualSlot };
  const store: BookingStore = {
    async reserveAtomically(command) {
      last = { ...command, id: "booking_1", status: "held", paymentOrderId: null };
      return last;
    },
  };
  return { catalog, store, last: () => last };
}
const rejectsCode = (code: string) => (error: unknown) =>
  error instanceof BookingRuleError && error.code === code;

describe("booking requests and lifecycle", () => {
  it("uses authoritative slot limits and stores a bounded 15-minute hold", async () => {
    const f = fixture();
    const hold = await requestBookingHold(request, f.catalog, f.store, clock);
    expect(hold.status).toBe("held");
    expect(hold.createdAt).toBe(clock.toISOString());
    expect(hold.expiresAt).toBe("2026-11-20T12:15:00.000Z");
    expect(f.last()).toEqual(hold);
  });

  it("caps hold expiry at the beginning of the event", async () => {
    const f = fixture({ startsAt: "2026-11-20T12:07:00.000Z" });
    const hold = await requestBookingHold(request, f.catalog, f.store, clock);
    expect(hold.expiresAt).toBe("2026-11-20T12:07:00.000Z");
  });

  it("rejects unavailable, past and mismatched slots", async () => {
    for (const override of [
      { available: false }, { startsAt: "2026-11-20T11:00:00.000Z" },
    ]) {
      const f = fixture(override);
      await expect(requestBookingHold(request, f.catalog, f.store, clock))
        .rejects.toSatisfy(rejectsCode("unavailable"));
    }
    const f = fixture({ offeringId: "other_offering" });
    await expect(requestBookingHold(request, f.catalog, f.store, clock))
      .rejects.toSatisfy(rejectsCode("mismatched_offering"));
    await expect(requestBookingHold(request, { getSlot: async () => null }, f.store, clock))
      .rejects.toSatisfy(rejectsCode("unavailable"));
  });

  it("checks capacities, time zones and canonical timestamps", async () => {
    for (const override of [
      { capacity: 0 }, { maxSeatsPerBooking: 4 }, { timeZone: "Mars/Olympus" },
      { startsAt: "Nov 20, 2026" }, { endsAt: "2026-11-20T12:00:00.000Z" },
    ]) {
      const f = fixture(override);
      await expect(requestBookingHold(request, f.catalog, f.store, clock))
        .rejects.toSatisfy(rejectsCode("invalid_slot"));
    }
  });

  it("rejects client seat limits, missing identifiers and bad hold settings", async () => {
    const f = fixture();
    for (const seats of [0, -1, 1.5, 3]) {
      await expect(requestBookingHold({ ...request, seats }, f.catalog, f.store, clock))
        .rejects.toBeInstanceOf(BookingRuleError);
    }
    await expect(requestBookingHold({ ...request, idempotencyKey: "short" }, f.catalog, f.store, clock))
      .rejects.toSatisfy(rejectsCode("invalid_input"));
    await expect(requestBookingHold(request, f.catalog, f.store, clock, 0))
      .rejects.toSatisfy(rejectsCode("invalid_configuration"));
  });

  it("cannot confirm paid bookings without a matching trusted paid order", async () => {
    const f = fixture({ requiresPayment: true });
    const hold = await requestBookingHold(request, f.catalog, f.store, clock);
    const tied = { ...hold, paymentOrderId: "order_1" };
    expect(() => transitionBooking(tied, "confirm", clock)).toThrow(BookingRuleError);
    expect(() => transitionBooking(tied, "confirm", clock, "order_other")).toThrow(BookingRuleError);
    expect(transitionBooking(tied, "confirm", clock, "order_1").status).toBe("confirmed");
  });

  it("supports idempotent confirmation/cancellation and terminal expiry", async () => {
    const f = fixture();
    const hold = await requestBookingHold(request, f.catalog, f.store, clock);
    const confirmed = transitionBooking(hold, "confirm", clock);
    expect(transitionBooking(confirmed, "confirm", clock)).toBe(confirmed);
    const cancelled = transitionBooking(confirmed, "cancel", clock);
    expect(transitionBooking(cancelled, "cancel", clock)).toBe(cancelled);
    expect(() => transitionBooking(cancelled, "confirm", clock)).toThrow(BookingRuleError);
    const later = new Date("2026-11-20T12:16:00.000Z");
    const expired = transitionBooking(hold, "expire", later);
    expect(expired.status).toBe("expired");
    expect(() => transitionBooking(expired, "confirm", later)).toThrow(BookingRuleError);
    expect(() => transitionBooking(hold, "confirm", later)).toThrow(BookingRuleError);
    expect(() => transitionBooking(hold, "expire", clock)).toThrow(BookingRuleError);
  });

  it("specifies capacity and idempotency semantics for a future atomic store", async () => {
    // Test-only ledger demonstrates the transaction contract without pretending
    // to provide a production database lock or provider availability.
    const booked = new Map<string, BookingRecord>();
    let heldSeats = 0;
    const store: BookingStore = {
      async reserveAtomically(command) {
        const existing = booked.get(command.idempotencyKey);
        if (existing) {
          if (existing.attendeeRef !== command.attendeeRef || existing.seats !== command.seats) {
            throw new BookingRuleError("idempotency_conflict", "Key reused for different request");
          }
          return existing;
        }
        if (heldSeats + command.seats > slot.capacity) {
          throw new BookingRuleError("full", "No seats remain");
        }
        heldSeats += command.seats;
        const created: BookingRecord = {
          ...command, id: "booking_" + booked.size, status: "held", paymentOrderId: null,
        };
        booked.set(command.idempotencyKey, created);
        return created;
      },
    };
    const catalog = { getSlot: async () => slot };
    const inputs = [request, request,
      { ...request, attendeeRef: "user_2", idempotencyKey: "idempotency_key_002", seats: 2 }];
    const [first, replay, second] = await Promise.all(
      inputs.map(input => requestBookingHold(input, catalog, store, clock)));
    expect(first.id).toBe(replay.id);
    expect(second.seats).toBe(2);
    expect(heldSeats).toBe(3);
    await expect(requestBookingHold(
      { ...request, attendeeRef: "user_3", idempotencyKey: "idempotency_key_003" },
      catalog, store, clock,
    )).rejects.toSatisfy(rejectsCode("full"));
  });
});
