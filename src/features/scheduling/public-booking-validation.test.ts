import {describe,expect,it} from "vitest";
import {validateFreeBookingRequest} from "./public-booking-validation";
const valid={
 slot_id:"30000000-0000-4000-8000-000000000021",
 name:"Alex Guest",seats:1,idempotency_key:"bookingQaIdempotency00001",
};
describe("public free reservation validation",()=>{
 it("accepts clean booking details",()=>{
   expect(validateFreeBookingRequest(valid).data).toEqual(valid);
 });
 it("rejects invalid slots, seats and reused malformed keys",()=>{
   expect(validateFreeBookingRequest({...valid,slot_id:"invalid"}).error).toBeTruthy();
   expect(validateFreeBookingRequest({...valid,seats:0}).error).toBeTruthy();
   expect(validateFreeBookingRequest({...valid,seats:1.5}).error).toBeTruthy();
   expect(validateFreeBookingRequest({...valid,idempotency_key:"short"}).error).toBeTruthy();
 });
 it("trims attendee name and limits the length",()=>{
   expect(validateFreeBookingRequest({...valid,name:"  Alex Guest  "}).data?.name)
     .toBe("Alex Guest");
   expect(validateFreeBookingRequest({...valid,name:"X".repeat(201)}).error).toBeTruthy();
 });
});
