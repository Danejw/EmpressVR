import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/detail-templates";
import { getStoreCatalog } from "@/features/commerce/store-catalog";
import { readLegacyPage } from "@/lib/legacy-pages";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getStoreCatalog()).find(item => item.slug === slug);
  return {title: product?.title || "Product"};
}
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = (await getStoreCatalog()).find(item => item.slug === slug);
  if (!product) notFound();
  const markdown = await readLegacyPage("store__p__" + slug);
  return <article className="legacy-page"><div className="page-container">
    <ProductDetail product={product} markdown={markdown ?? ""}/>
  </div></article>;
}
