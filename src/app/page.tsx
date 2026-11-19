import Link from "next/link";

const areas = [
  { title: "Create", description: "Community-powered immersive experiences.", href: "/projects", color: "pink" },
  { title: "Connect", description: "Belong to a curious, welcoming creative community.", href: "/community", color: "green" },
  { title: "Explore", description: "Grow your skills in VR and storytelling.", href: "/education", color: "blue" }
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="page-container hero-inner">
          <p className="eyebrow">COMMUNITY-POWERED IMMERSIVE STORYTELLING</p>
          <h1>More voices.<br /><em>More worlds.</em></h1>
          <p className="hero-copy">We are EmpressVR. A co-operative creating space for artists, technologists and storytellers to shape immersive futures together.</p>
          <Link className="primary-link" href="/projects">Explore our projects <span aria-hidden="true">↗</span></Link>
          <div className="hero-glow" aria-hidden="true" />
        </div>
      </section>
      <section className="page-container areas" aria-label="Explore EmpressVR">
        {areas.map((area) => (
          <Link className={`area-card ${area.color}`} key={area.title} href={area.href}>
            <span className="card-eyebrow">DISCOVER</span>
            <h2>{area.title}</h2>
            <p>{area.description}</p>
            <span className="card-arrow" aria-hidden="true">↗</span>
          </Link>
        ))}
      </section>
      <section className="page-container intro">
        <span className="section-kicker">OUR PURPOSE</span>
        <h2>Amplifying diverse voices in immersive storytelling.</h2>
        <p>We believe powerful creative experiences grow through community, care, collaboration and experimentation.</p>
      </section>
    </>
  );
}
