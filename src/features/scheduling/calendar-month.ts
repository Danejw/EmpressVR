export const COMMUNITY_TIME_ZONE = "Europe/London";
export type PublicCalendarEvent = Readonly<{
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  url: string | null;
  timeZone?: string;
}>;

export function monthKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: COMMUNITY_TIME_ZONE, month: "2-digit", year: "numeric",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Unable to resolve London month");
  return year + "-" + month;
}
export function shiftMonth(month: string, amount: number): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !Number.isInteger(amount)) {
    throw new Error("Invalid calendar month");
  }
  const [year, mon] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, mon - 1 + amount, 1));
  return next.getUTCFullYear() + "-" + String(next.getUTCMonth() + 1).padStart(2, "0");
}
export function monthCells(month: string): (string | null)[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid calendar month");
  const [year, mon] = month.split("-").map(Number);
  const offset = new Date(Date.UTC(year, mon - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    const date = index - offset + 1;
    return date >= 1 && date <= days ? month + "-" + String(date).padStart(2, "0") : null;
  });
}
export function londonDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid event date");
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: COMMUNITY_TIME_ZONE, day: "2-digit", month: "2-digit", year: "numeric",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return part("year") + "-" + part("month") + "-" + part("day");
}
export function eventOnDay(event: PublicCalendarEvent, date: string): boolean {
  const first = event.allDay ? event.start : londonDay(event.start);
  const ending = event.allDay
    ? new Date(Date.parse(event.end + "T00:00:00Z") - 1)
    : new Date(Date.parse(event.end) - 1);
  const last = event.allDay ? ending.toISOString().slice(0, 10) : londonDay(ending.toISOString());
  return date >= first && date <= last;
}
