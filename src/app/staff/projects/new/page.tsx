import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/staff";
import { getContentImages } from "@/features/staff/editor-options";
import { ProjectEditor } from "@/components/auth/content-editors";
export const metadata: Metadata = { title: "New project", robots: { index: false, follow: false } };
export default async function NewProject() {
  const { auth } = await requireStaff();
  const images = await getContentImages(auth);
  return <section className="auth-page"><div className="page-container"><ProjectEditor images={images}/></div></section>;
}
