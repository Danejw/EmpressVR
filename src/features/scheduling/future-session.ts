import { formatLocalInput } from "./zoned-time";

/** Native datetime-local inputs use wall time, so calculate the min in the selected zone. */
export function minimumStartLocal(referenceNow: string, zone: string): string {
  const now = Date.parse(referenceNow);
  if (!Number.isFinite(now)) throw new Error("Invalid reference time.");
  return formatLocalInput(new Date(now + 60000).toISOString(), zone);
}
export function minuteAfterLocal(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return "";
  const timestamp = Date.parse(value + ":00Z");
  return Number.isFinite(timestamp) ? new Date(timestamp + 60000).toISOString().slice(0,16) : "";
}
export function minimumEndLocal(referenceNow: string, zone: string, startLocal: string): string {
  const minStart = minimumStartLocal(referenceNow, zone);
  const later = minuteAfterLocal(startLocal);
  return later > minStart ? later : minStart;
}
