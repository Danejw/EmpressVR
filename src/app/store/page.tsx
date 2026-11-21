import type { Metadata } from "next";
import Link from "next/link";
import { MediaImage } from "@/components/media-image";
import { getStoreCatalog } from "@/features/commerce/store-catalog";
import { StoreAddButton } from "@/components/store-add-button";

export const metadata: Metadata = {
  title: "Store",
  description: "Browse EmpressVR creative products and classes.",
  alternates: { canonical: "/store" },
};

export default function Store() {
  return <section className="store-page">
    <div className="page-container">
      <div className="store-heading">
        <h1>Store</h1>
        <div className="store-heading-links"><Link href="/store/masks">Categories: Masks</Link><Link href="/cart">View cart</Link></div>
      </div>
      <div className="store-grid">
        {getStoreCatalog().map(product => {
          const local = "/store/p/" + product.slug;
          const price = new Intl.NumberFormat("en-GB",{style:"currency",currency:product.currency})
            .format(product.priceMinor/100);
          return <article className="store-card" key={product.id}>
            <Link href={local} className="store-card-image" aria-label={"View " + product.title}>
              <MediaImage assetId={product.featuredMediaId} alt={product.title} />
            </Link>
            <div className="store-card-details">
              <h2><Link href={local}>{product.title}</Link></h2>
              <p>{product.description}</p>
              <strong>{price}</strong>
              <StoreAddButton productId={product.id} />
              <Link className="store-detail-link" href={local}>Product details</Link>
            </div>
          </article>;
        })}
      </div>
    </div>
  </section>;
}
