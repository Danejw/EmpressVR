import { describe, expect, it } from "vitest";
import { isStaffRole, normalizedInviteEmail } from "./permissions";

describe("role and invitation input validation", () => {
  it("recognizes only roles assigned in the staff_roles table", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("editor")).toBe(true);
    expect(isStaffRole("member")).toBe(false);
    expect(isStaffRole({ role: "admin" })).toBe(false);
  });
  it("canonicalizes invite emails and rejects invalid input", () => {
    expect(normalizedInviteEmail("  Staff@Example.COM ")).toBe("staff@example.com");
    expect(normalizedInviteEmail("not-an-email")).toBeNull();
    expect(normalizedInviteEmail("a".repeat(260) + "@example.com")).toBeNull();
  });
});
