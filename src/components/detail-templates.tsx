import Link from "next/link";
import { PageSections } from "@/components/page-sections";
import { MediaImage } from "@/components/media-image";
import { StoreAddButton } from "@/components/store-add-button";
import { displayMoney } from "@/features/commerce/cart";
import { getPublicPageGallery, getPublicProductGallery } from "@/features/content/supabase-public";
import { getPages } from "@/features/content/repository";
import { cleanLegacyContent, sectionsFromMarkdown } from "@/features/content/page-sections";
import type { StoreProduct } from "@/features/commerce/cart";

export async function ArtworkDetail({ keyName, markdown }: { keyName: string; markdown: string }) {
  const page = getPages().find(item => item.source_key === keyName);
  const imageIds = page ? await getPublicPageGallery(page.id) : [];
  const heading = keyName === "projects-metalwork" ? "Metalwork" : "Digital 2D Art";
  const fallback = sectionsFromMarkdown(markdown);
  const gallery = imageIds.length ? [{ type: "gallery" as const, images: imageIds.map(assetId => ({
    assetId, alt: heading + " by Dominique Vyborna",
  })) }] : fallback.filter(item => item.type === "gallery");
  return <div className="detail-page">
    <Link className="detail-back" href="/about">← Back to About</Link>
    <h1>{heading}</h1>
    <p>Artwork by <Link href="/dominique-vyborna">Dominique Vyborna</Link></p>
    <PageSections sections={gallery}/>
  </div>;
}

export async function ProductDetail({ product, markdown }: { product: StoreProduct; markdown: string }) {
  const ids = await getPublicProductGallery(product.id);
  const text = product.slug === "fox-mask-stl-file-for-3d-printing"
    ? markdown.match(/(This fox mask was created[\s\S]*?)(?=\s+Add To Cart)/)?.[1]?.trim()
    : product.description;
  const sections = [{ type: "rich_text" as const,
    markdown: cleanLegacyContent("product", text || product.description) }];
  return <div className="detail-page product-detail">
    <Link className="detail-back" href="/store">← Back to Store</Link>
    <h1>{product.title}</h1>
    <strong className="product-price">{displayMoney(product.priceMinor, product.currency)}</strong>
    <StoreAddButton productId={product.id}/>
    {ids.length ? <div className="product-gallery">
      {ids.map((assetId, index) => <MediaImage key={assetId} assetId={assetId}
        className="gallery-image" alt={product.title + " image " + (index + 1)} loading={index === 0 ? "eager" : "lazy"}/>)}
    </div> : null}
    <PageSections sections={sections}/>
    <p className="legacy-checkout-note">Checkout is still a preview. Payment is not collected on this site yet.</p>
  </div>;
}

export async function StoreCategory({ products }: { products: StoreProduct[] }) {
  const filtered = products.filter(item => item.slug.includes("mask"));
  return <div className="detail-page">
    <Link className="detail-back" href="/store">← All products</Link>
    <h1>Masks</h1>
    <p>{filtered.length} {filtered.length === 1 ? "result" : "results"}</p>
    {filtered.length ? <div className="store-grid">{filtered.map(item => <article className="store-card" key={item.id}>
      <Link className="store-card-image" href={"/store/p/" + item.slug}>
        <MediaImage assetId={item.featuredMediaId} alt={item.title}/>
      </Link>
      <div className="store-card-details">
        <h2><Link href={"/store/p/" + item.slug}>{item.title}</Link></h2>
        <p>{item.description}</p><strong>{displayMoney(item.priceMinor, item.currency)}</strong>
        <StoreAddButton productId={item.id}/>
      </div>
    </article>)}</div> : <p>No results found.</p>}
  </div>;
}
