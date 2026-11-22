"use client";
import { useState, type FormEvent } from "react";
import { saveSession } from "@/app/staff/bookings/actions";
import { formatLocalInput, localToUtc } from "@/features/scheduling/zoned-time";
import type { Offering, Session } from "@/features/scheduling/admin-types";

export function SessionEditor({ session, offerings, initialOfferingId, onSaved }: {
  session?: Session; offerings: readonly Offering[]; initialOfferingId?: string; onSaved:()=>void;
}) {
  const [offeringId,setOfferingId] = useState(session?.offering_id??initialOfferingId??offerings[0]?.id??"");
  const [zone,setZone] = useState(session?.time_zone??"Europe/London");
  const [starts,setStarts] = useState(session?formatLocalInput(session.starts_at,session.time_zone):"");
  const [ends,setEnds] = useState(session?formatLocalInput(session.ends_at,session.time_zone):"");
  const [capacity,setCapacity] = useState(session?.capacity??10);
  const [maxSeats,setMaxSeats] = useState(session?.max_seats_per_booking??1);
  const [available,setAvailable] = useState(session?.available??false);
  const [requiresPayment,setRequiresPayment] = useState(session?.requires_payment??false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const bookableOfferings = offerings.filter(item=>item.kind!=="informational");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);setError("");
    try {
      const starts_at=localToUtc(starts,zone);
      const ends_at=localToUtc(ends,zone);
      const result=await saveSession({
        ...(session?{id:session.id}:{}),offering_id:offeringId,starts_at,ends_at,time_zone:zone,
        capacity,max_seats_per_booking:maxSeats,available,requires_payment:requiresPayment,
      });
      if (!result.ok) {setError(result.error);return;}
      onSaved();
    } catch(cause) {setError(cause instanceof Error?cause.message:"Could not save session.");}
    finally {setBusy(false);}
  }
  return <form className="booking-editor-form" onSubmit={event=>void submit(event)}>
    {error?<p role="alert" className="auth-error">{error}</p>:null}
    <label htmlFor="booking-session-offering">Offering</label>
    <select id="booking-session-offering" required value={offeringId} disabled={Boolean(session)}
      onChange={event=>setOfferingId(event.target.value)}>
      {bookableOfferings.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
    </select>
    {!bookableOfferings.length?<p className="auth-small">Create a class or appointment first.</p>:null}
    <label htmlFor="booking-session-zone">Time zone (IANA)</label>
    <input id="booking-session-zone" value={zone} required maxLength={64}
      list="booking-time-zones" onChange={event=>setZone(event.target.value)}/>
    <datalist id="booking-time-zones"><option value="Europe/London"/><option value="Pacific/Honolulu"/>
      <option value="America/New_York"/><option value="UTC"/></datalist>
    <label htmlFor="booking-session-start">Start time in selected time zone</label>
    <input id="booking-session-start" type="datetime-local" required value={starts}
      onChange={event=>setStarts(event.target.value)}/>
    <label htmlFor="booking-session-end">End time in selected time zone</label>
    <input id="booking-session-end" type="datetime-local" required value={ends}
      onChange={event=>setEnds(event.target.value)}/>
    <p className="auth-small">Times are stored in UTC. Ambiguous or missing daylight-saving times are rejected.</p>
    <div className="booking-editor-fields">
      <div><label htmlFor="booking-session-capacity">Capacity</label>
        <input id="booking-session-capacity" type="number" required min={1} max={10000} step={1}
          value={capacity} onChange={event=>setCapacity(Number(event.target.value))}/></div>
      <div><label htmlFor="booking-session-limit">Max seats per booking</label>
        <input id="booking-session-limit" type="number" required min={1} max={capacity} step={1}
          value={maxSeats} onChange={event=>setMaxSeats(Number(event.target.value))}/></div>
    </div>
    <label className="booking-switch"><input type="checkbox" checked={available}
      onChange={event=>setAvailable(event.target.checked)}/> <span>Session availability open</span></label>
    <label className="booking-switch"><input type="checkbox" checked={requiresPayment}
      onChange={event=>setRequiresPayment(event.target.checked)}/> <span>Payment required</span></label>
    <p className="auth-small">Opening a session here does not activate public bookings. Sessions with reservations can only be closed, not moved or resized.</p>
    <button type="submit" className="pill-button" disabled={busy || !bookableOfferings.length}>
      {busy?"Saving...":"Save session"}</button>
  </form>;
}
