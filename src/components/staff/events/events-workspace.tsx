"use client";
import { useCallback,useMemo,useState } from "react";
import { useRouter } from "next/navigation";
import { MonthGrid } from "@/components/calendar/month-grid";
import { EditorPanel } from "@/components/staff/bookings/editor-panel";
import { EventEditor } from "./event-editor";
import type { StaffEvent } from "@/features/events/event-validation";
import type { ContentImage } from "@/features/staff/editor-options";
import { eventOnDay,monthCells } from "@/features/scheduling/calendar-month";
import { toCalendarEvent } from "@/features/events/calendar-adapter";

type View="calendar"|"list";
export function EventsWorkspace({events,images,initialMonth}:{
  events:readonly StaffEvent[];images:readonly ContentImage[];initialMonth:string;
}){
  const router=useRouter();
  const [view,setView]=useState<View>("calendar");
  const [month,setMonth]=useState(initialMonth);
  const [day,setDay]=useState<string|null>(null);
  const [selectedId,setSelectedId]=useState<string|null|undefined>(undefined);
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("all");
  const close=useCallback(()=>setSelectedId(undefined),[]);
  const saved=useCallback(()=>{close();router.refresh();},[close,router]);
  const selected=events.find(e=>e.id===selectedId);
  const candidates=useMemo(()=>events.map(e=>({
    event:e,display:toCalendarEvent({
      ...e,status:undefined,date_review_required:false,
    }),
  })).filter(x=>x.display!==null),[events]);
  const dates=monthCells(month).filter((v):v is string=>Boolean(v));
  const markers=candidates.flatMap(({display,event})=>
    dates.filter(date=>display&&eventOnDay(display,date)).map(day=>({day,label:event.title}))
  );
  const shown=events.filter(e=>{
    if(filter!=="all"&&e.status!==filter)return false;
    const text=(e.title+" "+e.description+" "+(e.location??"")).toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });
  const selectedDayEvents=day?candidates.filter(({display})=>
    display&&eventOnDay(display,day)).map(x=>x.event):[];
  const monthEvents=candidates.filter(({display})=>
    display&&dates.some(date=>eventOnDay(display,date))).map(x=>x.event);
  const visible=view==="calendar"?(day?selectedDayEvents:monthEvents):shown;
  const counts={
    published:events.filter(e=>e.status==="published").length,
    draft:events.filter(e=>e.status==="draft").length,
    archived:events.filter(e=>e.status==="archived").length,
  };
  return <div className="booking-workspace">
    <div className="booking-stats" aria-label="Event summary">
      <div><strong>{counts.published}</strong><span>Published</span></div>
      <div><strong>{counts.draft}</strong><span>Draft</span></div>
      <div><strong>{counts.archived}</strong><span>Archived</span></div>
    </div>
    <div className="booking-section-heading">
      <p>Manage community events and their public calendar visibility.</p>
      <button type="button" className="pill-button" onClick={()=>setSelectedId(null)}>+ New event</button>
    </div>
    <div className="booking-workspace-tabs" role="group" aria-label="Events views">
      <button type="button" className={view==="calendar"?"is-active":""}
        aria-pressed={view==="calendar"} onClick={()=>setView("calendar")}>Calendar</button>
      <button type="button" className={view==="list"?"is-active":""}
        aria-pressed={view==="list"} onClick={()=>setView("list")}>Events list</button>
    </div>
    {view==="calendar"?<MonthGrid month={month} onMonthChange={next=>{setMonth(next);setDay(null);}}
      selectedDay={day} onDaySelect={value=>setDay(current=>current===value?null:value)}
      markers={markers} markerLabel="events"/>:
      <div className="booking-filters">
        <label className="booking-filter"><span>Search</span>
          <input type="search" value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Title or location"/></label>
        <label className="booking-filter"><span>Status</span>
          <select value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="all">All</option><option value="draft">Draft</option>
            <option value="published">Published</option><option value="archived">Archived</option>
          </select></label>
      </div>}
    <section className="booking-admin-section" aria-label="Events">
      <div className="booking-section-heading">
        <strong>{view==="calendar"?(day??month):"All events"}</strong>
        {view==="calendar"&&day?<button className="booking-link-button"
          type="button" onClick={()=>setDay(null)}>Show month</button>:null}
      </div>
      {!visible.length?<p className="booking-empty-state">
        {view==="calendar"?"No scheduled events for this period.":"No matching events."}
      </p>:<div className="booking-admin-list">{visible.map(e=>
        <button className="booking-admin-list-row booking-row-button" type="button"
          key={e.id} onClick={()=>setSelectedId(e.id)}>
          <span className="booking-admin-list-primary">
            <strong>{e.title}</strong>
            <small>{e.start_at?new Intl.DateTimeFormat("en-GB",{
              timeZone:e.time_zone,dateStyle:"medium",timeStyle:e.all_day?undefined:"short",
            }).format(new Date(e.start_at)):"Date needs review"}</small>
            <small>{e.location??""}</small>
          </span>
          <span className={"booking-chip "+(e.status==="published"?"is-live":"")}>{e.status}</span>
          <span aria-hidden="true">›</span>
        </button>)}</div>}
    </section>
    {selectedId!==undefined?<EditorPanel title={selected?"Edit event":"New event"} onClose={close}>
      <EventEditor key={selected?.id??"new"} event={selected} images={images} onSaved={saved}/>
    </EditorPanel>:null}
  </div>;
}
