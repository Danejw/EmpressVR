-- Server-only adapters must verify Stripe signatures and request authorization
-- before invoking these private SECURITY INVOKER functions.
alter table public.outbox_jobs drop constraint outbox_jobs_kind_check;
alter table public.outbox_jobs add constraint outbox_jobs_kind_check
  check (kind in ('order_paid','order_refunded','booking_confirmed','booking_cancelled'));

create function private.apply_verified_payment(
  p_event_id text, p_order_id uuid, p_provider_session_id text,
  p_kind text, p_amount_minor bigint, p_currency text
) returns public.orders language plpgsql security invoker set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_event public.payment_events%rowtype;
  v_next_status text;
begin
  if p_event_id is null or length(p_event_id) not between 1 and 255 or
     p_order_id is null or p_provider_session_id is null or
     p_kind is null or p_kind not in ('paid','failed','full_refund') then
    raise exception 'Invalid verified payment outcome';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.provider_session_id is null or
     v_order.provider_session_id <> p_provider_session_id or
     v_order.amount_minor <> p_amount_minor or
     v_order.currency <> p_currency then
    raise exception 'Verified payment does not match order';
  end if;

  select * into v_event from public.payment_events where event_id = p_event_id;
  if found then
    if v_event.order_id <> p_order_id or v_event.provider_session_id <> p_provider_session_id or
       v_event.kind <> p_kind or v_event.amount_minor <> p_amount_minor or
       v_event.currency <> p_currency then
      raise exception 'Provider event ID reused with different data';
    end if;
    return v_order;
  end if;

  v_next_status := v_order.status;
  if p_kind = 'paid' then
    if v_order.status = 'awaiting_payment' then
      v_next_status := 'paid';
    elsif v_order.status not in ('paid','refunded') then
      raise exception 'Invalid transition to paid';
    end if;
  elsif p_kind = 'failed' then
    if v_order.status = 'awaiting_payment' then v_next_status := 'failed'; end if;
  elsif p_kind = 'full_refund' then
    if v_order.status = 'paid' then
      v_next_status := 'refunded';
    elsif v_order.status <> 'refunded' then
      raise exception 'Cannot refund an unpaid order';
    end if;
  end if;

  insert into public.payment_events (
    event_id, order_id, provider_session_id, kind, amount_minor, currency
  ) values (
    p_event_id, p_order_id, p_provider_session_id, p_kind, p_amount_minor, p_currency
  );
  if v_next_status <> v_order.status then
    update public.orders set status = v_next_status, updated_at = now()
      where id = p_order_id returning * into v_order;
    if v_next_status = 'paid' then
      insert into public.outbox_jobs(dedupe_key,kind,order_id)
        values ('order_paid:' || p_order_id::text,'order_paid',p_order_id)
        on conflict (dedupe_key) do nothing;
    elsif v_next_status = 'refunded' then
      insert into public.outbox_jobs(dedupe_key,kind,order_id)
        values ('order_refunded:' || p_order_id::text,'order_refunded',p_order_id)
        on conflict (dedupe_key) do nothing;
    end if;
  end if;
  return v_order;
end;
$$;
revoke all on function private.apply_verified_payment(text,uuid,text,text,bigint,text)
  from public,anon,authenticated;
grant execute on function private.apply_verified_payment(text,uuid,text,text,bigint,text)
  to service_role;

create function private.confirm_booking(
  p_booking_id uuid, p_trusted_paid_order_id uuid default null
) returns public.bookings language plpgsql security invoker set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_paid boolean;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status = 'confirmed' then return v_booking; end if;
  if v_booking.status <> 'held' or v_booking.expires_at <= clock_timestamp() then
    raise exception 'Booking hold is not confirmable';
  end if;
  if v_booking.requires_payment then
    if v_booking.payment_order_id is null or
       v_booking.payment_order_id is distinct from p_trusted_paid_order_id then
      raise exception 'Matching paid order required';
    end if;
    select exists(
      select 1 from public.orders
      where id = p_trusted_paid_order_id and booking_id = p_booking_id and status = 'paid'
    ) into v_paid;
    if not v_paid then raise exception 'Matching paid order is unsettled'; end if;
  end if;
  update public.bookings set status = 'confirmed', confirmed_at = clock_timestamp()
    where id = p_booking_id returning * into v_booking;
  insert into public.outbox_jobs(dedupe_key,kind,booking_id)
    values ('booking_confirmed:' || p_booking_id::text,'booking_confirmed',p_booking_id)
    on conflict (dedupe_key) do nothing;
  return v_booking;
end;
$$;
revoke all on function private.confirm_booking(uuid,uuid) from public,anon,authenticated;
grant execute on function private.confirm_booking(uuid,uuid) to service_role;

create function private.cancel_booking(p_booking_id uuid)
returns public.bookings language plpgsql security invoker set search_path = ''
as $$
declare v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status = 'cancelled' then return v_booking; end if;
  if v_booking.status not in ('held','confirmed') then
    raise exception 'Booking cannot be cancelled';
  end if;
  update public.bookings set status = 'cancelled',cancelled_at = clock_timestamp()
    where id = p_booking_id returning * into v_booking;
  insert into public.outbox_jobs(dedupe_key,kind,booking_id)
    values ('booking_cancelled:' || p_booking_id::text,'booking_cancelled',p_booking_id)
    on conflict (dedupe_key) do nothing;
  return v_booking;
end;
$$;
revoke all on function private.cancel_booking(uuid) from public,anon,authenticated;
grant execute on function private.cancel_booking(uuid) to service_role;

create function private.expire_booking_holds(p_slot_id uuid default null)
returns integer language plpgsql security invoker set search_path = ''
as $$
declare v_expired integer;
begin
  with expired as (
    update public.bookings set status = 'expired'
    where status = 'held' and expires_at <= clock_timestamp()
      and (p_slot_id is null or slot_id = p_slot_id)
    returning id
  )
  select count(*) into v_expired from expired;
  return v_expired;
end;
$$;
revoke all on function private.expire_booking_holds(uuid) from public,anon,authenticated;
grant execute on function private.expire_booking_holds(uuid) to service_role;
