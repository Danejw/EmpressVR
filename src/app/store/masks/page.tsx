import type { Metadata } from "next";
import { StoreCategory } from "@/components/detail-templates";
import { getStoreCatalog } from "@/features/commerce/store-catalog";

export const metadata: Metadata = { title: "Masks" };

export default async function Masks() {
  const products = await getStoreCatalog();
  return <article className="legacy-page"><div className="page-container">
    <StoreCategory products={products}/>
  </div></article>;
}
