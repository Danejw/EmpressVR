/** Time zone conversion for scheduling forms, independent of browser locale.
 * Reject DST gaps and ambiguous local times instead of silently shifting sessions.
 */
function zonedParts(utc: number, zone: string) {
  const date = new Date(utc);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const field = (key: string) => Number(parts.find(part => part.type === key)?.value);
  return {
    year: field("year"), month: field("month"), day: field("day"),
    hour: field("hour"), minute: field("minute"), second: field("second"),
  };
}
export function formatLocalInput(iso: string, zone: string): string {
  const p = zonedParts(Date.parse(iso), zone);
  return [p.year, String(p.month).padStart(2,"0"), String(p.day).padStart(2,"0")].join("-")
    + "T" + [p.hour,p.minute].map(n=>String(n).padStart(2,"0")).join(":");
}
export function localToUtc(value: string, zone: string): string {
  const matched = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!matched) throw new Error("Enter a valid date and time.");
  const [year, month, day, hour, minute] = matched.slice(1).map(Number);
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  const wallDate = new Date(wall);
  if (wallDate.getUTCFullYear() !== year || wallDate.getUTCMonth() !== month - 1 ||
      wallDate.getUTCDate() !== day || wallDate.getUTCHours() !== hour ||
      wallDate.getUTCMinutes() !== minute) throw new Error("Invalid calendar date.");
  try { new Intl.DateTimeFormat("en-GB",{timeZone:zone}); }
  catch { throw new Error("Invalid time zone."); }
  const offsets = new Set<number>();
  for (const delta of [-36, -12, 0, 12, 36]) {
    const guessed = wall + delta * 3600000;
    const p = zonedParts(guessed, zone);
    const observed = Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
    offsets.add(observed - guessed);
  }
  const matches = [...offsets].map(offset => wall - offset).filter(instant => {
    const p = zonedParts(instant, zone);
    return p.year === year && p.month === month && p.day === day &&
      p.hour === hour && p.minute === minute && p.second === 0;
  });
  if (matches.length !== 1) throw new Error(
    matches.length ? "This time occurs twice due to a clock change. Choose another time."
      : "This local time does not exist due to a clock change.");
  return new Date(matches[0]).toISOString();
}
