-- Public FREE reservations and resource conflict protection.
-- Existing tables are reused. No paid capture, calendar synchronization, emails
-- or automatic customer bookings are activated by this migration.
-- Only signed-in, email-confirmed accounts can confirm free reservations.
-- SECURITY DEFINER RPCs are narrowly scoped; no raw customer access is granted
-- to the private booking ledger or attendee contact table.

create table public.booking_resources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.booking_resources enable row level security;
revoke all on public.booking_resources from anon, authenticated;
grant select, insert, update on public.booking_resources to authenticated;
grant all on public.booking_resources to service_role;
create policy "mfa admins see booking resources" on public.booking_resources
for select to authenticated using (
  (select auth.jwt()->>'aal')='aal2'
  and exists (select 1 from public.staff_roles sr
    where sr.user_id=(select auth.uid()) and sr.role='admin')
);
create policy "mfa admins create booking resources" on public.booking_resources
for insert to authenticated with check (
  (select auth.jwt()->>'aal')='aal2'
  and exists (select 1 from public.staff_roles sr
    where sr.user_id=(select auth.uid()) and sr.role='admin')
);
create policy "mfa admins edit booking resources" on public.booking_resources
for update to authenticated using (
  (select auth.jwt()->>'aal')='aal2'
  and exists (select 1 from public.staff_roles sr
    where sr.user_id=(select auth.uid()) and sr.role='admin')
) with check (
  (select auth.jwt()->>'aal')='aal2'
  and exists (select 1 from public.staff_roles sr
    where sr.user_id=(select auth.uid()) and sr.role='admin')
);

alter table public.booking_slots add column resource_id uuid
  references public.booking_resources(id) on delete restrict;
create index idx_booking_slots_resource_times on public.booking_slots
  (resource_id, starts_at, ends_at) where resource_id is not null;
grant insert(resource_id), update(resource_id) on public.booking_slots to authenticated;

-- Existing closed slots can remain unassigned, but no appointment can be made
-- available to the public until a shared staff/room resource has been set.
create function private.require_appointment_resource() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_kind text; v_active boolean;
begin
  select kind into v_kind from public.offerings where id=new.offering_id;
  if v_kind='appointment' and new.available and new.resource_id is null then
    raise exception 'Appointments require a resource before opening availability';
  end if;
  if new.resource_id is not null then
    select active into v_active from public.booking_resources where id=new.resource_id;
    if v_active is distinct from true and new.available then
      raise exception 'An active resource is required for open sessions';
    end if;
  end if;
  return new;
end; $$;
revoke all on function private.require_appointment_resource() from public,anon,authenticated;
create trigger booking_require_resource before insert or update
on public.booking_slots for each row execute function private.require_appointment_resource();

-- Preserve the existing rule: occupied sessions cannot be moved or resized,
-- including resource reassignment.
create or replace function private.guard_session_changes() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_occupied bigint;
begin
  if current_user <> 'authenticated' then return new; end if;
  if new.offering_id <> old.offering_id then
    raise exception 'Cannot change a session offering';
  end if;
  select coalesce(sum(seats),0) into v_occupied
  from public.bookings b where b.slot_id=old.id
    and (b.status='confirmed' or
      (b.status='held' and b.expires_at>clock_timestamp()));
  if v_occupied>0 and (
    new.starts_at is distinct from old.starts_at or
    new.ends_at is distinct from old.ends_at or
    new.time_zone is distinct from old.time_zone or
    new.capacity is distinct from old.capacity or
    new.max_seats_per_booking is distinct from old.max_seats_per_booking or
    new.requires_payment is distinct from old.requires_payment or
    new.resource_id is distinct from old.resource_id
  ) then raise exception 'Cannot change a session that already has reservations';
  end if;
  return new;
end; $$;

-- Opening customer-facing booking is explicit and FREE only until Stripe
-- confirmations and refunds have been integrated.
alter table public.offerings add constraint open_public_booking_is_free
  check (not accepting_bookings or
    (published and kind <> 'informational' and price_minor=0));
grant update (accepting_bookings) on public.offerings to authenticated;

-- Central trigger guards direct Data API writes by staff and all trusted
-- reservation RPCs. The function lives outside the exposed schema and has no
-- direct EXECUTE grant. Running with owner privileges is required to count ALL
-- reserved seats regardless of each customer's RLS visibility.
create or replace function private.guard_free_booking_mutations() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_slot public.booking_slots%rowtype;
        v_occupied bigint; v_price bigint; v_kind text;
        v_published boolean; v_accepts boolean;
        v_admin boolean;
begin
  -- Internal service processes remain responsible for their existing
  -- payment-backed bookings. This gate applies to all signed-in writes.
  if coalesce((select auth.jwt()->>'role'),'')<>'authenticated' then
    return new;
  end if;
  if tg_op='UPDATE' then
    if old.status not in ('held','confirmed') or old.requires_payment
      or old.payment_order_id is not null or new.status<>'cancelled'
      or new.cancelled_at is null or
      new.slot_id<>old.slot_id or new.seats<>old.seats or
      new.attendee_ref<>old.attendee_ref then
      raise exception 'Only unpaid active bookings may be cancelled';
    end if;
    return new;
  end if;

  v_admin:=coalesce((select auth.jwt()->>'aal')='aal2',false)
    and exists(select 1 from public.staff_roles sr
      where sr.user_id=(select auth.uid()) and sr.role='admin');
  if new.status<>'confirmed' or new.requires_payment
    or new.payment_order_id is not null or new.customer_id is not null
    or new.confirmed_at is null then
    raise exception 'Only confirmed free reservations are permitted';
  end if;
  if not v_admin and new.attendee_ref is distinct from
    ('account_' || (select auth.uid())::text) then
    raise exception 'Reservation owner mismatch';
  end if;

  select * into v_slot from public.booking_slots
  where id=new.slot_id for update;
  if not found or v_slot.offering_id<>new.offering_id
    or not v_slot.available or v_slot.requires_payment
    or v_slot.starts_at<=clock_timestamp()
    or new.seats<1 or new.seats>v_slot.max_seats_per_booking then
    raise exception 'Session is unavailable for a free reservation';
  end if;

  select price_minor,kind,published,accepting_bookings
    into v_price,v_kind,v_published,v_accepts
  from public.offerings where id=new.offering_id;
  if v_price is null or v_price<>0 or v_kind='informational' or
    (not v_admin and (not v_published or not v_accepts)) then
    raise exception 'Offering does not accept free online bookings';
  end if;
  if v_kind='appointment' and v_slot.resource_id is null then
    raise exception 'An appointment needs an assigned resource';
  end if;

  if v_slot.resource_id is not null then
    perform 1 from public.booking_resources
      where id=v_slot.resource_id and active for update;
    if not found then raise exception 'Resource unavailable'; end if;
    if exists (
      select 1 from public.bookings b
      join public.booking_slots s on s.id=b.slot_id
      where s.resource_id=v_slot.resource_id and s.id<>v_slot.id
        and s.starts_at<v_slot.ends_at and s.ends_at>v_slot.starts_at
        and (b.status='confirmed' or
          (b.status='held' and b.expires_at>clock_timestamp()))
    ) then raise exception 'Another appointment occupies this resource'; end if;
  end if;

  select coalesce(sum(b.seats),0) into v_occupied from public.bookings b
    where b.slot_id=v_slot.id and
    (b.status='confirmed' or
      (b.status='held' and b.expires_at>clock_timestamp()));
  if v_occupied+new.seats>v_slot.capacity then
    raise exception 'No remaining seats';
  end if;
  return new;
end; $$;
revoke all on function private.guard_free_booking_mutations() from public,anon,authenticated;

-- Customer actions are atomic and do not require broad public INSERT/UPDATE
-- policies on bookings/booking_contacts. These public RPCs are intentionally
-- narrow, check the caller's confirmed Auth email and never return other
-- customers' contact information.
create function public.reserve_public_free_booking(
  p_slot_id uuid,p_attendee_name text,p_seats integer,p_idempotency_key text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid());
        v_email text; v_slot public.booking_slots%rowtype;
        v_existing public.bookings%rowtype;
        v_contact public.booking_contacts%rowtype;
        v_booking_id uuid; v_recent integer;
begin
  if v_user is null or (select auth.jwt()->>'role')<>'authenticated' then
    raise exception 'Sign in to book a session';
  end if;
  select lower(email) into v_email from auth.users
    where id=v_user and email_confirmed_at is not null;
  if v_email is null then raise exception 'Verify your email to reserve'; end if;
  if p_attendee_name is null or length(trim(p_attendee_name)) not between 1 and 200
    or p_seats is null or p_seats not between 1 and 100
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[A-Za-z0-9_-]{24,128}$' then
    raise exception 'Invalid reservation details';
  end if;

  select * into v_existing from public.bookings
    where idempotency_key=p_idempotency_key;
  if found then
    select * into v_contact from public.booking_contacts
      where booking_id=v_existing.id;
    if v_existing.attendee_ref='account_'||v_user::text
      and v_existing.slot_id=p_slot_id
      and v_existing.seats=p_seats
      and v_contact.display_name=trim(p_attendee_name)
      and v_contact.email=v_email then
      return v_existing.id;
    end if;
    raise exception 'That reservation request was already used';
  end if;

  -- Per-account limit reduces bulk slot blocking. Retries above are idempotent.
  select count(*) into v_recent from public.bookings
    where attendee_ref='account_'||v_user::text
      and status='confirmed' and created_at>clock_timestamp()-interval '1 hour';
  if v_recent>=5 then
    raise exception 'Too many reservations. Try again later';
  end if;
  select * into v_slot from public.booking_slots
    where id=p_slot_id for update;
  if not found then raise exception 'Session unavailable'; end if;
  -- The private insertion guard serializes by resource and checks the entire
  -- resource schedule and actual remaining seat capacity under lock.
  insert into public.bookings(
    offering_id,slot_id,attendee_ref,seats,status,idempotency_key,
    requires_payment,expires_at,confirmed_at
  ) values (
    v_slot.offering_id,p_slot_id,'account_'||v_user::text,p_seats,
    'confirmed',p_idempotency_key,false,v_slot.starts_at,clock_timestamp()
  ) returning id into v_booking_id;
  insert into public.booking_contacts(booking_id,email,display_name)
    values(v_booking_id,v_email,trim(p_attendee_name));
  return v_booking_id;
end; $$;
revoke all on function public.reserve_public_free_booking(uuid,text,integer,text)
  from public,anon,authenticated;
grant execute on function public.reserve_public_free_booking(uuid,text,integer,text)
  to authenticated;

create function public.cancel_my_free_booking(p_booking_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=(select auth.uid()); v_booking public.bookings%rowtype;
begin
  if v_user is null or (select auth.jwt()->>'role')<>'authenticated' then
    raise exception 'Sign in to manage your bookings';
  end if;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found or v_booking.attendee_ref is distinct from
    ('account_'||v_user::text) then raise exception 'Booking not found'; end if;
  if v_booking.status='cancelled' then return true; end if;
  if v_booking.status<>'confirmed' or v_booking.requires_payment
    or v_booking.payment_order_id is not null or
    not exists(select 1 from public.booking_slots
      where id=v_booking.slot_id and starts_at>clock_timestamp()) then
    raise exception 'This booking cannot be cancelled online';
  end if;
  update public.bookings set status='cancelled',cancelled_at=clock_timestamp()
    where id=p_booking_id;
  return true;
end; $$;
revoke all on function public.cancel_my_free_booking(uuid)
  from public,anon,authenticated;
grant execute on function public.cancel_my_free_booking(uuid) to authenticated;

create function public.my_free_bookings()
returns table(
  id uuid, title text, starts_at timestamptz, ends_at timestamptz,
  time_zone text, seats integer, status text, created_at timestamptz
) language sql stable security definer set search_path='' as $$
  select b.id,o.title,s.starts_at,s.ends_at,s.time_zone,b.seats,b.status,b.created_at
  from public.bookings b
  join public.booking_slots s on s.id=b.slot_id
  join public.offerings o on o.id=b.offering_id
  where (select auth.uid()) is not null
    and (select auth.jwt()->>'role')='authenticated'
    and b.attendee_ref='account_'||(select auth.uid())::text
    and not b.requires_payment
  order by s.starts_at desc limit 200
$$;
revoke all on function public.my_free_bookings() from public,anon,authenticated;
grant execute on function public.my_free_bookings() to authenticated;

-- Deliberately returns only public slot metadata and aggregate availability.
-- It never returns a booking ID, attendee ID, customer email or exact actor.
create function public.public_free_booking_slots()
returns table(
  id uuid, offering_id uuid, starts_at timestamptz, ends_at timestamptz,
  time_zone text, capacity integer, max_seats_per_booking integer,
  remaining_seats integer
) language sql stable security definer set search_path='' as $$
  select s.id,s.offering_id,s.starts_at,s.ends_at,s.time_zone,
         s.capacity,s.max_seats_per_booking,
         greatest(0,s.capacity - coalesce((
           select sum(b.seats)::integer from public.bookings b
           where b.slot_id=s.id and
             (b.status='confirmed' or
                (b.status='held' and b.expires_at>now()))
         ),0))::integer as remaining_seats
  from public.booking_slots s
  join public.offerings o on o.id=s.offering_id
  where s.available and s.starts_at>now() and s.requires_payment=false
    and o.published and o.accepting_bookings
    and o.price_minor=0 and o.kind<>'informational'
    and (o.kind<>'appointment' or s.resource_id is not null)
    and (s.resource_id is null or (
      exists (select 1 from public.booking_resources r
        where r.id=s.resource_id and r.active)
      and not exists (
        select 1 from public.bookings b
        join public.booking_slots other on other.id=b.slot_id
        where other.resource_id=s.resource_id and other.id<>s.id
          and other.starts_at<s.ends_at and other.ends_at>s.starts_at
          and (b.status='confirmed' or
            (b.status='held' and b.expires_at>now()))
      )
    ))
    and s.capacity>coalesce((
      select sum(b.seats)::integer from public.bookings b
      where b.slot_id=s.id and
        (b.status='confirmed' or
           (b.status='held' and b.expires_at>now()))
    ),0)
  order by s.starts_at asc limit 1000
$$;
revoke all on function public.public_free_booking_slots()
  from public,anon,authenticated;
grant execute on function public.public_free_booking_slots()
  to anon, authenticated;

-- Customer confirmations are NOT staff-created. Preserve staff audit semantics.
create or replace function private.log_booking_changes() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_action text;
begin
  if tg_op='INSERT' and new.status='confirmed' then
    v_action:='manual_created';
  elsif tg_op='UPDATE' and new.status='cancelled' and old.status<>'cancelled' then
    v_action:='cancelled';
  else return new;
  end if;
  if (select auth.uid()) is not null and
    exists(select 1 from public.staff_roles sr
      where sr.user_id=(select auth.uid()) and sr.role='admin'
        and (select auth.jwt()->>'aal')='aal2') then
    insert into public.booking_admin_audit(booking_id,action,actor_id)
      values(new.id,v_action,(select auth.uid()));
  end if;
  insert into public.outbox_jobs(dedupe_key,kind,booking_id) values(
    case when v_action='cancelled' then 'booking_cancelled:' else 'booking_confirmed:' end||new.id::text,
    case when v_action='cancelled' then 'booking_cancelled' else 'booking_confirmed' end,
    new.id
  ) on conflict(dedupe_key) do nothing;
  return new;
end; $$;
revoke all on function private.log_booking_changes() from public,anon,authenticated;
