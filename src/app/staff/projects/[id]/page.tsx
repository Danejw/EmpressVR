import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { getContentImages } from "@/features/staff/editor-options";
import { ProjectEditor } from "@/components/auth/content-editors";
import { uuid, type ProjectInput } from "@/features/staff/content-validation";
export const metadata: Metadata = { title: "Edit project", robots: { index: false, follow: false } };
export default async function EditProject({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) notFound();
  const { auth } = await requireStaff();
  const [{ data: project }, { data: gallery }, images] = await Promise.all([
    auth.from("projects").select("id,title,slug,subtitle,status,sort_order,featured_media_id,page_id").eq("id", id).maybeSingle(),
    auth.from("project_media").select("media_asset_id").eq("project_id", id).order("position"),
    getContentImages(auth),
  ]);
  if (!project) notFound();
  let description = "";
  if (project.page_id) {
    const { data: page } = await auth.from("site_pages").select("body_markdown").eq("id", project.page_id).maybeSingle();
    description = page?.body_markdown ?? "";
  }
  const initial: ProjectInput = {
    id, title: project.title, slug: project.slug, subtitle: project.subtitle,
    status: project.status, sort_order: project.sort_order,
    featured_media_id: project.featured_media_id,
    gallery_media_ids: (gallery ?? []).map(item => item.media_asset_id),
    page_body_markdown: description,
  };
  return <section className="auth-page"><div className="page-container">
    <ProjectEditor initial={initial} images={images}/></div></section>;
}
