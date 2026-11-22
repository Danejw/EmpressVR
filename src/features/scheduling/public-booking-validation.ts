import {validId} from "./admin-validation";

export type FreeBookingRequest={
  slot_id:string;name:string;seats:number;idempotency_key:string;
};
export type FreeBookingResult={ok:true;id:string}|{ok:false;error:string};
export function validateFreeBookingRequest(value:unknown):
  {data:FreeBookingRequest;error?:never}|{data?:never;error:string}{
  if(!value||typeof value!=="object"||Array.isArray(value))
    return {error:"Invalid booking request."};
  const v=value as Record<string,unknown>;
  if(typeof v.slot_id!=="string"||!validId(v.slot_id))return {error:"Choose an available session."};
  if(typeof v.name!=="string"||v.name.trim().length<1||v.name.trim().length>200)
    return {error:"Enter your full name."};
  if(typeof v.seats!=="number"||!Number.isSafeInteger(v.seats)||v.seats<1||v.seats>100)
    return {error:"Enter a valid number of attendees."};
  if(typeof v.idempotency_key!=="string"||!/^[A-Za-z0-9_-]{24,128}$/.test(v.idempotency_key))
    return {error:"Invalid booking request ID."};
  return {data:{slot_id:v.slot_id,name:v.name.trim(),seats:v.seats,
    idempotency_key:v.idempotency_key}};
}
