-- MAP-023 H-022: release purchase-time holds when cancelling either eligible state.
-- Prepared only. Existing release-cause history and full lifecycle gates remain.
begin;
do $$ begin
  if to_regprocedure('public.cancel_order_request(uuid,text)') is null
     or not exists(select 1 from information_schema.columns where table_schema='public'
       and table_name='inventory_reservations' and column_name='release_cause') then
    raise exception 'K2_CANCELLATION_DEPENDENCY_MISSING';
  end if;
end $$;

create or replace function public.cancel_order_request(
  p_order_request_id uuid,
  p_reason text
)
returns public.order_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.order_requests;
  v_res public.inventory_reservations;
  v_summary record;

begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then raise exception 'Cancellation reason is required'; end if;
  select * into v_order from public.order_requests where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;
  if v_order.status = 'cancelled' then return v_order; end if;
  if v_order.status not in ('submitted', 'confirmed') then raise exception 'This order request cannot be cancelled'; end if;

  -- Submitted purchases hold stock too. Summarize only currently active lots,
  -- then acquire balance before batch locks in SKU order, as reservation does.
  for v_summary in select sku, sum(quantity)::integer quantity
    from public.inventory_reservations
    where order_request_id = v_order.id and status = 'active'
    group by sku order by sku
  loop
    update public.inventory_balances set reserved = reserved - v_summary.quantity, updated_at = now()
    where sku = v_summary.sku and location_code = 'MANILA_MAIN' and reserved >= v_summary.quantity;
    if not found then raise exception 'Inventory reservation mismatch for %', v_summary.sku; end if;

    for v_res in select * from public.inventory_reservations
      where order_request_id = v_order.id and status = 'active' and sku = v_summary.sku
      order by batch_id, id for update
    loop
      update public.product_batches set reserved_quantity = reserved_quantity - v_res.quantity, updated_at = now()
      where id = v_res.batch_id and reserved_quantity >= v_res.quantity;
      if not found then raise exception 'Lot reservation mismatch for %', v_res.sku; end if;
      update public.inventory_reservations
      set status = 'released', released_at = now(), release_cause = 'cancelled', updated_at = now()
      where id = v_res.id;
    end loop;

    perform set_config('k2.allow_stock_write', 'on', true);
    update public.products set stock_available = (
      select coalesce(sum(b.quantity - b.reserved_quantity), 0)::integer from public.product_batches b
      where b.sku = v_summary.sku and b.inventory_status = 'available'
        and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
          or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))
    ) where sku = v_summary.sku;
    insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id)
    values (v_summary.sku, 'MANILA_MAIN', 'reservation_released', v_summary.quantity, 'order_request', v_order.id, p_reason, auth.uid());
  end loop;

  update public.orders set order_status = 'Cancelled'::order_status_enum
  where order_request_id = v_order.id and order_status::text <> 'Shipped';

  if v_order.coupon_id is not null then
    update public.coupon_redemptions set status = 'released', updated_at = now()
    where order_request_id = v_order.id and status = 'reserved';
    if found then update public.coupons set redemption_count = greatest(redemption_count - 1, 0) where id = v_order.coupon_id; end if;
  end if;
  update public.order_requests
  set status = 'cancelled', delivery_status = 'cancelled', exception_status = 'resolved',
      exception_note = trim(p_reason), cancelled_at = now(), updated_at = now()
  where id = v_order.id returning * into v_order;
  insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id)
  values (v_order.id, case when v_order.confirmed_at is null then 'submitted' else 'confirmed' end, 'cancelled', p_reason, auth.uid());
  return v_order;
end;
$$;

-- Preserve the existing function ACL; do not reopen direct RPC permissions.
notify pgrst, 'reload schema';
commit;
