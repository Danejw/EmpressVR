"use client";
import { useMemo,useState,type FormEvent } from "react";
import { AppSelect } from "@/components/ui/app-select";
import { supportedTimeZoneOptions } from "@/features/scheduling/time-zone-options";
import { saveStaffEvent } from "@/app/staff/events/actions";
import { initialEventDates,type EventStatus,type StaffEvent } from "@/features/events/event-validation";
import type { ContentImage } from "@/features/staff/editor-options";

function slugify(text:string){
  return text.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,96);
}
export function EventEditor({event,images,onSaved}:{
  event?:StaffEvent; images:readonly ContentImage[];onSaved:()=>void;
}){
  const dates=event?initialEventDates(event):{start_local:"",end_local:""};
  const [title,setTitle]=useState(event?.title??"");
  const [slug,setSlug]=useState(event?.slug??"");
  const [slugEdited,setSlugEdited]=useState(false);
  const [description,setDescription]=useState(event?.description??"");
  const [status,setStatus]=useState<EventStatus>(event?.status??"draft");
  const [allDay,setAllDay]=useState(event?.all_day??false);
  const [zone,setZone]=useState(event?.time_zone??"Europe/London");
  const timeZones=useMemo(() => supportedTimeZoneOptions(), []);
  const [start,setStart]=useState(dates.start_local);
  const [end,setEnd]=useState(dates.end_local);
  const [location,setLocation]=useState(event?.location??"");
  const [url,setUrl]=useState(event?.external_url??"");
  const [featured,setFeatured]=useState(event?.featured_media_id??"");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(e:FormEvent){
    e.preventDefault();if(busy)return;
    setBusy(true);setError("");
    try{
      const result=await saveStaffEvent({
        ...(event?{id:event.id}:{}),title,slug,description,status,
        all_day:allDay,time_zone:zone,start_local:start,end_local:end,
        location,external_url:url,featured_media_id:featured||null,
      });
      if(!result.ok){setError(result.error);return;}
      onSaved();
    }catch{setError("Unable to save the event.");}
    finally{setBusy(false);}
  }
  return <form className="booking-editor-form" onSubmit={e=>void submit(e)}>
    {error?<p className="auth-error" role="alert">{error}</p>:null}
    <label htmlFor="event-title">Title</label>
    <input id="event-title" required maxLength={160} value={title} onChange={e=>{
      setTitle(e.target.value);
      if(!event&&!slugEdited)setSlug(slugify(e.target.value));
    }}/>
    <label htmlFor="event-slug">Event URL slug</label>
    <input id="event-slug" required maxLength={96} pattern="[a-z0-9]+(-[a-z0-9]+)*"
      value={slug} disabled={Boolean(event)}
      onChange={e=>{setSlug(slugify(e.target.value));setSlugEdited(true);}}/>
    <label htmlFor="event-description">Description</label>
    <textarea id="event-description" rows={6} maxLength={12000}
      value={description} onChange={e=>setDescription(e.target.value)}/>
    <label htmlFor="event-status">Publication</label>
    <AppSelect id="event-status" value={status}
      onChange={value=>setStatus(value as EventStatus)}
      options={[{value:"draft",label:"Draft"},{value:"published",label:"Published"},
        {value:"archived",label:"Archived"}]}/>
    <label className="booking-switch"><input type="checkbox" checked={allDay}
      onChange={e=>{setAllDay(e.target.checked);setStart("");setEnd("");}}/>
      <span>All-day event</span>
    </label>
    <label htmlFor="event-zone">Time zone</label>
    <AppSelect id="event-zone" value={zone} required searchable
      searchPlaceholder="Search time zones" onChange={setZone} options={timeZones}/>
    <label htmlFor="event-start">Start {allDay?"date":"time"}</label>
    <input id="event-start" type={allDay?"date":"datetime-local"}
      value={start} onChange={e=>setStart(e.target.value)}/>
    <label htmlFor="event-end">End {allDay?"date (inclusive)":"time"}</label>
    <input id="event-end" type={allDay?"date":"datetime-local"}
      value={end} onChange={e=>setEnd(e.target.value)}/>
    <p className="auth-small">Publishing requires verified start and end dates. Archived events without dates stay unpublished. Ambiguous daylight-saving times are rejected.</p>
    <label htmlFor="event-location">Location or venue</label>
    <input id="event-location" maxLength={300} value={location}
      onChange={e=>setLocation(e.target.value)}/>
    <label htmlFor="event-link">Event or meeting link (HTTPS)</label>
    <input id="event-link" type="url" maxLength={500} value={url}
      onChange={e=>setUrl(e.target.value)}/>
    <label htmlFor="event-image">Featured image</label>
    <AppSelect id="event-image" value={featured} onChange={setFeatured} searchable
      searchPlaceholder="Search images"
      options={[{value:"",label:"None"},...images.map(img=>({value:img.id,label:img.alt}))]}/>
    <button className="pill-button" disabled={busy} type="submit">
      {busy?"Saving...":"Save event"}
    </button>
  </form>;
}
