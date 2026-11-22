"use client";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorPanel } from "./editor-panel";
import { OfferingEditor } from "./offering-editor";
import { SessionEditor } from "./session-editor";
import { OfferingsView } from "./offering-list";
import { ScheduleView } from "./schedule-view";
import { ReservationsView } from "./reservations-view";
import { ManualBookingEditor } from "./manual-booking-editor";
import { ReservationDetails } from "./reservation-details";
import type { Offering,Session,Reservation,BookingContact,BookingAudit } from "@/features/scheduling/admin-types";

type Tab = "reservations" | "offerings" | "schedule";
type Panel =
  | { kind: "offering"; id?: string }
  | { kind: "session"; id?: string; offeringId?: string }
  | { kind: "reservation"; id: string }
  | { kind: "new-reservation" };
const tabs: { key:Tab;title:string }[]=[
  { key:"reservations",title:"Reservations" },
  { key:"offerings",title:"Offerings" },
  { key:"schedule",title:"Schedule" },
];

export function BookingWorkspace({offerings,sessions,reservations,contacts,audit}:{
  offerings:readonly Offering[]; sessions:readonly Session[];
  reservations:readonly Reservation[];contacts:readonly BookingContact[];audit:readonly BookingAudit[];
}) {
  const router=useRouter();
  const [tab,setTab]=useState<Tab>("reservations");
  const [panel,setPanel]=useState<Panel|null>(null);
  const close=useCallback(()=>setPanel(null),[]);
  const saved=useCallback(()=>{setPanel(null);router.refresh();},[router]);
  const upcoming=sessions.filter(item=>Date.parse(item.starts_at)>Date.now()).length;
  const confirmed=reservations.filter(item=>item.status==="confirmed").length;
  const activePanel=panel?.kind==="offering"?"Offering":
    panel?.kind==="session"?"Session":
    panel?.kind==="reservation"?"Reservation":"Free reservation";
  const selectedOffering=panel?.kind==="offering"?offerings.find(o=>o.id===panel.id):undefined;
  const selectedSession=panel?.kind==="session"?sessions.find(s=>s.id===panel.id):undefined;
  const selectedReservation=panel?.kind==="reservation"?reservations.find(b=>b.id===panel.id):undefined;
  return <div className="booking-workspace">
    <div className="booking-stats" aria-label="Booking summary">
      <div><strong>{reservations.length}</strong><span>Total reservations</span></div>
      <div><strong>{confirmed}</strong><span>Confirmed</span></div>
      <div><strong>{upcoming}</strong><span>Upcoming sessions</span></div>
    </div>
    <div className="booking-workspace-tabs" role="tablist" aria-label="Booking management sections">
      {tabs.map(item=><button key={item.key} id={"booking-tab-"+item.key} role="tab"
        type="button" aria-controls={"booking-content-"+item.key}
        aria-selected={tab===item.key} className={tab===item.key?"is-active":""}
        onClick={()=>setTab(item.key)}>{item.title}</button>)}
    </div>
    <div id={"booking-content-"+tab} role="tabpanel" aria-labelledby={"booking-tab-"+tab}>
      {tab==="reservations"?<ReservationsView
        reservations={reservations}contacts={contacts}offerings={offerings}sessions={sessions}
        onView={id=>setPanel({kind:"reservation",id})}
        onNew={()=>setPanel({kind:"new-reservation"})}/>:
       tab==="offerings"?<OfferingsView offerings={offerings}sessions={sessions}
         onEdit={id=>setPanel({kind:"offering",id})}
         onNew={()=>setPanel({kind:"offering"})}
         onNewSession={offeringId=>setPanel({kind:"session",offeringId})}/>:
       <ScheduleView offerings={offerings}sessions={sessions}reservations={reservations}
         onEdit={id=>setPanel({kind:"session",id})}
         onNew={()=>setPanel({kind:"session"})}onRefresh={saved}/>}
    </div>
    {panel?<EditorPanel title={
      panel.kind==="offering"?(panel.id?"Edit offering":"New offering"):
      panel.kind==="session"?(panel.id?"Edit session":"New session"):
      panel.kind==="reservation"?"Booking details":"New free reservation"
    } onClose={close}>
      {panel.kind==="offering"?<OfferingEditor offering={selectedOffering} onSaved={saved}/>:
       panel.kind==="session"?<SessionEditor session={selectedSession} offerings={offerings}
         initialOfferingId={panel.offeringId} onSaved={saved}/>:
       panel.kind==="new-reservation"?<ManualBookingEditor
         offerings={offerings}sessions={sessions}onSaved={saved}/>:
       selectedReservation?<ReservationDetails
         reservation={selectedReservation}
         contact={contacts.find(c=>c.booking_id===selectedReservation.id)}
         offering={offerings.find(o=>o.id===selectedReservation.offering_id)}
         session={sessions.find(s=>s.id===selectedReservation.slot_id)}
         audit={audit.filter(item=>item.booking_id===selectedReservation.id)}
         onSaved={saved}/>:<p>Reservation unavailable.</p>}
    </EditorPanel>:null}
    <p className="booking-workspace-note">Public online bookings are still disabled. The existing Acuity booking system remains active.</p>
  </div>;
}
