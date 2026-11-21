import { getPublishedEvents } from "@/features/content/supabase-public";

/** Display only explicitly published and reviewed events. */
export async function PublishedEvents({ showEmpty = false }: { showEmpty?: boolean }) {
  const events = await getPublishedEvents();
  if (!events.length && !showEmpty) return null;
  return <section className="page-container" aria-label="Published EmpressVR events">
    <h2>Events</h2>
    {!events.length ? <p>No events are currently published.</p> : (
      <div className="project-grid">
        {events.map((event) => <article className="project-summary" key={event.id}>
          <h3>{event.title}</h3>
          {event.start_at ? <p><time dateTime={event.start_at}>{new Intl.DateTimeFormat("en-GB", {
            dateStyle: "long", timeStyle: "short", timeZone: "Europe/London"
          }).format(new Date(event.start_at))}</time></p> : null}
        </article>)}
      </div>
    )}
  </section>;
}
