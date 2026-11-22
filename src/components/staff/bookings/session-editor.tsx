"use client";
import { useMemo, useState, type FormEvent } from "react";
import { AppSelect } from "@/components/ui/app-select";
import { supportedTimeZoneOptions } from "@/features/scheduling/time-zone-options";
import { minimumStartLocal, minimumEndLocal } from "@/features/scheduling/future-session";
import { saveSession } from "@/app/staff/bookings/actions";
import { formatLocalInput, localToUtc } from "@/features/scheduling/zoned-time";
import type { Offering, Session, BookingResource } from "@/features/scheduling/admin-types";

export function SessionEditor({ session, offerings, resources, initialOfferingId, onSaved, referenceNow }: {
  session?: Session; offerings: readonly Offering[]; resources: readonly BookingResource[]; initialOfferingId?: string; onSaved:()=>void; referenceNow:string;
}) {
  const [offeringId,setOfferingId] = useState(session?.offering_id??initialOfferingId??offerings[0]?.id??"");
  const [zone,setZone] = useState(session?.time_zone??"Europe/London");
  const [nowIso,setNowIso] = useState(referenceNow);
  const timeZones = useMemo(() => supportedTimeZoneOptions(), []);
  const [starts,setStarts] = useState(session?formatLocalInput(session.starts_at,session.time_zone):"");
  const [ends,setEnds] = useState(session?formatLocalInput(session.ends_at,session.time_zone):"");
  const minStart = minimumStartLocal(nowIso,zone);
  const minEnd = minimumEndLocal(nowIso,zone,starts);
  function changeZone(next:string) {
    try {
      if(starts) setStarts(formatLocalInput(localToUtc(starts,zone),next));
      if(ends) setEnds(formatLocalInput(localToUtc(ends,zone),next));
    } catch {
      setStarts("");setEnds("");
    }
    setZone(next);
  }
  const [capacity,setCapacity] = useState(session?.capacity??10);
  const [maxSeats,setMaxSeats] = useState(session?.max_seats_per_booking??1);
  const [available,setAvailable] = useState(session?.available??false);
  const [requiresPayment,setRequiresPayment] = useState(session?.requires_payment??false);
  const [resourceId,setResourceId] = useState(session?.resource_id??"");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const bookableOfferings = offerings.filter(item=>item.kind!=="informational");
  const selectedOffering=offerings.find(item=>item.id===offeringId);
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
        resource_id:resourceId||null,
      });
      if (!result.ok) {setError(result.error);return;}
      onSaved();
    } catch(cause) {setError(cause instanceof Error?cause.message:"Could not save session.");}
    finally {setBusy(false);}
  }
  return <form className="booking-editor-form" onSubmit={event=>void submit(event)}>
    {error?<p role="alert" className="auth-error">{error}</p>:null}
    <label htmlFor="booking-session-offering">Offering</label>
    <AppSelect id="booking-session-offering" required value={offeringId}
      disabled={Boolean(session)} onChange={setOfferingId}
      options={bookableOfferings.map(item=>({value:item.id,label:item.title}))}/>
    {!bookableOfferings.length?<p className="auth-small">Create a class or appointment first.</p>:null}
    <label htmlFor="booking-session-resource">Staff member or shared resource</label>
    <AppSelect id="booking-session-resource" value={resourceId} onChange={setResourceId}
      options={[{value:"",label:"No resource"},...resources.filter(r=>r.active||r.id===resourceId)
        .map(r=>({value:r.id,label:r.name+(r.active?"":" (inactive)")}))]}/>
    {selectedOffering?.kind==="appointment"?<p className="auth-small">
      An appointment must have an active resource before its availability can be opened.
    </p>:null}
    <label htmlFor="booking-session-zone">Time zone (IANA)</label>
    <AppSelect id="booking-session-zone" value={zone} required searchable
      searchPlaceholder="Search time zones" onChange={changeZone} options={timeZones}/>
    <label htmlFor="booking-session-start">Start time in selected time zone</label>
    <input id="booking-session-start" type="datetime-local" required value={starts}
      min={minStart} onFocus={()=>setNowIso(new Date().toISOString())}
      onChange={event=>setStarts(event.target.value)}/>
    <label htmlFor="booking-session-end">End time in selected time zone</label>
    <input id="booking-session-end" type="datetime-local" required value={ends}
      min={minEnd} onFocus={()=>setNowIso(new Date().toISOString())}
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
