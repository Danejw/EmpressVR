import type { Metadata } from "next";
import Link from "next/link";
import { requireBookingAdmin } from "@/lib/auth/booking-admin";
import { BookingWorkspace } from "@/components/staff/bookings/booking-workspace";
import type { Offering,Session,Reservation,BookingContact,BookingAudit } from "@/features/scheduling/admin-types";
export const metadata:Metadata={title:"Booking management",robots:{index:false,follow:false}};
export default async function StaffBookingsPage(){
  const {auth}=await requireBookingAdmin();
  const [offerings,sessions,reservations,contacts,audit]=await Promise.all([
    auth.from("offerings").select("id,slug,title,description,kind,price_minor,currency,published,accepting_bookings").order("title"),
    auth.from("booking_slots").select("id,offering_id,starts_at,ends_at,time_zone,capacity,max_seats_per_booking,available,requires_payment").order("starts_at"),
    auth.from("bookings").select("id,offering_id,slot_id,seats,status,requires_payment,payment_order_id,created_at,expires_at,confirmed_at,cancelled_at,attendee_ref").order("created_at",{ascending:false}).limit(1000),
    auth.from("booking_contacts").select("booking_id,display_name,email").limit(1000),
    auth.from("booking_admin_audit").select("id,booking_id,action,actor_id,created_at").order("created_at",{ascending:false}).limit(1000),
  ]);
  const error=offerings.error||sessions.error||reservations.error||contacts.error||audit.error;
  const referenceNow = new Date().toISOString();
  return <section className="auth-page"><div className="page-container booking-admin-page">
    <div className="auth-dashboard-heading"><div>
      <p className="auth-eyebrow"><Link href="/staff">Dashboard</Link> / Bookings</p>
      <h1>Bookings</h1>
    </div></div>
    {error?<div className="auth-panel">
      <p role="alert" className="auth-error">Unable to load booking administration. Check the booking RLS migration and administrator MFA.</p>
    </div>:
    <BookingWorkspace referenceNow={referenceNow}
      offerings={(offerings.data??[]) as Offering[]}
      sessions={(sessions.data??[]) as Session[]}
      reservations={(reservations.data??[]) as Reservation[]}
      contacts={(contacts.data??[]) as BookingContact[]}
      audit={(audit.data??[]) as BookingAudit[]}/>}
  </div></section>;
}
