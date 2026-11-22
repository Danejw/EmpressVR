"use server";
import {revalidatePath} from "next/cache";
import {getServerAuth} from "@/lib/auth/server";
import {validateFreeBookingRequest,type FreeBookingResult} from
  "@/features/scheduling/public-booking-validation";
import {validId} from "@/features/scheduling/admin-validation";

export async function reserveFreeSession(input:unknown):Promise<FreeBookingResult>{
  const checked=validateFreeBookingRequest(input);
  if(!checked.data)return {ok:false,error:checked.error};
  const auth=await getServerAuth();
  if(!auth)return {ok:false,error:"Please sign in to reserve."};
  const {data:{user},error}=await auth.auth.getUser();
  if(error||!user?.email)return {ok:false,error:"Please sign in to reserve."};
  if(!user.email_confirmed_at)return {ok:false,error:"Please verify your email address first."};
  const args=checked.data;
  const result=await auth.rpc("reserve_public_free_booking",{
    p_slot_id:args.slot_id,p_attendee_name:args.name,
    p_seats:args.seats,p_idempotency_key:args.idempotency_key,
  });
  if(result.error||typeof result.data!=="string"){
    const message=result.error?.message??"Unable to reserve this time.";
    return {ok:false,error:/unavailable|remaining seats|occupies this resource|no remaining|Too many reservations/i.test(message)?
      "That time is no longer available. Choose another slot and try again.":
      /Sign in|Verify your email/i.test(message)?message:
      "Unable to confirm the reservation. Please check availability and retry."};
  }
  revalidatePath("/book");
  revalidatePath("/account/bookings");
  revalidatePath("/staff/bookings");
  return {ok:true,id:result.data};
}

export async function cancelMyFreeSession(id:unknown):Promise<FreeBookingResult>{
  if(typeof id!=="string"||!validId(id))return {ok:false,error:"Invalid reservation."};
  const auth=await getServerAuth();
  if(!auth)return {ok:false,error:"Sign in to cancel."};
  const {data:{user}}=await auth.auth.getUser();
  if(!user)return {ok:false,error:"Sign in to cancel."};
  const result=await auth.rpc("cancel_my_free_booking",{p_booking_id:id});
  if(result.error||result.data!==true)return {ok:false,error:
    "Unable to cancel this reservation. It may have already started or requires staff assistance."};
  revalidatePath("/book");
  revalidatePath("/account/bookings");
  revalidatePath("/staff/bookings");
  return {ok:true,id};
}
