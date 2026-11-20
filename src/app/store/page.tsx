import Link from "next/link";
import { readLegacyPage } from "@/lib/legacy-pages";

const products = [
  { title: "Immersive Storytelling Principles -> In VRChat!", slug: "immersive-storytelling-principles-in-vrchat", price: "£40.00", soldOut: true,
    description: "This 2 hour class will take place in VRChat and will navigate to several worlds that are educational in nature and will demonstrate the principles of immersive storytelling in either very good — or very bad — ways!" },
  { title: "Intro to VRChat Fluency --> In VR!", slug: "principles-of-immersive-storytelling-in-vrchat", price: "£12.00", soldOut: true,
    description: "This 1 hour class will take place in VRChat and will navigate to several worlds that are educational in nature and is specifically designed to allow you to acclimate to virtual reality gradually which will give your nervous system time to adjust while limiting the risk of motion sickness and allowing you to enjoy your time exploring virtual worlds fearlessly!" },
  { title: "Intro to Unity for Meta Quest VR Development - Zoom", slug: "intro-to-unity-for-meta-quest-vr-development-zoom", price: "£400.00", soldOut: true,
    description: "This is a 6 Week Bootcamp-style course with low-to-no coding designed for Creatives and Artists who want to fast-track their ability to prototype immersive VR applications and test ideas in pre-production." },
  { title: "Fox Mask - STL File for 3D Printing", slug: "fox-mask-stl-file-for-3d-printing", price: "£5.00", soldOut: false,
    description: "This fox mask was created for the DnD Themed Immersive Interactive Busking Street Theatre Piece produced in 2026. A trickster character, it was worn by our Druid-in-fox-form." }
] as const;

function productImage(markdown: string, title: string): string | null {
  const start = markdown.indexOf("[" + title + "](");
  if (start < 0) return null;
  const match = markdown.slice(start).match(/!\[[^\]]*\]\((https:\/\/images\.squarespace-cdn\.com[^)]+)\)/);
  return match?.[1] || null;
}

export default async function Store() {
  const source = await readLegacyPage("store") || "";
  return <section className="store-page">
    <div className="page-container">
      <div className="store-heading">
        <h1>Store</h1>
        <Link href="/store/masks">Categories: Masks</Link>
      </div>
      <div className="store-grid">
        {products.map((product) => {
          const local = "/store/p/" + product.slug;
          const remote = "https://www.empressvr.com" + local;
          const img = productImage(source, product.title);
          return <article className="store-card" key={product.slug}>
            <Link href={local} className="store-card-image" aria-label={"View " + product.title}>
              {img ? <img src={img} alt={product.title} loading="lazy" /> : null}
            </Link>
            <div className="store-card-details">
              <h2><Link href={local}>{product.title}</Link></h2>
              <p>{product.description}</p>
              <strong>{product.price}</strong>
              {product.soldOut ? <span className="availability">Sold out</span> :
                <a className="pill-button" href={remote} rel="noopener noreferrer">Buy on current store ↗</a>}
              <Link className="store-detail-link" href={local}>Product details</Link>
            </div>
          </article>;
        })}
      </div>
    </div>
  </section>;
}
