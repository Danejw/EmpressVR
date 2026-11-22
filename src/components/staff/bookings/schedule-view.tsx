"use client";
import { useMemo,useState } from "react";
import { MonthGrid } from "@/components/calendar/month-grid";
import { monthKey } from "@/features/scheduling/calendar-month";
import { dayInZone, formatSlotTime } from "@/features/scheduling/booking-view";
import type { Offering, Session, Reservation } from "@/features/scheduling/admin-types";
import { closeSession } from "@/app/staff/bookings/actions";

export function ScheduleView({ offerings, sessions, reservations, onEdit, onNew, onRefresh }: {
  offerings: readonly Offering[]; sessions: readonly Session[]; reservations: readonly Reservation[];
  onEdit:(id:string)=>void; onNew:()=>void; onRefresh:()=>void;
}) {
  const [month,setMonth] = useState(()=>monthKey());
  const [day,setDay] = useState<string|null>(null);
  const [closing,setClosing] = useState<string|null>(null);
  const [error,setError] = useState("");
  const offeringTitles = useMemo(()=>new Map(offerings.map(item=>[item.id,item.title])),[offerings]);
  const events = useMemo(()=>sessions.map(s=>({
    day:dayInZone(s.starts_at,s.time_zone),label:offeringTitles.get(s.offering_id)??"Session",
  })),[sessions,offeringTitles]);
  const visible = sessions.filter(s=>{
    const date=dayInZone(s.starts_at,s.time_zone);
    return day ? date===day : date.slice(0,7)===month;
  });
  async function close(id:string) {
    if (!window.confirm("Close this session to further reservations? Existing bookings remain valid."))return;
    setClosing(id);setError("");
    try {
      const result=await closeSession(id);
      if (!result.ok){setError(result.error);return;}
      onRefresh();
    } catch {setError("Unable to close the session.");}
    finally {setClosing(null);}
  }
  return <section className="booking-admin-section" aria-labelledby="schedule-heading">
    <div className="booking-section-heading">
      <div><h2 id="schedule-heading">Schedule</h2><p>Sessions, availability and capacity.</p></div>
      <button type="button" className="pill-button" onClick={onNew} disabled={!offerings.some(o=>o.kind!=="informational")}>+ New session</button>
    </div>
    {error?<p role="alert" className="auth-error">{error}</p>:null}
    <MonthGrid month={month} onMonthChange={next=>{setMonth(next);setDay(null);}}
      selectedDay={day} onDaySelect={selected=>setDay(prev=>prev===selected?null:selected)}
      markers={events}/>
    <div className="booking-schedule-results">
      <div className="booking-section-heading booking-results-heading">
        <strong>{day??month}</strong>
        {day?<button type="button" className="booking-link-button" onClick={()=>setDay(null)}>Show month</button>:null}
      </div>
      {!visible.length?<p className="booking-empty-state">No sessions for this period.</p>:
        <div className="booking-admin-list">{visible.map(session=>{
          const occupied=reservations.filter(b=>b.slot_id===session.id &&
            (b.status==="confirmed" || (b.status==="held" && Date.parse(b.expires_at)>Date.now())))
            .reduce((sum,b)=>sum+b.seats,0);
          const canEdit=occupied===0 && Date.parse(session.starts_at)>Date.now();
          return <article className="booking-admin-list-row" key={session.id}>
            <div className="booking-admin-list-primary">
              <strong>{offeringTitles.get(session.offering_id)??"Offering"}</strong>
              <small>{dayInZone(session.starts_at,session.time_zone)} · {formatSlotTime(session)}</small>
              <small>{occupied}/{session.capacity} seats · {session.time_zone}</small>
            </div>
            <span className={"booking-chip "+(session.available?"is-live":"")}>{session.available?"Open":"Closed"}</span>
            <div className="booking-row-actions">
              {canEdit?<button type="button" className="booking-link-button"
                onClick={()=>onEdit(session.id)}>Edit</button>:null}
              {session.available?<button type="button" disabled={closing===session.id} className="booking-link-button"
                onClick={()=>void close(session.id)}>{closing===session.id?"Closing...":"Close"}</button>:null}
            </div>
          </article>;
        })}</div>}
    </div>
  </section>;
}
