import Link from "next/link";

export default function NotFound() {
  return <section className="legacy-page"><div className="page-container">
    <h1>Page not found</h1>
    <p>We couldn’t find that page. You can return home or explore the projects.</p>
    <div className="content-cta">
      <Link className="pill-button" href="/">Home</Link>{" "}
      <Link className="pill-button" href="/projects">Explore projects</Link>
    </div>
  </div></section>;
}
