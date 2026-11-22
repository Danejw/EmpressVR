import { describe, expect, it } from "vitest";
import { minimumStartLocal, minimumEndLocal } from "./future-session";
import { supportedTimeZoneOptions } from "./time-zone-options";

describe("future-only appointment input limits", () => {
  it("computes the minimum in the selected IANA time zone", () => {
    const now="2026-11-21T20:00:00.000Z";
    expect(minimumStartLocal(now,"Pacific/Honolulu")).toBe("2026-11-21T10:01");
    expect(minimumStartLocal(now,"Europe/London")).toBe("2026-11-21T20:01");
  });
  it("end time cannot precede the future start", () => {
    const now="2026-11-21T20:00:00.000Z";
    expect(minimumEndLocal(now,"Europe/London","2026-11-22T10:30")).toBe("2026-11-22T10:31");
    expect(minimumEndLocal(now,"Europe/London","2026-11-20T09:00")).toBe("2026-11-21T20:01");
  });
  it("supports Honolulu, London, UTC and the runtime's canonical IANA zones", () => {
    const values = supportedTimeZoneOptions().map(option => option.value);
    for (const zone of ["Pacific/Honolulu","Europe/London","America/New_York","UTC"])
      expect(values).toContain(zone);
    expect(new Set(values).size).toBe(values.length);
  });
});
