import type { PublicCalendarEvent } from "../scheduling/calendar-month";
import { COMMUNITY_TIME_ZONE } from "@/features/scheduling/calendar-month";

/** Provider-independent projection: the database owns event state and identity. */
export type EventCalendarSource = {
  id:string; title:string;start_at:string|null;end_at:string|null;
  all_day?:boolean|null;time_zone?:string|null;
  status?:string;date_review_required?:boolean;
  external_url?:string|null;
};
function publicUrl(value:string|null|undefined):string|null {
  if(!value)return null;
  try{
    const url=new URL(value);
    return url.protocol==="https:"&&!url.username&&!url.password?url.toString():null;
  }catch{return null;}
}
export function toCalendarEvent(e:EventCalendarSource):PublicCalendarEvent|null {
  if(!e.start_at||!e.end_at||e.date_review_required===true ||
     (e.status!==undefined&&e.status!=="published"))return null;
  const startMs=Date.parse(e.start_at),endMs=Date.parse(e.end_at);
  if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||endMs<=startMs)return null;
  let zone=e.time_zone||COMMUNITY_TIME_ZONE;
  try{new Intl.DateTimeFormat("en-GB",{timeZone:zone});}
  catch{zone=COMMUNITY_TIME_ZONE;}
  return {
    id:e.id,title:e.title,
    start:e.all_day?e.start_at.slice(0,10):e.start_at,
    end:e.all_day?e.end_at.slice(0,10):e.end_at,
    allDay:e.all_day===true,url:publicUrl(e.external_url),
    timeZone:zone,
  };
}

/** Used only by the future sync adapter; no external service calls. */
export type SyncableEvent = {
  id:string;title:string;description:string;startAt:string;endAt:string;
  timeZone:string;allDay:boolean;location:string|null;externalUrl:string|null;
  state:"publish"|"unpublish";
};
export function toSyncableEvent(e:EventCalendarSource & {
  description:string;location?:string|null;
}):SyncableEvent|null {
  if(!e.start_at||!e.end_at||!Number.isFinite(Date.parse(e.start_at))||
    !Number.isFinite(Date.parse(e.end_at))||Date.parse(e.end_at)<=Date.parse(e.start_at))
    return null;
  return {
    id:e.id,title:e.title,description:e.description,
    startAt:e.start_at,endAt:e.end_at,
    timeZone:e.time_zone||COMMUNITY_TIME_ZONE,
    allDay:e.all_day===true,location:e.location??null,
    externalUrl:publicUrl(e.external_url),
    state:e.status==="published"&&!e.date_review_required?"publish":"unpublish",
  };
}
