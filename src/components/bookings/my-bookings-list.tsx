"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {cancelMyFreeSession} from "@/app/book/actions";

export type MyBooking={
  id:string;title:string;starts_at:string;ends_at:string;time_zone:string;
  seats:number;status:string;created_at:string;
};
export function MyBookingsList({bookings,referenceNow}:{
  bookings:readonly MyBooking[];referenceNow:string;
}){
  const router=useRouter();
  const [busy,setBusy]=useState<string|null>(null);
  const [error,setError]=useState("");
  async function cancel(id:string){
    if(!window.confirm("Cancel this free reservation?"))return;
    setBusy(id);setError("");
    try{
      const result=await cancelMyFreeSession(id);
      if(!result.ok){setError(result.error);return;}
      router.refresh();
    }catch{setError("Unable to cancel the reservation.")}
    finally{setBusy(null);}
  }
  return <div className="booking-admin-list">
    {error?<p role="alert" className="auth-error">{error}</p>:null}
    {bookings.map(booking=>{
      let date=booking.starts_at;
      try{date=new Intl.DateTimeFormat("en-GB",{timeZone:booking.time_zone,
        dateStyle:"medium",timeStyle:"short"}).format(new Date(booking.starts_at));}
      catch{date=booking.starts_at;}
      const canCancel=booking.status==="confirmed"&&
        Date.parse(booking.starts_at)>Date.parse(referenceNow);
      return <article className="booking-admin-list-row" key={booking.id}>
        <div className="booking-admin-list-primary">
          <strong>{booking.title}</strong>
          <small>{date} · {booking.time_zone}</small>
          <small>{booking.seats} {booking.seats===1?"attendee":"attendees"}</small>
        </div>
        <span className={"booking-chip "+(booking.status==="confirmed"?"is-live":"")}>
          {booking.status}
        </span>
        {canCancel?<button type="button" className="booking-danger-button"
          disabled={busy===booking.id} onClick={()=>void cancel(booking.id)}>
          {busy===booking.id?"Cancelling...":"Cancel"}
        </button>:null}
      </article>;
    })}
  </div>;
}
