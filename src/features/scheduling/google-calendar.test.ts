import { describe, expect, it, vi } from "vitest";
import { fetchCommunityEvents, toPublicEvent } from "./google-calendar";

const config = {
  calendarId: "events@example.com", clientId: "test-client",
  clientSecret: "test-secret", refreshToken: "test-refresh",
};
const begin = new Date("2026-11-01T00:00:00Z");
const end = new Date("2026-12-01T00:00:00Z");
function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("Public Google Calendar adapter", () => {
  it("fails closed without configuration and never fetches Google", async () => {
    const request = vi.fn();
    const result = await fetchCommunityEvents(begin, end, { ...config, calendarId: "" },
      request as unknown as typeof fetch);
    expect(result).toEqual({ status: "unconfigured", events: [] });
    expect(request).not.toHaveBeenCalled();
  });

  it("omits cancelled and private events and rejects unsafe links", () => {
    expect(toPublicEvent({ id: "x", status: "cancelled", start: { date: "2026-11-01" },
      end: { date: "2026-11-02" } })).toBeNull();
    expect(toPublicEvent({ id: "y", visibility: "private", start: { date: "2026-11-01" },
      end: { date: "2026-11-02" } })).toBeNull();
    expect(toPublicEvent({ id: "z", summary: "Open Social", htmlLink: "https://example.com/evil",
      start: { date: "2026-11-01" }, end: { date: "2026-11-02" } })).toMatchObject({
        title: "Open Social", url: null, allDay: true,
      });
  });

  it("authorizes on the server, expands recurring events and paginates", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(reply({ access_token: "test-access" }))
      .mockResolvedValueOnce(reply({
        items: [
          { id: "one", summary: "Creative Code Jam", status: "confirmed", visibility: "public",
            start: { dateTime: "2026-11-05T18:00:00Z" },
            end: { dateTime: "2026-11-05T20:00:00Z" },
            htmlLink: "https://www.google.com/calendar/event?eid=123" },
          { id: "private", summary: "Private meeting", visibility: "private",
            start: { date: "2026-11-01" }, end: { date: "2026-11-02" } },
        ],
        nextPageToken: "page-two",
      }))
      .mockResolvedValueOnce(reply({
        items: [{ id: "two", summary: "Community Social",
          start: { date: "2026-11-08" }, end: { date: "2026-11-09" } }],
      }));
    const result = await fetchCommunityEvents(begin, end, config, request as unknown as typeof fetch);
    expect(result.status).toBe("connected");
    expect(result.events.map((e) => e.title)).toEqual(["Creative Code Jam", "Community Social"]);
    expect(JSON.stringify(result)).not.toContain("Private meeting");
    expect(request).toHaveBeenCalledTimes(3);
    const tokenRequest = request.mock.calls[0][1] as RequestInit;
    expect(tokenRequest.method).toBe("POST");
    const tokenBody = tokenRequest.body as URLSearchParams;
    expect(tokenBody.get("grant_type")).toBe("refresh_token");
    const pageUrl = new URL(request.mock.calls[1][0] as string);
    expect(pageUrl.searchParams.get("singleEvents")).toBe("true");
    expect(pageUrl.searchParams.get("orderBy")).toBe("startTime");
    expect(request.mock.calls[2][0]).toContain("pageToken=page-two");
  });

  it("shows unavailable rather than old/private data on Google errors", async () => {
    const request = vi.fn().mockResolvedValueOnce(reply({ error: "invalid_grant" }, 400));
    expect(await fetchCommunityEvents(begin, end, config, request as unknown as typeof fetch))
      .toEqual({ status: "unavailable", events: [] });
  });
});
