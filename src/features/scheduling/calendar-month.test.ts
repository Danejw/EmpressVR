import { describe, expect, it } from "vitest";
import { eventOnDay, londonDay, monthCells, monthKey, shiftMonth } from "./calendar-month";

describe("Community calendar dates", () => {
  it("renders a Sunday-first November 2026 month grid", () => {
    const days = monthCells("2026-11");
    expect(days.length).toBe(35);
    expect(days[0]).toBe("2026-11-01");
    expect(days[29]).toBe("2026-11-30");
    expect(days[30]).toBeNull();
  });

  it("navigates across year boundaries", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(() => monthCells("2026-99")).toThrow();
    expect(monthKey(new Date("2026-11-20T13:00:00Z"))).toBe("2026-11");
  });

  it("handles multi-day, exclusive-end all-day events", () => {
    const event = { id: "a", title: "Retreat", start: "2026-11-01",
      end: "2026-11-03", allDay: true, url: null };
    expect(eventOnDay(event, "2026-11-01")).toBe(true);
    expect(eventOnDay(event, "2026-11-02")).toBe(true);
    expect(eventOnDay(event, "2026-11-03")).toBe(false);
  });

  it("uses Europe/London local day at DST boundaries", () => {
    expect(londonDay("2026-06-01T23:15:00Z")).toBe("2026-06-02");
    expect(londonDay("2026-12-01T23:15:00Z")).toBe("2026-12-01");
    const event = { id: "b", title: "Evening social", allDay: false, url: null,
      start: "2026-06-01T23:15:00Z", end: "2026-06-02T00:15:00Z" };
    expect(eventOnDay(event, "2026-06-02")).toBe(true);
    expect(eventOnDay(event, "2026-06-01")).toBe(false);
  });
});
