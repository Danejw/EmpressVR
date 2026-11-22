import { formatSlotTime } from "./booking-view";
import type { Session } from "./admin-types";

/** Adapter between stored snake_case sessions and reusable public time formatting. */
export function formatSessionTime(session: Session): string {
  return formatSlotTime({
    id: session.id, offeringId: session.offering_id,
    startsAt: session.starts_at, endsAt: session.ends_at,
    timeZone: session.time_zone, capacity: session.capacity,
    maxSeatsPerBooking: session.max_seats_per_booking,
    available: session.available, requiresPayment: session.requires_payment,
  });
}
