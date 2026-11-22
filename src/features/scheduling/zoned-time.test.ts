import { describe,expect,it } from "vitest";
import { formatLocalInput, localToUtc } from "./zoned-time";
describe("DST-safe local calendar times",()=>{
  it("handles winter and summer in London",()=>{
    expect(localToUtc("2030-01-10T10:00","Europe/London")).toBe("2030-01-10T10:00:00.000Z");
    expect(localToUtc("2030-07-10T10:00","Europe/London")).toBe("2030-07-10T09:00:00.000Z");
    expect(formatLocalInput("2030-07-10T09:00:00.000Z","Europe/London")).toBe("2030-07-10T10:00");
  });
  it("rejects DST gaps and overlaps",()=>{
    expect(()=>localToUtc("2027-03-28T01:30","Europe/London")).toThrow();
    expect(()=>localToUtc("2027-10-31T01:30","Europe/London")).toThrow();
  });
  it("rejects invalid zones and invalid dates",()=>{
    expect(()=>localToUtc("2030-04-31T10:00","Europe/London")).toThrow();
    expect(()=>localToUtc("2030-01-10T10:00","Moon/Base")).toThrow();
  });
});
