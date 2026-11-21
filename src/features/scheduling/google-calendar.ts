// Server-side, read-only Google Calendar adapter for a dedicated public-events calendar.
// Keep the community-events calendar separate from any private staff/booking calendar.
import type { PublicCalendarEvent } from "./calendar-month";

type GoogleEvent = {
  id?: string;
  summary?: string;
  status?: string;
  visibility?: string;
  htmlLink?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};
export type CalendarFeed = Readonly<{
  status: "connected" | "unconfigured" | "unavailable";
  events: PublicCalendarEvent[];
}>;
export type CalendarConfig = Readonly<{
  calendarId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}>;
function publicCalendarLink(link: unknown): string | null {
  if (typeof link !== "string") return null;
  try {
    const url = new URL(link);
    return url.protocol === "https:" &&
      ["www.google.com", "calendar.google.com"].includes(url.hostname) ? url.toString() : null;
  } catch { return null; }
}
export function toPublicEvent(raw: GoogleEvent): PublicCalendarEvent | null {
  if (!raw.id || raw.status === "cancelled" ||
      raw.visibility === "private" || raw.visibility === "confidential") return null;
  const allDay = Boolean(raw.start?.date && raw.end?.date);
  const start = allDay ? raw.start?.date : raw.start?.dateTime;
  const end = allDay ? raw.end?.date : raw.end?.dateTime;
  if (!start || !end || Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end)) ||
      Date.parse(end) <= Date.parse(start)) return null;
  return {
    id: raw.id,
    title: raw.summary?.trim().slice(0, 140) || "Community event",
    start, end, allDay,
    url: publicCalendarLink(raw.htmlLink),
  };
}

export async function fetchCommunityEvents(
  start: Date, end: Date,
  config: CalendarConfig = {
    calendarId: process.env.GOOGLE_COMMUNITY_CALENDAR_ID || "",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
  },
  request: typeof fetch = fetch,
): Promise<CalendarFeed> {
  if (!config.calendarId || !config.clientId || !config.clientSecret || !config.refreshToken) {
    return { status: "unconfigured", events: [] };
  }
  if (!(start instanceof Date) || !(end instanceof Date) ||
      !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
      end <= start) return { status: "unavailable", events: [] };

  try {
    const tokenResponse = await request("https://oauth2.googleapis.com/token", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(8000),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId, client_secret: config.clientSecret,
        refresh_token: config.refreshToken, grant_type: "refresh_token",
      }),
    });
    if (!tokenResponse.ok) throw new Error("Could not refresh Google Calendar authorization");
    const token = await tokenResponse.json() as { access_token?: string };
    if (!token.access_token) throw new Error("Missing Google access token");

    const events: PublicCalendarEvent[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < 4; page++) {
      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/" +
        encodeURIComponent(config.calendarId) + "/events");
      url.searchParams.set("timeMin", start.toISOString());
      url.searchParams.set("timeMax", end.toISOString());
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("showDeleted", "false");
      url.searchParams.set("maxResults", "1000");
      url.searchParams.set("fields", "nextPageToken,items(id,summary,status,visibility,htmlLink,start,end)");
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const response = await request(url.toString(), {
        headers: { Authorization: "Bearer " + token.access_token },
        cache: "no-store", signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("Google Calendar request failed");
      const payload = await response.json() as { items?: GoogleEvent[]; nextPageToken?: string };
      for (const item of Array.isArray(payload.items) ? payload.items : []) {
        const event = toPublicEvent(item);
        if (event) events.push(event);
      }
      pageToken = payload.nextPageToken;
      if (!pageToken) return {
        status: "connected",
        events: events.sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
      };
    }
    // Fail closed instead of showing an incomplete calendar.
    return { status: "unavailable", events: [] };
  } catch {
    return { status: "unavailable", events: [] };
  }
}
