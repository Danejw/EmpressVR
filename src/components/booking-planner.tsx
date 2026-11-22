"use client";

import { useRef,useState } from "react";
import { useRouter } from "next/navigation";
import { reserveFreeSession } from "@/app/book/actions";
import { AppSelect } from "@/components/ui/app-select";
import Link from "next/link";
import {
  bookableSlots, canReviewRequest, formatPrice, formatSlotTime,
  monthCells, slotsOnDay, type ArchivedCourse, type BookingOffering, type BookingSlot,
} from "@/features/scheduling/booking-view";
import { shiftMonth } from "@/features/scheduling/calendar-month";

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const liveBookingUrl = "https://www.empressvr.com/scheduling";

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(month + "-01T12:00:00Z"));
}
function localDateLabel(day: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(day + "T12:00:00Z"));
}

export function BookingPlanner({
  offerings, slots, archivedCourses, initialMonth, referenceNow, signedInEmail,
}: {
  offerings: readonly BookingOffering[];
  slots: readonly BookingSlot[];
  archivedCourses: readonly ArchivedCourse[];
  initialMonth: string;
  referenceNow: string;
  signedInEmail: string | null;
}) {
  const router=useRouter();
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [confirmedId,setConfirmedId]=useState("");
  const requestKey=useRef<string|null>(null);
  const [offeringId, setOfferingId] = useState(offerings[0]?.id ?? "");
  const [month, setMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [slotId, setSlotId] = useState("");
  const [seats, setSeats] = useState(1);
  const [name, setName] = useState("");

  const offering = offerings.find((item) => item.id === offeringId) ?? null;
  const allSlots = bookableSlots(offering, slots, new Date(referenceNow));
  const selectedSlots = selectedDay ? slotsOnDay(allSlots, selectedDay) : [];
  const selectedSlot = allSlots.find((item) => item.id === slotId) ?? null;
  const selectedDaySlots = selectedSlots.some((item) => item.id === slotId);
  const reviewReady = Boolean(selectedDaySlots && canReviewRequest({
    offering, slot: selectedSlot, seats, name, email:signedInEmail??"",
  }));
  const maxSeats=Math.max(1,Math.min(
    selectedSlot?.maxSeatsPerBooking??1,selectedSlot?.remainingSeats??selectedSlot?.capacity??1));
  const firstMonth = shiftMonth(initialMonth, -1);
  function resetSelection(){setError("");setConfirmedId("");requestKey.current=null;}
  async function confirmReservation(){
    if(!reviewReady||busy)return;
    setBusy(true);setError("");
    try{
      requestKey.current??=crypto.randomUUID().replaceAll("-","");
      const result=await reserveFreeSession({
        slot_id:slotId,name,seats,idempotency_key:requestKey.current,
      });
      if(!result.ok){
        setError(result.error);
        if(/no longer available/i.test(result.error)){setSlotId("");router.refresh();}
        return;
      }
      setConfirmedId(result.id);
      setSlotId("");setSelectedDay(null);
      requestKey.current=null;
      router.refresh();
    }catch{setError("Unable to complete the reservation. Retry your selection.");}
    finally{setBusy(false);}
  }
  const lastMonth = shiftMonth(initialMonth, 12);
  const dates = monthCells(month);

  function chooseOffering(id: string) {
    resetSelection();setOfferingId(id);
    setSelectedDay(null);
    setSlotId("");
    setSeats(1);
  }
  function changeMonth(delta: number) {
    resetSelection();const next = shiftMonth(month, delta);
    if (next < firstMonth || next > lastMonth) return;
    setMonth(next);
    setSelectedDay(null);
    setSlotId("");
    setSeats(1);
  }
  function chooseDay(day: string) {
    resetSelection();setSelectedDay(day);
    setSlotId("");
    setSeats(1);
  }
  function chooseSlot(id: string) {
    resetSelection();setSlotId(id);
    setSeats(1);
  }

  return <div className="booking-planner">
    <div className="booking-planner-heading">
      <div>
        <p className="booking-eyebrow">Classes and appointments</p>
        <h2>Find a session</h2>
        <p>Choose a session and reserve a free place. Paid bookings remain on the current booking site.</p>
      </div>
      <a className="outline-button" href={liveBookingUrl} rel="noopener noreferrer">Current booking site</a>
    </div>

    <div className="booking-wizard">
      <section className="booking-wizard-main" aria-label="Choose a class and date">
        <div className="booking-stage-heading"><span>01</span><h3>Choose a class</h3></div>
        {offerings.length ? (
          <div className="booking-offerings" role="group" aria-label="Available offerings">
            {offerings.map((item) => <button type="button" key={item.id}
              className={"booking-offering" + (item.id === offeringId ? " is-selected" : "")}
              aria-pressed={item.id === offeringId}
              onClick={() => chooseOffering(item.id)}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
              <small>{formatPrice(item.priceMinor, item.currency)}</small>
            </button>)}
          </div>
        ) : (
          <p className="booking-empty">No classes are currently published for online booking. Existing booking options remain on the current EmpressVR site.</p>
        )}

        <div className="booking-stage-heading"><span>02</span><h3>Choose a date</h3></div>
        <div className="booking-calendar" aria-label="Session dates calendar">
          <div className="booking-calendar-nav">
            <button type="button" onClick={() => changeMonth(-1)} disabled={month <= firstMonth}
              aria-label="Previous month">‹</button>
            <h4 aria-live="polite">{monthLabel(month)}</h4>
            <button type="button" onClick={() => changeMonth(1)} disabled={month >= lastMonth}
              aria-label="Next month">›</button>
          </div>
          <div className="booking-calendar-weekdays" aria-hidden="true">
            {weekdays.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="booking-calendar-grid">
            {dates.map((day, index) => {
              if (!day) return <span className="booking-calendar-empty" key={"empty-" + index} />;
              const matching = slotsOnDay(allSlots, day);
              return <button type="button" key={day} disabled={!matching.length}
                className={"booking-calendar-date" + (day === selectedDay ? " is-selected" : "")}
                aria-label={localDateLabel(day) + (matching.length ? ", " + matching.length + " sessions" : ", unavailable")}
                aria-pressed={day === selectedDay}
                onClick={() => chooseDay(day)}>
                {Number(day.slice(-2))}
                {matching.length ? <span className="booking-calendar-dot" aria-hidden="true" /> : null}
              </button>;
            })}
          </div>
        </div>
        <div className="booking-stage-heading"><span>03</span><h3>Choose a time</h3></div>
        {selectedDay && selectedSlots.length ? (
          <div className="booking-times" role="group" aria-label="Session times">
            {selectedSlots.map((item) => <button key={item.id} type="button"
              aria-pressed={slotId === item.id} className={slotId === item.id ? "is-selected" : ""}
              onClick={() => chooseSlot(item.id)}>
              <strong>{formatSlotTime(item)}</strong>
              <span>{item.timeZone.replaceAll("_", " ")}</span>
            </button>)}
          </div>
        ) : <p className="booking-availability-note">No verified session selected. Select a highlighted day when live dates are available.</p>}
      </section>
      <aside className="booking-wizard-summary" aria-label="Booking details">
        <h3>Your session</h3>
        <dl>
          <div><dt>Class</dt><dd>{offering?.title ?? "Not selected"}</dd></div>
          <div><dt>Date</dt><dd>{selectedDay && selectedSlot ? localDateLabel(selectedDay) : "Not selected"}</dd></div>
          <div><dt>Time</dt><dd>{selectedSlot ? formatSlotTime(selectedSlot) : "Not selected"}</dd></div>
          <div><dt>Price</dt><dd>{offering ? formatPrice(offering.priceMinor, offering.currency) + " per person" : "Not selected"}</dd></div>
        </dl>
        <div className="booking-stage-heading"><span>04</span><h3>Attendee details</h3></div>
        <div className="booking-contact-fields">
          <label htmlFor="booking-seats">Number of attendees</label>
          <AppSelect id="booking-seats" value={String(seats)} disabled={!selectedSlot}
            onChange={value=>setSeats(Number(value))}
            options={Array.from({length:maxSeats},(_,index)=>({
              value:String(index+1),label:String(index+1),
            }))}/>
          <label htmlFor="booking-name">Full name</label>
          <input id="booking-name" type="text" autoComplete="name" maxLength={200}
            disabled={!selectedSlot} value={name} onChange={(event) => setName(event.target.value)}
            placeholder="Your name" />
          <label htmlFor="booking-email">Verified account email</label>
          <input id="booking-email" type="email" readOnly value={signedInEmail??""}
            placeholder="Sign in to reserve a place" />
        </div>
        {confirmedId?<div className="auth-message" role="status">
          <strong>Reservation confirmed.</strong>
          <p>Your reference is {confirmedId}.</p>
          <Link href="/account/bookings">View and manage your bookings</Link>
        </div>:null}
        {error?<p role="alert" className="auth-error">{error}</p>:null}
        {!signedInEmail?<p className="booking-availability-note">
          <Link href="/login">Sign in</Link> or <Link href="/signup">create an account</Link>
          {" "}with a verified email to reserve a free session.
        </p>:null}
        {offering&&offering.priceMinor>0?<p className="booking-availability-note">
          Paid bookings require checkout, which is not connected yet.
        </p>:null}
        {signedInEmail&&offering?.priceMinor===0&&selectedSlot?
          <button className="booking-reserve-button" disabled={!reviewReady||busy}
            type="button" onClick={()=>void confirmReservation()}>
            {busy?"Confirming...":"Confirm free reservation"}
          </button>:
          <button className="booking-reserve-button" disabled type="button">
            {signedInEmail?"Select an available free session":"Sign in to reserve"}
          </button>}
        <p className="booking-live-link">
          Existing paid classes remain available through the{" "}
          <a href={liveBookingUrl} rel="noopener noreferrer">current booking site</a>.
        </p>
      </aside>
    </div>
    {archivedCourses.length ? <section className="booking-archived" aria-label="Previously offered courses">
      <h3>Explore our classes</h3>
      <p>These courses are from the existing EmpressVR catalog. They are currently marked sold out.</p>
      <div className="booking-archived-grid">
        {archivedCourses.map((course) => <article key={course.id}>
          <h4>{course.title}</h4>
          <p>{course.description}</p>
          <div className="booking-archived-bottom">
            <span>{formatPrice(course.priceMinor, course.currency)}</span>
            <span className="booking-sold-out">{course.soldOut ? "Sold out" : "Contact for availability"}</span>
          </div>
          <Link href={"/store/p/" + course.slug}>Course details</Link>
        </article>)}
      </div>
    </section> : null}
  </div>;
}
