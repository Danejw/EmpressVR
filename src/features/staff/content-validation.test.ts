import { describe, expect, it } from "vitest";
import { validateProject, validateTeam } from "./content-validation";

const project = { title: "Example", slug: "example", subtitle: "", status: "draft",
  featured_media_id: null, sort_order: 0, gallery_media_ids: [], page_body_markdown: "" };
const member = { name: "Example", slug: "example", roles: ["Artist"], group_name: "current",
  external_url: null, headshot_media_id: null, sort_order: 0, page_body_markdown: "" };
describe("staff content input validation", () => {
  it("accepts valid project and team records", () => {
    expect(validateProject(project).data).toBeTruthy();
    expect(validateTeam(member).data).toBeTruthy();
  });
  it("rejects unsafe slug and role group", () => {
    expect(validateProject({ ...project, slug: "../oops" }).error).toBeTruthy();
    expect(validateTeam({ ...member, group_name: "admin" }).error).toBeTruthy();
  });
  it("rejects invalid links and duplicate media", () => {
    expect(validateTeam({ ...member, external_url: "javascript:alert(1)" }).error).toBeTruthy();
    const id = "a8f45e72-5952-4ec3-86d5-e0baba58be26";
    expect(validateProject({ ...project, gallery_media_ids: [id, id] }).error).toBeTruthy();
  });
});
