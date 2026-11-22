import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {getServerAuth} from "@/lib/auth/server";
import {MyBookingsList,type MyBooking} from "@/components/bookings/my-bookings-list";

export const metadata:Metadata={title:"My reservations",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";

export default async function MyBookingsPage(){
  const auth=await getServerAuth();
  if(!auth)redirect("/login");
  const {data:{user},error}=await auth.auth.getUser();
  if(error||!user)redirect("/login");
  const result=await auth.rpc("my_free_bookings");
  return <section className="auth-page"><div className="page-container booking-admin-page">
    <p className="auth-eyebrow"><Link href="/account">Account</Link> / My reservations</p>
    <div className="booking-section-heading">
      <h1>My reservations</h1>
      <Link className="pill-button" href="/book">Find a session</Link>
    </div>
    {result.error?<p role="alert" className="auth-error">
      Unable to load reservations. Please try again.
    </p>:!result.data?.length?<p className="booking-empty-state">
      No reservations yet. Find an available free session to book.
    </p>:<MyBookingsList bookings={result.data as MyBooking[]}
      referenceNow={new Date().toISOString()}/>}
  </div></section>;
}
