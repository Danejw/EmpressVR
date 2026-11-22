import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { getContentImages } from "@/features/staff/editor-options";
import { TeamEditor } from "@/components/auth/content-editors";
import { uuid, slugify, type TeamInput } from "@/features/staff/content-validation";
export const metadata: Metadata = { title: "Edit team profile", robots: { index: false, follow: false } };
export default async function EditTeam({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.test(id)) notFound();
  const { auth } = await requireStaff();
  const [{ data: person }, images] = await Promise.all([
    auth.from("team_members").select("id,name,slug,roles,group_name,external_url,headshot_media_id,sort_order,page_id").eq("id", id).maybeSingle(),
    getContentImages(auth),
  ]);
  if (!person) notFound();
  let description = "";
  if (person.page_id) {
    const { data: page } = await auth.from("site_pages").select("body_markdown").eq("id", person.page_id).maybeSingle();
    description = page?.body_markdown ?? "";
  }
  const initial: TeamInput = {
    id, name: person.name, slug: person.slug || slugify(person.name), roles: person.roles as string[],
    group_name: person.group_name, external_url: person.external_url,
    headshot_media_id: person.headshot_media_id, sort_order: person.sort_order,
    page_body_markdown: description,
  };
  return <section className="auth-page"><div className="page-container">
    <TeamEditor initial={initial} images={images}/></div></section>;
}
