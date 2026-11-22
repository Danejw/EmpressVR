import { getPublishedEvents,getPublishedPages } from "@/features/content/supabase-public";
import { MediaImage } from "@/components/media-image";

/** Published and date-reviewed events only. Never display archived import dates. */
export async function PublishedEvents({ showEmpty = false }: { showEmpty?: boolean }) {
  const [events,pages]=await Promise.all([getPublishedEvents(),getPublishedPages()]);
  const pageText=new Map(pages.map(page=>[page.id,page.body_markdown]));
  if (!events.length && !showEmpty) return null;
  return <section className="page-container" aria-label="Published EmpressVR events">
    <h2>Events</h2>
    {!events.length ? <p>No events are currently published.</p> : (
      <div className="project-grid">
        {events.map(event => {
          const description=event.page_id ? pageText.get(event.page_id)??"" : "";
          const timeZone=event.time_zone||"Europe/London";
          const link=event.external_url;
          return <article className="project-summary" key={event.id}>
            {event.featured_media_id?<MediaImage assetId={event.featured_media_id} alt={event.title}/>:null}
            <h3>{event.title}</h3>
            {event.start_at ? <p><time dateTime={event.start_at}>
              {event.all_day
                ? new Intl.DateTimeFormat("en-GB",{timeZone:"UTC",dateStyle:"long"}).format(new Date(event.start_at))
                : new Intl.DateTimeFormat("en-GB",{timeZone,dateStyle:"long",timeStyle:"short"}).format(new Date(event.start_at))}
            </time>{event.all_day?" · All day":""}</p> : null}
            {event.location?<p>{event.location}</p>:null}
            {description?<p>{description.slice(0,300)}</p>:null}
            {typeof link==="string" && link.startsWith("https://")?
              <p><a href={link} target="_blank" rel="noopener noreferrer">Event details</a></p>:null}
          </article>;
        })}
      </div>
    )}
  </section>;
}
