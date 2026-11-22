"use client";

import { useState } from "react";
import {
  COMMUNITY_TIME_ZONE, eventOnDay, monthCells, shiftMonth,
  type PublicCalendarEvent,
} from "@/features/scheduling/calendar-month";

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(month + "-01T12:00:00Z"));
}
function eventTime(event: PublicCalendarEvent): string {
  if (event.allDay) return "All day";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: event.timeZone || COMMUNITY_TIME_ZONE, hour: "2-digit", minute: "2-digit",
  }).format(new Date(event.start));
}

export function CommunityCalendar({
  events, initialMonth, firstMonth, lastMonth, status,
}: {
  events: PublicCalendarEvent[];
  initialMonth: string;
  firstMonth: string;
  lastMonth: string;
  status: "connected" | "unavailable" | "unconfigured";
}) {
  const [month, setMonth] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: COMMUNITY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const todayParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: COMMUNITY_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const getPart = (part: string) => todayParts.find((p) => p.type === part)?.value || "";
  const londonToday = getPart("year") + "-" + getPart("month") + "-" + getPart("day");
  void today;

  const cells = monthCells(month);
  const visibleEvents = events.filter((event) =>
    cells.some((date) => date && eventOnDay(event, date))
  );
  const selectedEvents = selectedDay
    ? visibleEvents.filter((event) => eventOnDay(event, selectedDay))
    : [];
  function navigate(delta: number) {
    const next = shiftMonth(month, delta);
    if (next < firstMonth || next > lastMonth) return;
    setMonth(next);
    setSelectedDay(null);
  }

  return <div className="community-calendar" aria-label="Community events calendar">
    <div className="community-calendar-navigation">
      <button type="button" aria-label="Go to previous month" disabled={month <= firstMonth}
        onClick={() => navigate(-1)}>‹</button>
      <h4 aria-live="polite">{monthLabel(month)}</h4>
      <button type="button" aria-label="Go to next month" disabled={month >= lastMonth}
        onClick={() => navigate(1)}>›</button>
    </div>
    <div className="community-calendar-weekdays" aria-hidden="true">
      {weekdays.map((day) => <span key={day}>{day}</span>)}
    </div>
    <div className="community-calendar-grid">
      {cells.map((date, index) => {
        if (!date) return <div className="community-calendar-blank" key={"empty-" + index} aria-hidden="true" />;
        const dayEvents = visibleEvents.filter((event) => eventOnDay(event, date));
        const number = Number(date.slice(-2));
        const label = dayNames[index % 7] + " " + number;
        const classes = ["community-calendar-day",
          date === londonToday ? "is-today" : "",
          dayEvents.length ? "has-events" : "",
          selectedDay === date ? "is-selected" : "",
        ].filter(Boolean).join(" ");
        return dayEvents.length ? (
          <button key={date} type="button" className={classes} aria-pressed={selectedDay === date}
            aria-label={label + ", " + dayEvents.length + (dayEvents.length === 1 ? " event" : " events")}
            onClick={() => setSelectedDay(selectedDay === date ? null : date)}>
            <span className="calendar-day-name">{dayNames[index % 7]}</span>
            <span className="calendar-day-number">{number}</span>
            <span className="calendar-event-markers">
              {dayEvents.slice(0, 2).map((event) => <span className="calendar-event-marker" key={event.id}>{event.title}</span>)}
              {dayEvents.length > 2 ? <span className="calendar-event-more">+{dayEvents.length - 2} more</span> : null}
            </span>
          </button>
        ) : (
          <div key={date} className={classes} aria-label={label}>
            <span className="calendar-day-name">{dayNames[index % 7]}</span>
            <span className="calendar-day-number">{number}</span>
          </div>
        );
      })}
    </div>
    {selectedEvents.length ? (
      <div className="community-calendar-details" aria-live="polite">
        <h5>Events on {selectedDay ? new Intl.DateTimeFormat("en-GB", {
          day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
        }).format(new Date(selectedDay + "T12:00:00Z")) : ""}</h5>
        {selectedEvents.map((event) =>
          <div className="community-calendar-event" key={event.id}>
            <span>{eventTime(event)}</span>
            {event.url
              ? <a href={event.url} target="_blank" rel="noopener noreferrer">{event.title}</a>
              : <strong>{event.title}</strong>}
          </div>
        )}
      </div>
    ) : null}
    {status === "unavailable" ? <p className="community-calendar-state">
      Events are temporarily unavailable. <a href="https://www.empressvr.com/community" rel="noopener noreferrer">View the current community page</a>.
    </p> : status === "unconfigured" ? <p className="community-calendar-state">
      Check the <a href="https://www.empressvr.com/community" rel="noopener noreferrer">current community page</a> for event updates.
    </p> : !visibleEvents.length ? <p className="community-calendar-state">No events listed for {monthLabel(month)}.</p> : null}
  </div>;
}
