import { describe, expect, it } from "vitest";
import { validateOffering, validateSession, validateManualBooking } from "./admin-validation";
const offering = {
  title: "XR Workshop", slug: "xr-workshop", kind: "class",
  description: "", price_minor: 0, currency: "GBP", published: false,
};
const session = {
  offering_id: "a8f45e72-5952-4ec3-86d5-e0baba58be26",
  starts_at: "2030-04-10T10:00:00.000Z", ends_at: "2030-04-10T11:00:00.000Z",
  time_zone: "Europe/London", capacity: 10, max_seats_per_booking: 2,
  available: false, requires_payment: false,
};
describe("booking admin server inputs", () => {
  it("accepts draft offering and rejects invalid publish values", () => {
    expect(validateOffering(offering).data?.slug).toBe("xr-workshop");
    expect(validateOffering({ ...offering, kind: "other" }).error).toBeTruthy();
    expect(validateOffering({ ...offering, price_minor: -2 }).error).toBeTruthy();
    expect(validateOffering({ ...offering, slug: "../foo" }).error).toBeTruthy();
  });
  it("validates session range, zone, and capacity", () => {
    expect(validateSession(session,new Date("2029-01-01")).data?.capacity).toBe(10);
    expect(validateSession({ ...session, time_zone: "Mars/Phobos" },new Date("2029-01-01")).error).toBeTruthy();
    expect(validateSession({ ...session, capacity: 1 },new Date("2029-01-01")).error).toBeTruthy();
    expect(validateSession({ ...session, starts_at: session.ends_at },new Date("2029-01-01")).error).toBeTruthy();
  });
  it("validates manual reservations and rejects invalid contacts", () => {
    const request = { slot_id: session.offering_id, name: "Guest", email: "guest@example.org",
      seats: 1, idempotency_key: "abnormalbookingkey123" };
    expect(validateManualBooking(request).data?.name).toBe("Guest");
    expect(validateManualBooking({ ...request, email: "x" }).error).toBeTruthy();
  });
});
