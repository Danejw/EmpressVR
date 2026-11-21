import { describe, expect, it } from "vitest";
import { authCallbackDestination } from "./callback-destination";

describe("safe auth callback routing", () => {
  it("allows only intended internal routes", () => {
    expect(authCallbackDestination("/account")).toBe("/account");
    expect(authCallbackDestination("/login?verified=1")).toBe("/login?verified=1");
    expect(authCallbackDestination("/reset-password")).toBe("/reset-password");
    expect(authCallbackDestination("https://evil.example")).toBe("/account");
    expect(authCallbackDestination("//evil.example")).toBe("/account");
    expect(authCallbackDestination("/staff")).toBe("/account");
    expect(authCallbackDestination(null)).toBe("/account");
  });
});
