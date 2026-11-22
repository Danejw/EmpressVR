import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/staff";
import { getContentImages } from "@/features/staff/editor-options";
import { TeamEditor } from "@/components/auth/content-editors";
export const metadata: Metadata = { title: "New team profile", robots: { index: false, follow: false } };
export default async function NewTeam() {
  const { auth } = await requireStaff();
  const images = await getContentImages(auth);
  return <section className="auth-page"><div className="page-container"><TeamEditor images={images}/></div></section>;
}
