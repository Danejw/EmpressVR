"use client";
import { useState, type FormEvent } from "react";
import type { Offering, Session } from "@/features/scheduling/admin-types";
import { formatSlotTime,dayInZone } from "@/features/scheduling/booking-view";
import { makeFreeReservation } from "@/app/staff/bookings/actions";

export function ManualBookingEditor({ offerings,sessions,onSaved }: {
  offerings:readonly Offering[]; sessions:readonly Session[]; onSaved:()=>void;
}) {
  const eligible=sessions.filter(slot=>{
    const offering=offerings.find(o=>o.id===slot.offering_id);
    return slot.available&&!slot.requires_payment && Date.parse(slot.starts_at)>Date.now()
      && offering?.price_minor===0 && offering.kind!=="informational";
  });
  const [slotId,setSlotId]=useState(eligible[0]?.id??"");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [seats,setSeats]=useState(1);
  // One key per editor instance, so retries cannot create duplicate bookings.
  const [key]=useState(()=>crypto.randomUUID().replaceAll("-",""));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const selected=eligible.find(slot=>slot.id===slotId);
  async function submit(event:FormEvent) {
    event.preventDefault();
    if(busy)return;
    setBusy(true);setError("");
    try{
      const result=await makeFreeReservation({
        slot_id:slotId,name,email,seats,idempotency_key:key,
      });
      if(!result.ok){setError(result.error);return;}
      onSaved();
    }catch{setError("Unable to create reservation.");}
    finally{setBusy(false);}
  }
  return <form className="booking-editor-form" onSubmit={event=>void submit(event)}>
    <p className="auth-small">Manual reservations are available only for free sessions with open capacity. Paid bookings require verified payment.</p>
    {error?<p role="alert" className="auth-error">{error}</p>:null}
    {!eligible.length?<p className="booking-empty-state">Create a free offering and an open future session first.</p>:null}
    <label htmlFor="manual-session">Session</label>
    <select id="manual-session" value={slotId} required disabled={!eligible.length}
      onChange={event=>{setSlotId(event.target.value);setSeats(1);}}>
      {eligible.map(slot=>{
        const offering=offerings.find(o=>o.id===slot.offering_id);
        return <option key={slot.id} value={slot.id}>
          {offering?.title??"Offering"} · {dayInZone(slot.starts_at,slot.time_zone)} · {formatSlotTime(slot)}
        </option>;
      })}
    </select>
    <label htmlFor="manual-name">Attendee name</label>
    <input id="manual-name" required maxLength={200} autoComplete="name"
      value={name} onChange={event=>setName(event.target.value)}/>
    <label htmlFor="manual-email">Attendee email</label>
    <input id="manual-email" type="email" required maxLength={254} autoComplete="email"
      value={email} onChange={event=>setEmail(event.target.value)}/>
    <label htmlFor="manual-seats">Seats</label>
    <input id="manual-seats" type="number" min={1} max={selected?.max_seats_per_booking??1} step={1}
      value={seats} onChange={event=>setSeats(Number(event.target.value))}/>
    <button className="pill-button" type="submit" disabled={!eligible.length || busy}>
      {busy?"Reserving...":"Confirm free reservation"}</button>
  </form>;
}
