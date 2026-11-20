import Link from "next/link";
import { MediaImage } from "@/components/media-image";
import { getProducts } from "@/features/content/repository";

export default function Store() {
  return <section className="store-page">
    <div className="page-container">
      <div className="store-heading">
        <h1>Store</h1>
        <Link href="/store/masks">Categories: Masks</Link>
      </div>
      <div className="store-grid">
        {getProducts().map(product => {
          const local = "/store/p/" + product.slug;
          const remote = "https://www.empressvr.com" + local;
          const price = new Intl.NumberFormat("en-GB",{style:"currency",currency:product.currency})
            .format(product.price_minor/100);
          return <article className="store-card" key={product.id}>
            <Link href={local} className="store-card-image" aria-label={"View " + product.title}>
              <MediaImage assetId={product.featured_media_id} alt={product.title} />
            </Link>
            <div className="store-card-details">
              <h2><Link href={local}>{product.title}</Link></h2>
              <p>{product.description}</p>
              <strong>{price}</strong>
              {product.sold_out ? <span className="availability">Sold out</span> :
                <a className="pill-button" href={remote} rel="noopener noreferrer">Buy on current store ↗</a>}
              <Link className="store-detail-link" href={local}>Product details</Link>
            </div>
          </article>;
        })}
      </div>
    </div>
  </section>;
}
