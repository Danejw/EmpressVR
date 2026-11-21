import { describe, expect, it } from "vitest";
import { educationWithJohnBiography } from "./instructor-biography";

const education = [
  "# Education",
  "## Dominique Vyborna - DominiqueTV",
  "Dominique's existing information",
  "- ![](https://images.example.com/john.png)",
  "## John Howard - Cyrnus",
  "Experience:",
  "Education:",
].join("\n\n");

function profile(text: string): string {
  return [
    "![](https://images.example.com/john.png)",
    "## John Howard",
    "* * *",
    text,
    "[LinkedIn](https://www.linkedin.com/in/cyrnus/)",
  ].join("\n\n");
}

describe("Education instructor biography", () => {
  it("displays the canonical profile once, preserving the existing instructor photo", () => {
    const result = educationWithJohnBiography(education, profile("Develops Unity and C# applications."));
    expect(result).toContain("## Dominique Vyborna - DominiqueTV");
    expect(result).toContain("Dominique's existing information");
    expect(result).toContain("## John Howard - Cyrnus");
    expect(result.match(/john\.png/g)).toHaveLength(1);
    expect(result.match(/Develops Unity and C# applications/g)).toHaveLength(1);
    expect(result).toContain("[LinkedIn](https://www.linkedin.com/in/cyrnus/)");
    expect(result).not.toContain("Experience:\n\nEducation:");
    expect(result).not.toContain("* * *");
  });

  it("reflects edits to the published profile without editing Education", () => {
    const oldText = educationWithJohnBiography(education, profile("Original biography"));
    const updated = educationWithJohnBiography(education, profile("New biography from database"));
    expect(oldText).toContain("Original biography");
    expect(updated).toContain("New biography from database");
    expect(updated).not.toContain("Original biography");
  });

  it("does not resurrect an empty/stale biography when the profile is unpublished", () => {
    const result = educationWithJohnBiography(education, null);
    expect(result).toContain("## John Howard - Cyrnus");
    expect(result).not.toContain("Experience:");
    expect(result).not.toContain("Education:");
  });

  it("keeps other sections after John's profile", () => {
    const extended = education + "\n\n## Another Instructor\n\nOther person's biography";
    const result = educationWithJohnBiography(extended, profile("John's bio"));
    expect(result).toContain("John's bio");
    expect(result).toContain("## Another Instructor\n\nOther person's biography");
  });
});
