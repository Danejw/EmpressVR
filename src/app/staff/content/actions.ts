"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/staff";
import { validateProject, validateTeam } from "@/features/staff/content-validation";

export type SaveContentResult = { ok: true; id: string } | { ok: false; error: string };
const fail = (error: string): SaveContentResult => ({ ok: false, error });
type StaffAuth = Awaited<ReturnType<typeof requireStaff>>["auth"];

// ASVS 1.2.4, 2.2.2: parameterized database operations, server validation, MFA and RLS.
async function saveLinkedPage(
  auth: StaffAuth, pageId: string | null, kind: "project" | "team",
  id: string, slug: string, title: string, body: string, published: boolean,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const updated_at = new Date().toISOString();
  if (pageId) {
    const { data: page, error: readError } = await auth.from("site_pages")
      .select("source_key").eq("id", pageId).maybeSingle();
    if (readError || !page) return { ok: false, error: "Linked page not found." };
    // Do not change the URL or publication state of imported legacy pages.
    const fields = page.source_key === "staff_" + kind + "__" + id
      ? { title, body_markdown: body, published, updated_at }
      : { body_markdown: body, updated_at };
    const { error } = await auth.from("site_pages").update(fields).eq("id", pageId);
    return error ? { ok: false, error: "Page update failed." } : { ok: true, id: pageId };
  }
  const newId = crypto.randomUUID();
  const { error } = await auth.from("site_pages").insert({
    id: newId, source_key: "staff_" + kind + "__" + id,
    path: "/" + (kind === "project" ? "projects" : "team") + "/" + slug,
    title, body_markdown: body, published, updated_at,
  });
  return error ? { ok: false, error: "Page creation failed." } : { ok: true, id: newId };
}

export async function saveProject(value: unknown): Promise<SaveContentResult> {
  const check = validateProject(value);
  if (!check.data) return fail(check.error ?? "Invalid project.");
  const input = check.data;
  const { auth } = await requireStaff();
  const id = input.id ?? crypto.randomUUID();
  let previous: { slug: string; page_id: string | null } | null = null;
  if (input.id) {
    const { data, error } = await auth.from("projects").select("slug,page_id")
      .eq("id", id).maybeSingle();
    if (error || !data) return fail("Project not found.");
    previous = data;
    if (previous.slug !== input.slug) return fail("Project URLs cannot be changed after creation.");
  }
  const fields = { title: input.title, slug: input.slug, subtitle: input.subtitle,
    featured_media_id: input.featured_media_id, status: input.status,
    sort_order: input.sort_order, updated_at: new Date().toISOString() };
  const { error: saveError } = input.id
    ? await auth.from("projects").update(fields).eq("id", id)
    : await auth.from("projects").insert({ ...fields, id });
  if (saveError) return fail(saveError.code === "23505" ? "That project URL is in use." : "Could not save project.");

  if (input.page_body_markdown.trim() || previous?.page_id) {
    const page = await saveLinkedPage(auth, previous?.page_id ?? null, "project", id,
      input.slug, input.title, input.page_body_markdown, input.status === "published");
    if (!page.ok) return fail("Project saved, but description could not be saved.");
    if (!previous?.page_id) {
      const { error } = await auth.from("projects").update({ page_id: page.id }).eq("id", id);
      if (error) return fail("Project saved, but page could not be linked.");
    }
  }
  const { data: existing, error: readError } = await auth.from("project_media")
    .select("id,media_asset_id,position").eq("project_id", id).order("position");
  if (readError) return fail("Project saved, but gallery could not be loaded.");
  const current = existing ?? [];
  for (const item of current) {
    if (!input.gallery_media_ids.includes(item.media_asset_id)) {
      const { error } = await auth.from("project_media").delete().eq("id", item.id);
      if (error) return fail("Project saved, but gallery removal failed.");
    }
  }
  for (const [position, media_asset_id] of input.gallery_media_ids.entries()) {
    const item = current.find(row => row.media_asset_id === media_asset_id);
    const result = item
      ? item.position === position ? { error: null } :
        await auth.from("project_media").update({ position }).eq("id", item.id)
      : await auth.from("project_media").insert({
          id: crypto.randomUUID(), project_id: id, media_asset_id, position,
        });
    if (result.error) return fail("Project saved, but gallery update failed.");
  }
  revalidatePath("/staff"); revalidatePath("/staff/projects");
  revalidatePath("/staff/projects/" + id); revalidatePath("/projects");
  revalidatePath("/projects/" + input.slug); revalidatePath("/" + input.slug);
  return { ok: true, id };
}

export async function saveTeam(value: unknown): Promise<SaveContentResult> {
  const check = validateTeam(value);
  if (!check.data) return fail(check.error ?? "Invalid profile.");
  const input = check.data;
  const { auth } = await requireStaff();
  const id = input.id ?? crypto.randomUUID();
  let previous: { slug: string | null; page_id: string | null } | null = null;
  if (input.id) {
    const { data, error } = await auth.from("team_members").select("slug,page_id")
      .eq("id", id).maybeSingle();
    if (error || !data) return fail("Team profile not found.");
    previous = data;
    if (previous.slug && previous.slug !== input.slug)
      return fail("Profile URLs cannot be changed after creation.");
  }
  const fields = { name: input.name, slug: input.slug,
    external_url: input.external_url, roles: input.roles, group_name: input.group_name,
    headshot_media_id: input.headshot_media_id, sort_order: input.sort_order,
    updated_at: new Date().toISOString() };
  const { error: saveError } = input.id
    ? await auth.from("team_members").update(fields).eq("id", id)
    : await auth.from("team_members").insert({ ...fields, id });
  if (saveError) return fail(saveError.code === "23505" ? "That profile URL is in use." : "Could not save profile.");

  if (input.page_body_markdown.trim() || previous?.page_id) {
    const page = await saveLinkedPage(auth, previous?.page_id ?? null, "team", id,
      input.slug, input.name, input.page_body_markdown, true);
    if (!page.ok) return fail("Profile saved, but biography could not be saved.");
    if (!previous?.page_id) {
      const { error } = await auth.from("team_members").update({ page_id: page.id }).eq("id", id);
      if (error) return fail("Profile saved, but biography could not be linked.");
    }
  }
  revalidatePath("/staff"); revalidatePath("/staff/team");
  revalidatePath("/staff/team/" + id); revalidatePath("/who-we-are");
  revalidatePath("/team/" + input.slug); revalidatePath("/" + input.slug);
  return { ok: true, id };
}
