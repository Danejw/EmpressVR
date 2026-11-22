import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { getContentImages } from "@/features/staff/editor-options";
import { monthKey } from "@/features/scheduling/calendar-month";
import { EventsWorkspace } from "@/components/staff/events/events-workspace";
import type { StaffEvent } from "@/features/events/event-validation";

export const metadata:Metadata={title:"Manage events",robots:{index:false,follow:false}};

export default async function StaffEventsPage(){
  const {auth}=await requireStaff();
  const [events,images]=await Promise.all([
    auth.from("events")
      .select("id,page_id,slug,title,start_at,end_at,status,date_review_required,featured_media_id,time_zone,all_day,location,external_url,updated_at")
      .order("updated_at",{ascending:false}),
    getContentImages(auth),
  ]);
  const rows=events.data??[];
  const pageIds=rows.map(e=>e.page_id).filter((id):id is string=>Boolean(id));
  const pages=pageIds.length
    ? await auth.from("site_pages").select("id,body_markdown").in("id",pageIds)
    : {data:[],error:null};
  const descriptions=new Map((pages.data??[]).map(page=>[page.id,page.body_markdown]));
  const enriched=rows.map(e=>({
    ...e,description:e.page_id?descriptions.get(e.page_id)??"":"",
  })) as StaffEvent[];
  return <section className="auth-page"><div className="page-container booking-admin-page">
    <div className="auth-dashboard-heading"><div>
      <p className="auth-eyebrow"><Link href="/staff">Dashboard</Link> / Events</p>
      <h1>Events</h1>
    </div></div>
    {events.error||pages.error?<p className="auth-error" role="alert">
      Unable to load events. Check the event migration and staff permissions.
    </p>:<EventsWorkspace events={enriched} images={images} initialMonth={monthKey()}/>}
  </div></section>;
}
