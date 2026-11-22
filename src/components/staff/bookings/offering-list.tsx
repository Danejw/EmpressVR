"use client";
import type { Offering, Session } from "@/features/scheduling/admin-types";
import { formatPrice } from "@/features/scheduling/booking-view";

export function OfferingsView({ offerings, sessions, onEdit, onNew, onNewSession }: {
  offerings: readonly Offering[]; sessions: readonly Session[];
  onEdit:(id:string)=>void; onNew:()=>void; onNewSession:(id:string)=>void;
}) {
  return <section className="booking-admin-section" aria-labelledby="offerings-heading">
    <div className="booking-section-heading">
      <div><h2 id="offerings-heading">Offerings</h2><p>Classes, appointments and information.</p></div>
      <button type="button" className="pill-button" onClick={onNew}>+ New offering</button>
    </div>
    {!offerings.length ? <p className="booking-empty-state">No offerings yet. Create a draft to get started.</p> :
      <div className="booking-admin-list">{offerings.map(item=>
        <article className="booking-admin-list-row" key={item.id}>
          <div className="booking-admin-list-primary">
            <strong>{item.title}</strong>
            <small>{item.kind} · {formatPrice(item.price_minor,item.currency)} · {sessions.filter(s=>s.offering_id===item.id).length} sessions</small>
          </div>
          <span className={"booking-chip "+(item.published?"is-live":"")}>{item.published?"Published":"Draft"}</span>
          <div className="booking-row-actions">
            {item.kind!=="informational"?<button type="button" className="booking-link-button"
              onClick={()=>onNewSession(item.id)}>+ Session</button>:null}
            <button type="button" className="booking-link-button" onClick={()=>onEdit(item.id)}>Edit</button>
          </div>
        </article>)}</div>}
  </section>;
}
