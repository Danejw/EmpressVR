"use client";
import { useState, type FormEvent } from "react";
import { AppSelect } from "@/components/ui/app-select";
import { saveOffering } from "@/app/staff/bookings/actions";
import type { Offering } from "@/features/scheduling/admin-types";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,128);
}
export function OfferingEditor({ offering, onSaved }: {
  offering?: Offering; onSaved: () => void;
}) {
  const [title,setTitle] = useState(offering?.title??"");
  const [slug,setSlug] = useState(offering?.slug??"");
  const [editedSlug,setEditedSlug] = useState(false);
  const [description,setDescription] = useState(offering?.description??"");
  const [kind,setKind] = useState<Offering["kind"]>(offering?.kind??"class");
  const [published,setPublished] = useState(offering?.published??false);
  const [accepting,setAccepting] = useState(offering?.accepting_bookings??false);
  const [price,setPrice] = useState(String((offering?.price_minor??0)/100));
  const [currency,setCurrency] = useState(offering?.currency??"GBP");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const p = Number(price);
    if (!Number.isFinite(p) || p<0 || !Number.isSafeInteger(Math.round(p*100)) ||
        Math.round(p*100)/100 !== p) {setError("Enter a valid amount with at most two decimal places.");return;}
    setBusy(true);setError("");
    try {
      const result=await saveOffering({
        ...(offering?{id:offering.id}:{}),title,slug,description,kind,published,
        accepting_bookings:accepting,
        price_minor:Math.round(p*100),currency:currency.toUpperCase(),
      });
      if (!result.ok) {setError(result.error);return;}
      onSaved();
    } catch {setError("Could not save the offering.");}
    finally {setBusy(false);}
  }
  return <form className="booking-editor-form" onSubmit={event=>void submit(event)}>
    {error?<p role="alert" className="auth-error">{error}</p>:null}
    <label htmlFor="booking-offering-title">Title</label>
    <input id="booking-offering-title" required maxLength={160} value={title}
      onChange={event=>{
        setTitle(event.target.value);
        if (!offering && !editedSlug) setSlug(slugify(event.target.value));
      }}/>
    <label htmlFor="booking-offering-slug">URL slug</label>
    <input id="booking-offering-slug" required maxLength={128} disabled={Boolean(offering)}
      value={slug} onChange={event=>{setSlug(slugify(event.target.value));setEditedSlug(true);}}/>
    <label htmlFor="booking-offering-type">Type</label>
    <AppSelect id="booking-offering-type" value={kind}
      onChange={value=>setKind(value as Offering["kind"])}
      options={[{value:"class",label:"Class"},{value:"appointment",label:"Appointment"},
        {value:"informational",label:"Informational"}]}/>
    <label htmlFor="booking-offering-description">Description</label>
    <textarea id="booking-offering-description" rows={5} maxLength={4000} value={description}
      onChange={event=>setDescription(event.target.value)}/>
    <div className="booking-editor-fields">
      <div><label htmlFor="booking-offering-price">Price</label>
        <input id="booking-offering-price" required type="number" min="0" max="10000000" step=".01"
          value={price} onChange={event=>setPrice(event.target.value)}/></div>
      <div><label htmlFor="booking-offering-currency">Currency</label>
        <input id="booking-offering-currency" required maxLength={3} pattern="[A-Z]{3}"
          value={currency} onChange={event=>setCurrency(event.target.value.toUpperCase())}/></div>
    </div>
    <label className="booking-switch"><input type="checkbox" checked={published}
      onChange={event=>setPublished(event.target.checked)}/><span>Publish offering details</span></label>
    <label className="booking-switch"><input type="checkbox" checked={accepting}
      disabled={!published || kind==="informational" || Number(price)!==0}
      onChange={event=>setAccepting(event.target.checked)}/>
      <span>Accept free online reservations</span></label>
    <p className="auth-small">A published, free offering can accept bookings when sessions are open. Paid bookings remain unavailable until payments are connected.</p>
    <button className="pill-button" type="submit" disabled={busy}>{busy?"Saving...":"Save offering"}</button>
  </form>;
}
