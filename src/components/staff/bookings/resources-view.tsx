"use client";
import {useState,type FormEvent} from "react";
import {saveBookingResource} from "@/app/staff/bookings/actions";
import {EditorPanel} from "@/components/staff/editor-panel";
import type {BookingResource} from "@/features/scheduling/admin-types";

export function ResourcesView({resources,onSaved}:{
  resources:readonly BookingResource[];onSaved:()=>void;
}){
  const [editing,setEditing]=useState<BookingResource|null|undefined>(undefined);
  const [name,setName]=useState("");
  const [active,setActive]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  function open(value:BookingResource|null){
    setEditing(value);setName(value?.name??"");setActive(value?.active??true);setError("");
  }
  async function submit(event:FormEvent){
    event.preventDefault();if(busy)return;
    setBusy(true);setError("");
    try{
      const result=await saveBookingResource({
        ...(editing?{id:editing.id}:{}),name,active,
      });
      if(!result.ok){setError(result.error);return;}
      setEditing(undefined);onSaved();
    }catch{setError("Unable to save resource.")}
    finally{setBusy(false);}
  }
  return <section className="booking-admin-section" aria-labelledby="resources-heading">
    <div className="booking-section-heading">
      <div><h2 id="resources-heading">Resources</h2>
        <p>Staff members and shared spaces used to prevent overlapping appointments.</p>
      </div>
      <button className="pill-button" type="button" onClick={()=>open(null)}>+ Add resource</button>
    </div>
    {!resources.length?<p className="booking-empty-state">
      Add a staff member or room before opening private appointment sessions.
    </p>:<div className="booking-admin-list">
      {resources.map(resource=><button className="booking-admin-list-row booking-row-button"
        type="button" key={resource.id} onClick={()=>open(resource)}>
        <span className="booking-admin-list-primary"><strong>{resource.name}</strong>
          <small>Used to block conflicting sessions</small></span>
        <span className={"booking-chip "+(resource.active?"is-live":"")}>
          {resource.active?"Active":"Inactive"}
        </span>
        <span aria-hidden="true">›</span>
      </button>)}
    </div>}
    {editing!==undefined?<EditorPanel title={editing?"Edit resource":"New resource"}
      onClose={()=>setEditing(undefined)}>
      <form className="booking-editor-form" onSubmit={e=>void submit(e)}>
        {error?<p role="alert" className="auth-error">{error}</p>:null}
        <label htmlFor="resource-name">Name</label>
        <input id="resource-name" required maxLength={120} value={name}
          onChange={e=>setName(e.target.value)} placeholder="Staff member or room"/>
        <label className="booking-switch"><input type="checkbox" checked={active}
          onChange={e=>setActive(e.target.checked)}/>
          <span>Available for new reservations</span></label>
        <button className="pill-button" disabled={busy} type="submit">
          {busy?"Saving...":"Save resource"}
        </button>
      </form>
    </EditorPanel>:null}
  </section>;
}
