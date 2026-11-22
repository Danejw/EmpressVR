import { formatSessionTime } from "@/features/scheduling/admin-view";
"use client";
import { useState } from "react";
import type { Offering,Session,Reservation,BookingContact,BookingAudit } from "@/features/scheduling/admin-types";
import {  dayInZone } from "@/features/scheduling/booking-view";
import { cancelFreeReservation } from "@/app/staff/bookings/actions";

export function ReservationDetails({
  reservation, contact, offering, session, audit, onSaved,
}:{
  reservation:Reservation;
  contact?:BookingContact;offering?:Offering;session?:Session;
  audit:readonly BookingAudit[]; onSaved:()=>void;
}) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const canCancel=(reservation.status==="confirmed"||reservation.status==="held") &&
    !reservation.requires_payment && reservation.payment_order_id===null;
  async function cancel() {
    if(!window.confirm("Cancel this reservation? This cannot be undone."))return;
    setBusy(true);setError("");
    try{
      const result=await cancelFreeReservation(reservation.id);
      if(!result.ok){setError(result.error);return;}
      onSaved();
    }catch{setError("Unable to cancel this reservation.");}
    finally{setBusy(false);}
  }
  return <div className="booking-detail">
    {error?<p role="alert" className="auth-error">{error}</p>:null}
    <span className={"booking-chip "+(reservation.status==="confirmed"?"is-live":"")}>{reservation.status}</span>
    <dl>
      <div><dt>Attendee</dt><dd>{contact?.display_name??"Not provided"}</dd></div>
      <div><dt>Email</dt><dd>{contact?.email??"Not provided"}</dd></div>
      <div><dt>Offering</dt><dd>{offering?.title??"Unknown offering"}</dd></div>
      <div><dt>Session</dt><dd>{session?dayInZone(session.starts_at,session.time_zone)+" · "+formatSessionTime(session):"Unavailable"}</dd></div>
      <div><dt>Seats</dt><dd>{reservation.seats}</dd></div>
      <div><dt>Payment</dt><dd>{reservation.requires_payment?"Required":"Free"}</dd></div>
      <div><dt>Created</dt><dd>{new Date(reservation.created_at).toLocaleString("en-GB")}</dd></div>
    </dl>
    {canCancel?<button className="booking-danger-button" type="button" disabled={busy}
      onClick={()=>void cancel()}>{busy?"Cancelling...":"Cancel reservation"}</button>:null}
    {!canCancel&&reservation.requires_payment?<p className="auth-small">
      Paid bookings cannot be cancelled here until the refund workflow is connected.
    </p>:null}
    {audit.length?<div className="booking-audit"><h3>Activity</h3>
      {audit.map(item=><p key={item.id}>{item.action.replaceAll("_"," ")} · {new Date(item.created_at).toLocaleString("en-GB")}</p>)}
    </div>:null}
  </div>;
}
