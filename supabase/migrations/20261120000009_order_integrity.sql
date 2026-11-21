-- Final checkout integrity: order kinds and purchased catalog references must agree.
-- These checks run for trusted server-side writes as well as migrations.
alter table public.orders add constraint booking_order_has_booking
  check ((kind = 'booking') = (booking_id is not null));
create unique index idx_booking_order_single_offering
  on public.order_items(order_id) where offering_id is not null;

create function private.validate_order_item_consistency()
returns trigger
language plpgsql security invoker set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_booked_offering uuid;
begin
  select * into v_order from public.orders where id = new.order_id;
  if not found then
    raise exception 'Order does not exist';
  end if;
  if v_order.kind = 'product' then
    if new.product_id is null then raise exception 'Product order requires a product line'; end if;
  elsif v_order.kind = 'donation' then
    if new.campaign_id is null then raise exception 'Donation order requires a campaign line'; end if;
  elsif v_order.kind = 'membership' then
    if new.membership_plan_id is null then raise exception 'Membership order requires a membership line'; end if;
  elsif v_order.kind = 'booking' then
    if new.offering_id is null then
      raise exception 'Booking order requires a bookable offering line';
    end if;
    select offering_id into v_booked_offering from public.bookings
      where id = v_order.booking_id;
    if v_booked_offering is null or v_booked_offering <> new.offering_id then
      raise exception 'Booking order offering does not match reserved offering';
    end if;
  else
    raise exception 'Unsupported order kind';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_order_item_consistency() from public,anon,authenticated;
create trigger validate_order_item_catalog
  before insert or update of order_id,product_id,campaign_id,membership_plan_id,offering_id
  on public.order_items for each row execute function private.validate_order_item_consistency();
