import "server-only";
import {publicReadConfig} from "@/features/content/supabase-public";
import type {BookingSlot} from "@/features/scheduling/booking-view";

type SafeRow = {
  id: string; offering_id: string; starts_at:string; ends_at:string;
  time_zone:string;capacity:number;max_seats_per_booking:number;
  remaining_seats:number;
};
function isSafeRow(value:unknown):value is SafeRow {
  if(!value||typeof value!=="object")return false;
  const row=value as Record<string,unknown>;
  return typeof row.id==="string" && typeof row.offering_id==="string" &&
    typeof row.starts_at==="string" && typeof row.ends_at==="string" &&
    typeof row.time_zone==="string" &&
    typeof row.capacity==="number" && Number.isSafeInteger(row.capacity) && row.capacity>0 &&
    typeof row.max_seats_per_booking==="number" &&
    Number.isSafeInteger(row.max_seats_per_booking) && row.max_seats_per_booking>0 &&
    typeof row.remaining_seats==="number" &&
    Number.isSafeInteger(row.remaining_seats) && row.remaining_seats>0 &&
    row.remaining_seats<=row.capacity;
}

/** Public, privacy-safe slot inventory, computed from actual held and confirmed seats. */
export async function getPublicFreeSlots():Promise<BookingSlot[]> {
  const config=publicReadConfig();
  if(!config.url || !config.publishableKey || config.staticPreview)return [];
  try{
    const endpoint=new URL("/rest/v1/rpc/public_free_booking_slots",config.url);
    const response=await fetch(endpoint.toString(),{
      method:"POST",
      headers:{apikey:config.publishableKey,"Content-Type":"application/json",Accept:"application/json"},
      body:"{}",cache:"no-store",signal:AbortSignal.timeout(8000),
    });
    if(!response.ok)return [];
    const data:unknown=await response.json();
    if(!Array.isArray(data))return [];
    return data.filter(isSafeRow).map(row=>({
      id:row.id,offeringId:row.offering_id,startsAt:row.starts_at,
      endsAt:row.ends_at,timeZone:row.time_zone,capacity:row.capacity,
      maxSeatsPerBooking:row.max_seats_per_booking,remainingSeats:row.remaining_seats,
      available:true,requiresPayment:false,
    }));
  }catch{return [];}
}
