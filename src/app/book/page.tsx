import type {Metadata} from "next";
import {BookingPlanner} from "@/components/booking-planner";
import {getProducts} from "@/features/content/repository";
import {getPublishedOfferings,publicReadConfig} from "@/features/content/supabase-public";
import {getPublicFreeSlots} from "@/features/scheduling/public-booking";
import {getServerAuth} from "@/lib/auth/server";
import {monthKey} from "@/features/scheduling/calendar-month";

export const dynamic="force-dynamic";
export const metadata:Metadata={
  title:"Classes and bookings",
  description:"Explore EmpressVR classes and book available free sessions.",
  alternates:{canonical:"/book"},
};

/** Staff-controlled offerings and actual resource-aware capacity, never archived
 * product or event dates. Published offerings without open slots stay visible.
 */
export default async function BookingPage(){
  const config=publicReadConfig();
  const [rows,slots,auth]=await Promise.all([
    getPublishedOfferings(),getPublicFreeSlots(),getServerAuth(),
  ]);
  const {data:{user}}=auth
    ? await auth.auth.getUser()
    : {data:{user:null}};
  const offerings=rows.filter(o=>
    (o.kind==="class"||o.kind==="appointment") && o.published===true &&
    typeof o.id==="string"&&typeof o.title==="string"&&
    typeof o.description==="string"&&
    Number.isSafeInteger(o.price_minor)&&o.price_minor>=0 &&
    typeof o.currency==="string" && /^[A-Z]{3}$/.test(o.currency) &&
    typeof o.accepting_bookings==="boolean"
  ).map(o=>({
    id:o.id,title:o.title,description:o.description,
    kind:o.kind as "class"|"appointment",
    priceMinor:o.price_minor,currency:o.currency,
    acceptingBookings:o.accepting_bookings,
  }));
  const snapshotOnly=config.staticPreview||!config.url||!config.publishableKey;
  const archivedCourses=snapshotOnly?getProducts()
    .filter(p=>p.sold_out&&p.slug!=="fox-mask-stl-file-for-3d-printing")
    .map(p=>({
      id:p.id,slug:p.slug,title:p.title,description:p.description,
      priceMinor:p.price_minor,currency:p.currency,soldOut:p.sold_out,
    })):[];
  return <section className="booking-page"><div className="page-container">
    <BookingPlanner offerings={offerings} slots={slots}
      archivedCourses={archivedCourses} initialMonth={monthKey()}
      referenceNow={new Date().toISOString()}
      signedInEmail={user?.email_confirmed_at?user.email??null:null}/>
  </div></section>;
}
