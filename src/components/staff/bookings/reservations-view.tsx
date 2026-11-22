"use client";
import { formatSessionTime } from "@/features/scheduling/admin-view";
import { useMemo,useState } from "react";
import { AppSelect } from "@/components/ui/app-select";
import type { Offering,Session,Reservation,BookingContact } from "@/features/scheduling/admin-types";

export function ReservationsView({ reservations, contacts, offerings, sessions, onView, onNew }: {
  reservations: readonly Reservation[]; contacts: readonly BookingContact[];
  offerings: readonly Offering[]; sessions: readonly Session[];
  onView:(id:string)=>void; onNew:()=>void;
}) {
  const [search,setSearch] = useState("");
  const [status,setStatus] = useState("all");
  const offeringNames=useMemo(()=>new Map(offerings.map(o=>[o.id,o.title])),[offerings]);
  const sessionsById=useMemo(()=>new Map(sessions.map(s=>[s.id,s])),[sessions]);
  const contactsById=useMemo(()=>new Map(contacts.map(c=>[c.booking_id,c])),[contacts]);
  const filtered=reservations.filter(item=>{
    if (status!=="all"&&status!==item.status)return false;
    const contact=contactsById.get(item.id);
    const phrase=[offeringNames.get(item.offering_id),contact?.display_name,contact?.email,item.status]
      .filter(Boolean).join(" ").toLowerCase();
    return phrase.includes(search.toLowerCase().trim());
  });
  return <section className="booking-admin-section" aria-labelledby="reservations-heading">
    <div className="booking-section-heading"><div>
      <h2 id="reservations-heading">Reservations</h2><p>Bookings and attendee details.</p>
    </div><button type="button" className="pill-button" onClick={onNew}>+ Free reservation</button></div>
    <div className="booking-filters">
      <label className="booking-filter"><span>Search</span><input type="search" value={search}
        placeholder="Name, email or class" onChange={event=>setSearch(event.target.value)}/></label>
      <label className="booking-filter"><span>Status</span>
        <AppSelect ariaLabel="Reservation status" value={status} onChange={setStatus}
          options={[{value:"all",label:"All"},{value:"confirmed",label:"Confirmed"},
            {value:"held",label:"Held"},{value:"cancelled",label:"Cancelled"},
            {value:"expired",label:"Expired"}]}/></label>
    </div>
    {!filtered.length?<p className="booking-empty-state">
      {reservations.length?"No bookings match those filters.":"No reservations yet."}
    </p>:<div className="booking-admin-list">{filtered.map(item=>{
      const session=sessionsById.get(item.slot_id);
      const contact=contactsById.get(item.id);
      return <button type="button" className="booking-admin-list-row booking-row-button"
        key={item.id} onClick={()=>onView(item.id)}>
        <span className="booking-admin-list-primary">
          <strong>{contact?.display_name||contact?.email||"Attendee"}</strong>
          <small>{offeringNames.get(item.offering_id)??"Offering"} · {session?formatSessionTime(session):"Session"}</small>
          <small>{item.seats} seats · {new Date(item.created_at).toLocaleDateString("en-GB")}</small>
        </span>
        <span className={"booking-chip "+(item.status==="confirmed"?"is-live":"")}>{item.status}</span>
        <span aria-hidden="true">›</span>
      </button>;
    })}</div>}
  </section>;
}
