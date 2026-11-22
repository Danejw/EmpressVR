-- Staff booking administration. No public booking submission is enabled by this migration.
-- Existing service-only reservation and payment workflows remain unchanged.
-- ASVS 2.1.2 / 2.2.2: admin + MFA authorization at the database boundary.
-- ASVS 2.3.3 / 2.3.4: serialized capacity checks and state transitions.

alter table public.offerings enable row level security;
alter table public.booking_slots enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_contacts enable row level security;

create policy "mfa admins read all offerings" on public.offerings
 for select to authenticated using (
   (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 );
create policy "mfa admins create offerings" on public.offerings
 for insert to authenticated with check (
   accepting_bookings=false
   and (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 );
create policy "mfa admins edit offerings" on public.offerings
 for update to authenticated using (
   (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 ) with check (
   (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 );
grant insert (id,slug,title,description,kind,published,accepting_bookings,price_minor,currency,updated_at)
 on public.offerings to authenticated;
grant update (title,description,kind,published,price_minor,currency,updated_at)
 on public.offerings to authenticated;

create policy "mfa admins read all sessions" on public.booking_slots
 for select to authenticated using (
   (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 );
create policy "mfa admins create sessions" on public.booking_slots
 for insert to authenticated with check (
   (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 );
create policy "mfa admins edit sessions" on public.booking_slots
 for update to authenticated using (
   (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 ) with check (
   (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 );
grant insert (id,offering_id,starts_at,ends_at,time_zone,capacity,max_seats_per_booking,
 available,requires_payment,updated_at) on public.booking_slots to authenticated;
grant update (starts_at,ends_at,time_zone,capacity,max_seats_per_booking,available,
 requires_payment,updated_at) on public.booking_slots to authenticated;

-- Any reservation with seats locks its session's time, price model and capacity.
-- Admins may still close the availability of an occupied session.
create function private.guard_session_changes() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_occupied bigint;
begin
 if current_user <> 'authenticated' then return new; end if;
 if new.offering_id <> old.offering_id then
   raise exception 'Cannot change a session offering';
 end if;
 select coalesce(sum(seats),0) into v_occupied
   from public.bookings b
   where b.slot_id=old.id
   and (b.status='confirmed' or (b.status='held' and b.expires_at>clock_timestamp()));
 if v_occupied>0 and (
   new.starts_at is distinct from old.starts_at or
   new.ends_at is distinct from old.ends_at or
   new.time_zone is distinct from old.time_zone or
   new.capacity is distinct from old.capacity or
   new.max_seats_per_booking is distinct from old.max_seats_per_booking or
   new.requires_payment is distinct from old.requires_payment
 ) then raise exception 'Cannot change a session that already has reservations';
 end if;
 return new;
end; $$;
revoke all on function private.guard_session_changes() from public,anon,authenticated;
create trigger booking_admin_guard_session before update on public.booking_slots
 for each row execute function private.guard_session_changes();

create policy "mfa admins read reservations" on public.bookings
 for select to authenticated using (
   (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 );
create policy "mfa admins create free reservations" on public.bookings
 for insert to authenticated with check (
   status='confirmed' and requires_payment=false and payment_order_id is null
   and customer_id is null
   and (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 );
create policy "mfa admins cancel free reservations" on public.bookings
 for update to authenticated using (
   status in ('held','confirmed') and requires_payment=false and payment_order_id is null
   and (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 ) with check (
   status='cancelled' and requires_payment=false and payment_order_id is null
   and (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 );
grant select on public.bookings to authenticated;
grant insert (id,offering_id,slot_id,attendee_ref,seats,status,idempotency_key,
 requires_payment,expires_at,confirmed_at) on public.bookings to authenticated;
grant update (status,cancelled_at) on public.bookings to authenticated;

create policy "mfa admins read attendee contacts" on public.booking_contacts
 for select to authenticated using (
   (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 );
create policy "mfa admins create attendee contacts" on public.booking_contacts
 for insert to authenticated with check (
   (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 );
grant select on public.booking_contacts to authenticated;
grant insert (booking_id,email,display_name) on public.booking_contacts to authenticated;

-- Prevent bypassing capacity rules through direct REST inserts.
-- This runs as the invoker, and locks the slot row like private.reserve_booking_hold.
create function private.guard_free_booking_mutations() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_slot public.booking_slots%rowtype; v_occupied bigint; v_price bigint; v_kind text;
begin
 if current_user <> 'authenticated' then return new; end if;
 if tg_op='UPDATE' then
   if old.status not in ('held','confirmed') or old.requires_payment
     or old.payment_order_id is not null or new.status<>'cancelled'
     or new.cancelled_at is null then
     raise exception 'Only unpaid active bookings may be cancelled';
   end if;
   return new;
 end if;

 if new.status<>'confirmed' or new.requires_payment
   or new.payment_order_id is not null or new.customer_id is not null
   or new.confirmed_at is null then
   raise exception 'Only manually confirmed free bookings are permitted';
 end if;
 select * into v_slot from public.booking_slots
   where id=new.slot_id for update;
 if not found or v_slot.offering_id<>new.offering_id or not v_slot.available
   or v_slot.requires_payment or v_slot.starts_at<=clock_timestamp()
   or new.seats<1 or new.seats>v_slot.max_seats_per_booking then
   raise exception 'Session is unavailable for a free booking';
 end if;
 select price_minor,kind into v_price,v_kind from public.offerings where id=new.offering_id;
 if v_price is null or v_price<>0 or v_kind='informational' then
   raise exception 'Offering is not a free reservable class or appointment';
 end if;
 select coalesce(sum(seats),0) into v_occupied
   from public.bookings b where b.slot_id=v_slot.id and
   (b.status='confirmed' or (b.status='held' and b.expires_at>clock_timestamp()));
 if v_occupied + new.seats > v_slot.capacity then
   raise exception 'Booking capacity exceeded';
 end if;
 return new;
end; $$;
revoke all on function private.guard_free_booking_mutations() from public,anon,authenticated;
create trigger booking_admin_guard_insert before insert on public.bookings
 for each row execute function private.guard_free_booking_mutations();
create trigger booking_admin_guard_cancel before update on public.bookings
 for each row execute function private.guard_free_booking_mutations();

-- Staff-facing audit history is append-only and created by trusted triggers.
create table public.booking_admin_audit (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete restrict,
 action text not null check (action in ('manual_created','cancelled')),
 actor_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.booking_admin_audit enable row level security;
revoke all on public.booking_admin_audit from anon,authenticated;
grant select on public.booking_admin_audit to authenticated;
create policy "mfa admins see booking audit" on public.booking_admin_audit
 for select to authenticated using (
   (select auth.jwt()->>'aal')='aal2'
   and exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin')
 );

create function private.log_booking_changes() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_action text;
begin
 if tg_op='INSERT' and new.status='confirmed' then
   v_action:='manual_created';
 elsif tg_op='UPDATE' and new.status='cancelled' and old.status<>'cancelled' then
   v_action:='cancelled';
 else return new;
 end if;
 if (select auth.uid()) is not null then
   insert into public.booking_admin_audit(booking_id,action,actor_id)
     values(new.id,v_action,(select auth.uid()));
 end if;
 insert into public.outbox_jobs(dedupe_key,kind,booking_id) values (
   case when v_action='cancelled' then 'booking_cancelled:' else 'booking_confirmed:' end || new.id::text,
   case when v_action='cancelled' then 'booking_cancelled' else 'booking_confirmed' end,
   new.id
 ) on conflict(dedupe_key) do nothing;
 return new;
end; $$;
revoke all on function private.log_booking_changes() from public,anon,authenticated;
create trigger booking_admin_log_insert after insert on public.bookings
 for each row execute function private.log_booking_changes();
create trigger booking_admin_log_cancel after update of status on public.bookings
 for each row execute function private.log_booking_changes();

-- SECURITY INVOKER: signed-in accounts never execute owner-privileged RPCs.
-- Admin/MFA gates are repeated here, and all underlying rows remain RLS protected.
create function public.admin_reserve_free_booking(
 p_slot_id uuid,p_attendee_name text,p_attendee_email text,p_seats integer,p_idempotency_key text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_slot public.booking_slots%rowtype;
        v_existing public.bookings%rowtype;
        v_existing_contact public.booking_contacts%rowtype;
        v_booking_id uuid;
        v_occupied bigint;
        v_price bigint;
begin
 if (select auth.jwt()->>'aal') is distinct from 'aal2'
   or not exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin') then
   raise exception 'Administrator and MFA required';
 end if;
 if p_attendee_name is null or length(trim(p_attendee_name)) not between 1 and 200
   or p_attendee_email is null or length(p_attendee_email) not between 3 and 254
   or p_attendee_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
   or p_seats is null or p_seats<1 or p_seats>10000
   or p_idempotency_key is null or length(p_idempotency_key) not between 16 and 128
   or p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9_-]*$' then
   raise exception 'Invalid reservation details';
 end if;
 select * into v_existing from public.bookings where idempotency_key=p_idempotency_key;
 if found then
   select * into v_existing_contact from public.booking_contacts
     where booking_id=v_existing.id;
   if v_existing.slot_id=p_slot_id and v_existing.seats=p_seats
     and v_existing_contact.email=lower(trim(p_attendee_email))
     and v_existing_contact.display_name=trim(p_attendee_name) then
     return v_existing.id;
   end if;
   raise exception 'Idempotency key reused with another reservation';
 end if;
 select * into v_slot from public.booking_slots where id=p_slot_id for update;
 if not found or not v_slot.available or v_slot.starts_at<=clock_timestamp()
   or v_slot.requires_payment or p_seats>v_slot.max_seats_per_booking then
   raise exception 'Free session unavailable';
 end if;
 select price_minor into v_price from public.offerings
   where id=v_slot.offering_id and kind<>'informational';
 if not found or v_price<>0 then raise exception 'Paid or unsupported offering'; end if;
 select coalesce(sum(seats),0) into v_occupied from public.bookings
   where slot_id=v_slot.id and
   (status='confirmed' or (status='held' and expires_at>clock_timestamp()));
 if v_occupied + p_seats > v_slot.capacity then
   raise exception 'No remaining capacity';
 end if;
 insert into public.bookings(
   offering_id,slot_id,attendee_ref,seats,status,idempotency_key,
   requires_payment,expires_at,confirmed_at
 ) values (
   v_slot.offering_id,v_slot.id,'manual_'||replace(gen_random_uuid()::text,'-',''),
   p_seats,'confirmed',p_idempotency_key,false,v_slot.starts_at,clock_timestamp()
 ) returning id into v_booking_id;
 insert into public.booking_contacts(booking_id,email,display_name)
   values(v_booking_id,lower(trim(p_attendee_email)),trim(p_attendee_name));
 return v_booking_id;
end; $$;
revoke all on function public.admin_reserve_free_booking(uuid,text,text,integer,text)
 from public,anon,authenticated;
grant execute on function public.admin_reserve_free_booking(uuid,text,text,integer,text)
 to authenticated;

create function public.admin_cancel_free_booking(p_booking_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare v_booking public.bookings%rowtype;
begin
 if (select auth.jwt()->>'aal') is distinct from 'aal2'
   or not exists(select 1 from public.staff_roles sr
     where sr.user_id=(select auth.uid()) and sr.role='admin') then
   raise exception 'Administrator and MFA required';
 end if;
 select * into v_booking from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'Reservation not found'; end if;
 if v_booking.status='cancelled' then return true; end if;
 if v_booking.status not in ('held','confirmed') or v_booking.requires_payment
   or v_booking.payment_order_id is not null then
   raise exception 'Only active unpaid reservations can be cancelled';
 end if;
 update public.bookings set status='cancelled',cancelled_at=clock_timestamp()
   where id=p_booking_id;
 return true;
end; $$;
revoke all on function public.admin_cancel_free_booking(uuid) from public,anon,authenticated;
grant execute on function public.admin_cancel_free_booking(uuid) to authenticated;
