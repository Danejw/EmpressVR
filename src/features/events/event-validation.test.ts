import { describe,it,expect } from "vitest";
import { validateStaffEvent,initialEventDates } from "./event-validation";
const base={
  slug:"vr-community",title:"VR Community",description:"A gathering",
  start_local:"2030-06-21T10:00",end_local:"2030-06-21T11:00",
  status:"published",all_day:false,time_zone:"Europe/London",
  location:"Online",external_url:"https://example.org/join",
  featured_media_id:null,
};
describe("staff event input validation",()=>{
  it("converts London local times and requires confirmed dates to publish",()=>{
    const result=validateStaffEvent(base);
    expect(result.data?.start_at).toBe("2030-06-21T09:00:00.000Z");
    expect(result.data?.date_review_required).toBe(false);
    expect(validateStaffEvent({...base,start_local:"",end_local:""}).error).toMatch(/dates/);
  });
  it("allows undated drafts while preventing partial dates",()=>{
    expect(validateStaffEvent({...base,status:"draft",start_local:"",end_local:""}).data?.date_review_required).toBe(true);
    expect(validateStaffEvent({...base,status:"draft",end_local:""}).error).toMatch(/both/);
  });
  it("handles all day events with an exclusive end date",()=>{
    const v=validateStaffEvent({...base,all_day:true,start_local:"2030-06-21",end_local:"2030-06-22"});
    expect(v.data?.start_at).toBe("2030-06-21T00:00:00.000Z");
    expect(v.data?.end_at).toBe("2030-06-23T00:00:00.000Z");
    expect(initialEventDates({...v.data!,all_day:true}).end_local).toBe("2030-06-22");
  });
  it("rejects malformed URLs, invalid zones, ambiguous DST times and bad titles",()=>{
    expect(validateStaffEvent({...base,external_url:"http://example.org"}).error).toBeTruthy();
    expect(validateStaffEvent({...base,time_zone:"Planet/Mars"}).error).toBeTruthy();
    expect(validateStaffEvent({...base,start_local:"2027-10-31T01:30"}).error).toBeTruthy();
    expect(validateStaffEvent({...base,title:""}).error).toBeTruthy();
  });
});
