import { localToUtc, formatLocalInput } from "../scheduling/zoned-time";

export type EventStatus = "draft" | "published" | "archived";
export type StaffEvent = {
  id: string; page_id: string|null; slug: string; title: string;
  start_at: string|null; end_at: string|null; status: EventStatus;
  date_review_required: boolean; featured_media_id: string|null;
  time_zone: string; all_day: boolean; location: string|null;
  external_url: string|null; updated_at: string;
  description: string;
};
export type EventInput = {
  id?: string; slug: string; title: string; description: string;
  status: EventStatus; start_local: string; end_local: string;
  time_zone: string; all_day: boolean; location: string;
  external_url: string; featured_media_id: string|null;
};
export type EventSaveResult = {ok:true;id:string}|{ok:false;error:string};
export type ValidatedEvent = Omit<EventInput,"start_local"|"end_local"> & {
  start_at:string|null;end_at:string|null;date_review_required:boolean;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
type Checked = {data:ValidatedEvent;error?:never}|{data?:never;error:string};
function obj(v:unknown):Record<string,unknown>|null {
  return v!==null&&typeof v==="object"&&!Array.isArray(v) ? v as Record<string,unknown> : null;
}
function str(v:unknown,limit:number,required=false):v is string {
  return typeof v==="string"&&v.length<=limit&&(!required||v.trim().length>0);
}
function validDay(value:string):boolean {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const parsed=new Date(value+"T00:00:00.000Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10)===value;
}
function addDay(value:string):string {
  const date=new Date(value+"T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate()+1);
  return date.toISOString();
}
export function validateStaffEvent(value:unknown):Checked {
  const v=obj(value);
  if(!v || (v.id!==undefined&&(typeof v.id!=="string"||!uuid.test(v.id))))
    return {error:"Invalid event ID."};
  if(!str(v.title,160,true))return {error:"Enter an event title (up to 160 characters)."};
  if(!str(v.slug,96,true)||!slugPattern.test(v.slug))return {error:"Use a lowercase event slug."};
  if(!str(v.description,12000))return {error:"Description is too long."};
  if(v.status!=="draft"&&v.status!=="published"&&v.status!=="archived")
    return {error:"Invalid event status."};
  if(!str(v.time_zone,80,true))return {error:"Select a time zone."};
  try{new Intl.DateTimeFormat("en-GB",{timeZone:v.time_zone});}
  catch{return {error:"Enter a valid IANA time zone."};}
  if(typeof v.all_day!=="boolean")return {error:"Invalid all-day setting."};
  if(!str(v.start_local,32)||!str(v.end_local,32))
    return {error:"Invalid dates."};
  if(!str(v.location,300)||!str(v.external_url,500))
    return {error:"Invalid location or link."};
  if(v.external_url){
    try{
      const u=new URL(v.external_url);
      if(u.protocol!=="https:"||!u.hostname||u.username||u.password)
        return {error:"Event links must use HTTPS."};
    }catch{return {error:"Enter a valid HTTPS event link."};}
  }
  if(v.featured_media_id!==null &&
    (typeof v.featured_media_id!=="string"||!uuid.test(v.featured_media_id)))
    return {error:"Select a valid featured image."};
  if(Boolean(v.start_local)!==Boolean(v.end_local))
    return {error:"Enter both the start and end dates."};
  let start_at:string|null=null,end_at:string|null=null;
  if(v.start_local&&v.end_local){
    try{
      if(v.all_day){
        if(!validDay(v.start_local)||!validDay(v.end_local)||v.end_local<v.start_local)
          return {error:"All-day event dates are invalid."};
        start_at=v.start_local+"T00:00:00.000Z";
        end_at=addDay(v.end_local); // inclusive end date in editor, exclusive in storage
      } else {
        start_at=localToUtc(v.start_local,v.time_zone);
        end_at=localToUtc(v.end_local,v.time_zone);
      }
      if(Date.parse(end_at)<=Date.parse(start_at))
        return {error:"Event must end after it begins."};
    }catch(e){return {error:e instanceof Error?e.message:"Invalid event date."};}
  }
  if(v.status==="published"&&!start_at)
    return {error:"Set verified start/end dates before publishing."};
  return {data:{
    ...(v.id?{id:v.id as string}:{}),slug:v.slug,title:v.title.trim(),
    description:v.description.trim(),status:v.status,
    start_at,end_at,date_review_required:!start_at,
    time_zone:v.time_zone,all_day:v.all_day,
    location:v.location.trim(),external_url:v.external_url.trim(),
    featured_media_id:v.featured_media_id as string|null,
  }};
}
export function initialEventDates(event:Pick<StaffEvent,"start_at"|"end_at"|"time_zone"|"all_day">){
  if(!event.start_at||!event.end_at)return {start_local:"",end_local:""};
  return event.all_day ? {
    start_local:event.start_at.slice(0,10),
    end_local:new Date(Date.parse(event.end_at)-86400000).toISOString().slice(0,10),
  } : {
    start_local:formatLocalInput(event.start_at,event.time_zone),
    end_local:formatLocalInput(event.end_at,event.time_zone),
  };
}
