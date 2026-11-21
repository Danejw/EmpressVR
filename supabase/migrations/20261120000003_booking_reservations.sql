-- Offering catalog and atomic reservation holds (Google Calendar is not capacity authority).
create table public.offerings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(slug) between 1 and 128),
  title text not null check (length(title) > 0),
  description text not null default '',
  kind text not null check (kind in ('class', 'appointment', 'informational')),
  published boolean not null default false,
  accepting_bookings boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.booking_slots (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.offerings(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  time_zone text not null check (length(time_zone) between 3 and 64),
  capacity integer not null check (capacity > 0),
  max_seats_per_booking integer not null check (max_seats_per_booking > 0 and max_seats_per_booking <= capacity),
  available boolean not null default false,
  requires_payment boolean not null default false,
  google_calendar_event_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slot_times_ordered check (ends_at > starts_at),
  unique(id, offering_id)
);
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null,
  slot_id uuid not null,
  attendee_ref text not null check (length(attendee_ref) between 1 and 128),
  seats integer not null check (seats > 0),
  status text not null default 'held' check (status in ('held','confirmed','cancelled','expired')),
  idempotency_key text not null unique check (length(idempotency_key) between 16 and 128),
  requires_payment boolean not null,
  payment_order_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  constraint booking_slot_offering_fk foreign key (slot_id, offering_id)
    references public.booking_slots(id, offering_id) on delete restrict,
  constraint hold_expiration_order check (expires_at > created_at)
);
create index idx_booking_slots_by_offering on public.booking_slots(offering_id, starts_at);
create index idx_bookings_slot_active on public.bookings(slot_id, status, expires_at);
create index idx_bookings_attendee on public.bookings(attendee_ref);

alter table public.offerings enable row level security;
alter table public.booking_slots enable row level security;
alter table public.bookings enable row level security;
revoke all on public.offerings, public.booking_slots, public.bookings from anon, authenticated;
grant select on public.offerings, public.booking_slots to anon, authenticated;
grant all on public.offerings, public.booking_slots, public.bookings to service_role;
create policy "public published offerings" on public.offerings
  for select to anon, authenticated using (published);
create policy "public future slots" on public.booking_slots
  for select to anon, authenticated using (
    available and starts_at > now() and exists (
      select 1 from public.offerings o where o.id = offering_id and o.published
    )
  );

-- Trusted server-only, security-invoker RPC. Lock the slot row before counting seats.
create function private.reserve_booking_hold(
  p_offering_id uuid, p_slot_id uuid, p_attendee_ref text,
  p_seats integer, p_idempotency_key text, p_hold_minutes integer default 15
) returns public.bookings
language plpgsql security invoker set search_path = ''
as $$
declare
  v_existing public.bookings%rowtype;
  v_slot public.booking_slots%rowtype;
  v_booking public.bookings%rowtype;
  v_occupied bigint;
  v_now timestamptz;
  v_open boolean;
begin
  if p_offering_id is null or p_slot_id is null or
     p_attendee_ref is null or length(p_attendee_ref) not between 1 and 128 or
     p_attendee_ref !~ '^[A-Za-z0-9][A-Za-z0-9_-]*$' or
     p_idempotency_key is null or length(p_idempotency_key) not between 16 and 128 or
     p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9_-]*$' or
     p_seats is null or p_seats < 1 or
     p_hold_minutes is null or p_hold_minutes not between 1 and 60 then
    raise exception 'Invalid booking request';
  end if;

  -- Return the original booking for identical retries, even after the slot closes.
  select * into v_existing from public.bookings where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.offering_id <> p_offering_id or v_existing.slot_id <> p_slot_id or
       v_existing.attendee_ref <> p_attendee_ref or v_existing.seats <> p_seats then
      raise exception 'Idempotency key reused with different booking payload';
    end if;
    return v_existing;
  end if;

  select * into v_slot from public.booking_slots where id = p_slot_id for update;
  if not found or v_slot.offering_id <> p_offering_id then
    raise exception 'Slot does not belong to offering';
  end if;

  -- A concurrent same-slot retry must observe the first transaction's insert.
  select * into v_existing from public.bookings where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.offering_id <> p_offering_id or v_existing.slot_id <> p_slot_id or
       v_existing.attendee_ref <> p_attendee_ref or v_existing.seats <> p_seats then
      raise exception 'Idempotency key reused with different booking payload';
    end if;
    return v_existing;
  end if;

  v_now := clock_timestamp();
  select (published and accepting_bookings and kind <> 'informational') into v_open
    from public.offerings where id = p_offering_id;
  if not coalesce(v_open, false) or not v_slot.available or v_slot.starts_at <= v_now or
     p_seats > v_slot.max_seats_per_booking then
    raise exception 'Booking is unavailable';
  end if;

  select coalesce(sum(seats), 0) into v_occupied from public.bookings
    where slot_id = p_slot_id and
          (status = 'confirmed' or (status = 'held' and expires_at > v_now));
  if v_occupied + p_seats > v_slot.capacity then
    raise exception 'Booking capacity exceeded';
  end if;

  insert into public.bookings (
    offering_id, slot_id, attendee_ref, seats, status, idempotency_key,
    requires_payment, created_at, expires_at
  ) values (
    p_offering_id, p_slot_id, p_attendee_ref, p_seats, 'held', p_idempotency_key,
    v_slot.requires_payment, v_now,
    least(v_slot.starts_at, v_now + p_hold_minutes * interval '1 minute')
  ) returning * into v_booking;
  return v_booking;
end;
$$;
revoke all on function private.reserve_booking_hold(uuid, uuid, text, integer, text, integer) from public, anon, authenticated;
grant execute on function private.reserve_booking_hold(uuid, uuid, text, integer, text, integer) to service_role;
