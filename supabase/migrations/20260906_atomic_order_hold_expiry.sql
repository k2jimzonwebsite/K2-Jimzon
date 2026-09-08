-- MAP-023 H-019/H-021 containment. Prepared, not provider-applied.
-- Does not implement confirmation-time deduction or the entire lock-order gate.
begin;
create or replace function public.release_expired_reservations_v1(p_limit integer default 500)
returns table(released_count integer, released_ids uuid[])
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.order_requests;
  v_orders uuid[] := '{}';
  v_ids uuid[] := '{}';
  v_summary record;
  v_res public.inventory_reservations;
  v_count integer := 0;
begin
  if not public.is_staff() then raise exception 'STAFF_REQUIRED' using errcode='42501'; end if;
  if p_limit is null or p_limit<1 or p_limit>5000 then raise exception 'RELEASE_LIMIT_INVALID' using errcode='22023'; end if;
  -- The limit bounds complete orders, not arbitrary reservation fragments.
  -- Lock orders before their inventory so confirmation/cancellation serializes.
  for v_order in
    select o.* from public.order_requests o
    where o.status='submitted' and o.payment_status in ('unpaid','not_requested','awaiting_instructions','failed')
      and exists(select 1 from public.inventory_reservations r where r.order_request_id=o.id
        and r.status='active' and r.expires_at<=clock_timestamp())
      and not exists(select 1 from public.inventory_reservations r where r.order_request_id=o.id
        and r.status='active' and (r.packed_quantity>0 or r.expires_at is null))
    order by o.id limit p_limit for update of o skip locked
  loop
    v_orders := array_append(v_orders,v_order.id);
  end loop;
  -- Acquire all affected balances before reservation/batch updates. Common SKU
  -- order across this batch avoids reverse basket order within the sweep.
  perform 1 from public.inventory_balances b
    where b.location_code='MANILA_MAIN' and b.sku in (
      select r.sku from public.inventory_reservations r where r.order_request_id=any(v_orders) and r.status='active'
    ) order by b.sku for update;
  perform 1 from public.inventory_reservations r where r.order_request_id=any(v_orders) and r.status='active'
    order by r.sku,r.batch_id,r.id for update;
  -- An extension may have committed while the sweep waited for these rows.
  -- Decide again from the now-locked facts; the earlier selection is not proof.
  select coalesce(array_agg(o.id),'{}'::uuid[]) into v_orders from public.order_requests o
    where o.id=any(v_orders) and o.status='submitted'
      and o.payment_status in ('unpaid','not_requested','awaiting_instructions','failed')
      and exists(select 1 from public.inventory_reservations r where r.order_request_id=o.id
        and r.status='active' and r.expires_at<=clock_timestamp())
      and not exists(select 1 from public.inventory_reservations r where r.order_request_id=o.id
        and r.status='active' and (r.packed_quantity>0 or r.expires_at is null));
  perform 1 from public.product_batches b where b.id in (
    select batch_id from public.inventory_reservations where order_request_id=any(v_orders) and status='active'
  ) order by b.sku,b.id for update;

  for v_summary in select r.order_request_id,r.sku,sum(r.quantity)::integer quantity
    from public.inventory_reservations r where r.order_request_id=any(v_orders) and r.status='active'
    group by r.order_request_id,r.sku order by r.sku,r.order_request_id
  loop
    update public.inventory_balances set reserved=reserved-v_summary.quantity,updated_at=clock_timestamp()
      where sku=v_summary.sku and location_code='MANILA_MAIN' and reserved>=v_summary.quantity;
    if not found then raise exception 'K2_RESERVATION_BALANCE_MISMATCH' using errcode='23514'; end if;
    for v_res in select * from public.inventory_reservations
      where order_request_id=v_summary.order_request_id and sku=v_summary.sku and status='active'
      order by batch_id,id
    loop
      update public.product_batches set reserved_quantity=reserved_quantity-v_res.quantity,updated_at=clock_timestamp()
        where id=v_res.batch_id and sku=v_res.sku and reserved_quantity>=v_res.quantity;
      if not found then raise exception 'K2_RESERVATION_LOT_MISMATCH' using errcode='23514'; end if;
      update public.inventory_reservations set status='released',released_at=clock_timestamp(),
        release_cause='expired',updated_at=clock_timestamp() where id=v_res.id;
      v_ids:=array_append(v_ids,v_res.id); v_count:=v_count+1;
    end loop;
    perform set_config('k2.allow_stock_write','on',true);
    update public.products set stock_available=(
      select coalesce(sum(b.quantity-b.reserved_quantity),0)::integer from public.product_batches b
      where b.sku=v_summary.sku and b.inventory_status='available'
        and (coalesce(b.expiry_date,b.best_before_date)>=current_date+90
          or (coalesce(b.expiry_date,b.best_before_date) between current_date+31 and current_date+89
            and b.clearance_approved_at is not null))
    ) where sku=v_summary.sku;
    insert into public.inventory_events(sku,location_code,event_type,quantity,reference_type,reference_id,reason,actor_id)
      values(v_summary.sku,'MANILA_MAIN','reservation_released',v_summary.quantity,'order_request',
        v_summary.order_request_id,'Expired unpaid purchase hold; released the complete order allocation.',auth.uid());
  end loop;
  return query select v_count,v_ids;
end;
$$;
-- Preserve the previously installed ACL, including any coordinated BFF cutover.
notify pgrst,'reload schema';
commit;
