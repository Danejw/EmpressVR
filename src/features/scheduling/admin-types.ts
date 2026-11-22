/** Shared booking-management contracts. UI components do not know about Supabase. */
export type Offering = {
  id: string; slug: string; title: string; description: string;
  kind: "class" | "appointment" | "informational";
  price_minor: number; currency: string; published: boolean; accepting_bookings: boolean;
};
export type Session = {
  id: string; offering_id: string; starts_at: string; ends_at: string; time_zone: string;
  capacity: number; max_seats_per_booking: number; available: boolean; requires_payment: boolean;
  resource_id: string | null;
};
export type Reservation = {
  id: string; offering_id: string; slot_id: string; seats: number;
  status: "held" | "confirmed" | "cancelled" | "expired";
  requires_payment: boolean; payment_order_id: string | null;
  created_at: string; expires_at: string; confirmed_at: string | null; cancelled_at: string | null;
  attendee_ref: string;
};
export type BookingResource = { id:string;name:string;active:boolean };
export type BookingContact = { booking_id: string; display_name: string | null; email: string };
export type BookingAudit = { id: string; booking_id: string; action: string; actor_id: string | null; created_at: string };
export type OfferingInput = Omit<Offering,"id"> & { id?: string };
export type SessionInput = Omit<Session,"id"> & { id?: string };
export type ManualBookingInput = { slot_id: string; name: string; email: string; seats: number; idempotency_key: string };
export type ActionResult = { ok: true; id: string } | { ok: false; error: string };
