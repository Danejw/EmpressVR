"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/staff";
import { validateStaffEvent, type EventSaveResult } from "@/features/events/event-validation";

export async function saveStaffEvent(value:unknown):Promise<EventSaveResult> {
  const checked=validateStaffEvent(value);
  if(!checked.data)return {ok:false,error:checked.error};
  // ASVS 2.1.2 / 2.2.2: every mutation checks staff role and MFA server-side.
  const {auth}=await requireStaff();
  const e=checked.data;
  const {data,error}=await auth.rpc("save_staff_event",{
    p_id:e.id??null,p_slug:e.slug,p_title:e.title,p_description:e.description,
    p_status:e.status,p_start_at:e.start_at,p_end_at:e.end_at,
    p_date_review_required:e.date_review_required,p_time_zone:e.time_zone,
    p_all_day:e.all_day,p_location:e.location||null,p_external_url:e.external_url||null,
    p_featured_media_id:e.featured_media_id,
  });
  if(error || typeof data!=="string")return {
    ok:false,
    error:error?.code==="23505"?"An event with this URL already exists.":
      error?.message==="Event URLs cannot be changed after creation"?
        "Event URLs cannot be changed after creation.":
        "Could not save event. Please verify the details and staff permissions.",
  };
  revalidatePath("/staff");
  revalidatePath("/staff/events");
  revalidatePath("/community");
  revalidatePath("/events");
  return {ok:true,id:data};
}
