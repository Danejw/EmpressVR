"use client";
import { monthCells, shiftMonth } from "@/features/scheduling/calendar-month";

export type CalendarMarker = { day: string; label?: string };
const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/** Reusable, data-agnostic monthly calendar. Public and staff consumers supply markers. */
export function MonthGrid({
  month, onMonthChange, selectedDay, onDaySelect, markers = [], disabledDay, markerLabel = "sessions",
}: {
  month: string;
  onMonthChange: (month: string) => void;
  selectedDay?: string | null;
  onDaySelect?: (day: string) => void;
  markers?: readonly CalendarMarker[];
  disabledDay?: (day: string) => boolean;
  markerLabel?: string;
}) {
  const dates = monthCells(month);
  const monthLabel = new Intl.DateTimeFormat("en-GB",{ month:"long",year:"numeric",timeZone:"UTC" })
    .format(new Date(month+"-01T12:00:00Z"));
  const summaries = new Map<string,{count:number;labels:string[]}>();
  for (const marker of markers) {
    const summary = summaries.get(marker.day) ?? { count:0,labels:[] };
    summary.count++;
    if (marker.label) summary.labels.push(marker.label);
    summaries.set(marker.day,summary);
  }
  return <section className="shared-month-grid" aria-label="Calendar">
    <div className="shared-month-nav">
      <button type="button" aria-label="Previous month" onClick={()=>onMonthChange(shiftMonth(month,-1))}>‹</button>
      <strong aria-live="polite">{monthLabel}</strong>
      <button type="button" aria-label="Next month" onClick={()=>onMonthChange(shiftMonth(month,1))}>›</button>
    </div>
    <div className="shared-month-days">
      {weekdays.map(day=><span key={day} aria-hidden="true">{day}</span>)}
      {dates.map((day,index)=>{
        if (!day) return <span key={"empty-"+index} aria-hidden="true" />;
        const marker = summaries.get(day);
        const disabled = disabledDay?.(day) ?? false;
        return <button type="button" key={day}
          disabled={!onDaySelect || disabled}
          aria-label={day + (marker ? ", "+ marker.count + " "+markerLabel : "")}
          aria-pressed={selectedDay===day}
          className={selectedDay===day?"is-selected":marker?"has-events":""}
          title={marker?.labels.join(", ") || day}
          onClick={()=>onDaySelect?.(day)}>
          <span>{Number(day.slice(-2))}</span>
          {marker ? <small aria-hidden="true">{marker.count}</small> : null}
        </button>;
      })}
    </div>
  </section>;
}
