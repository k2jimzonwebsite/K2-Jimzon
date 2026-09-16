-- MAP-023 / MAP-028 I-001 (IDEA-20260908-01) - deduct owned stock once at
-- first confirmation while preserving physical custody.
--
-- OWNER-002 records the rule plainly: purchase reserves exact lots for
-- 30 minutes; first confirmation or verified payment deducts owned stock
-- once. The applied chain stops at reservation: confirming a purchase-held
-- order is a deliberate no-op for stock, so nothing ever records the sale.
-- `supabase/tests/order_stock_commitment.sql` proves the gap against the
-- real confirmation function and fails until this migration applies.
--
-- Representation, reviewed and accepted before implementation:
-- physical `quantity` / `on_hand` and encumbered `reserved_quantity` stay
-- unchanged at commitment. Commitment actor/time/cause persist on the exact
-- active allocations. Owned stock derives as physical minus active committed
-- units, so no second writable balance is introduced and recount cannot
-- resurrect sold ownership. At handover, physical and encumbered counters
-- decrease together and ownership does not decrease again. Cancellation
-- releases the allocation while retaining its commitment evidence. Committed
-- rows are exempt from the temporary-hold sweep. Historical confirmed or
-- verified allocations without commitment evidence stay unresolved: no
-- timestamp is invented and no retrospective sale event is written.
--
-- Additive and replayable. No column is dropped, no constraint is loosened,
-- no existing row changes meaning. The payment-verification caller and the
-- handover coverage gate stay open in I-001; this change wires confirmation
-- only and never invents a payment fact.
--
-- Depends on 20260902_reservation_expiry_policy.sql (expires_at) and
-- 20260902_purchase_time_reservation.sql (shared hold + confirm shape).
-- Prepared only; provider application stays under the MAP-017 order.

begin;

-- ---------------------------------------------------------------------------
-- Preflight. Refuse rather than half-apply.
-- ---------------------------------------------------------------------------

do $preflight$
begin
  if to_regclass('public.inventory_reservations') is null
     or to_regclass('public.order_requests') is null
     or to_regclass('public.inventory_events') is null then
    raise exception 'MAP-023 stock commitment: required inventory tables are missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_reservations'
      and column_name = 'expires_at'
  ) then
    raise exception
      'MAP-023 stock commitment: apply the reservation hold chain first; inventory_reservations.expires_at is missing';
  end if;

  if to_regprocedure('public.confirm_order_request(uuid,text)') is null
     or to_regprocedure('public.reserve_order_request_lots_v1(uuid,text)') is null then
    raise exception 'MAP-023 stock commitment: the order functions this migration extends are missing';
  end if;
end
$preflight$;

-- ---------------------------------------------------------------------------
-- Commitment evidence lives on the exact active allocations.
-- ---------------------------------------------------------------------------

alter table public.inventory_reservations
  add column if not exists committed_at timestamptz,
  add column if not exists committed_by uuid,
  add column if not exists commit_reason text,
  add column if not exists commit_cause text;

-- ---------------------------------------------------------------------------
-- One definition of deducting owned stock. Idempotent: allocations that
-- already carry commitment evidence are returned untouched, so a retried
-- confirmation, a later payment verification, and a replayed command can
-- never deduct the same units twice.
-- ---------------------------------------------------------------------------

create or replace function public.commit_order_request_stock_v1(
  p_order_request_id uuid,
  p_cause text,
  p_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res record;
  v_committed integer := 0;
begin
  if p_cause is null
     or p_cause not in ('confirmation', 'payment_verification') then
    raise exception 'Unknown stock commitment cause';
  end if;

  -- The order row is locked first, matching cancellation and the sweep, so
  -- a concurrent cancel serializes here instead of racing the allocations.
  perform 1 from public.order_requests where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;

  for v_res in
    select id, sku, quantity, batch_id
    from public.inventory_reservations
    where order_request_id = p_order_request_id
      and status = 'active'
      and committed_at is null
    order by sku, batch_id, id
    for update
  loop
    update public.inventory_reservations
    set committed_at = clock_timestamp(),
        committed_by = auth.uid(),
        commit_reason = nullif(trim(coalesce(p_reason, '')), ''),
        commit_cause = p_cause
    where id = v_res.id;

    -- Physical quantity and encumbered counters are intentionally untouched:
    -- this event deducts ownership, not custody. Handover moves custody.
    insert into public.inventory_events
      (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id)
    values
      (v_res.sku, 'MANILA_MAIN', 'stock_committed', v_res.quantity,
       'order_request', p_order_request_id,
       'Ownership committed at ' || p_cause || ': '
         || coalesce(nullif(trim(coalesce(p_reason, '')), ''), '(no reason)')
         || '; batch ' || v_res.batch_id::text,
       auth.uid());

    v_committed := v_committed + 1;
  end loop;

  return v_committed;
end;
$$;

comment on function public.commit_order_request_stock_v1(uuid,text,text) is
  'MAP-023: records owned-stock deduction once on the exact active allocations. Idempotent - committed rows are returned untouched. Called at confirmation; payment verification is a separate later caller.';

-- Internal helper: only SECURITY DEFINER order/payment functions call it.
-- No browser role executes it directly.
revoke all on function public.commit_order_request_stock_v1(uuid,text,text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Confirmation reuses the hold, then deducts owned stock exactly once.
-- ---------------------------------------------------------------------------
-- Only the commitment call is new. Every other statement keeps the hold
-- migration behavior so the diff a reviewer must trust stays small.

create or replace function public.confirm_order_request(
  p_order_request_id uuid,
  p_reason text default null
)
returns public.order_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.order_requests;
  v_line public.order_request_items;
  v_coupon public.coupons;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select * into v_order from public.order_requests where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;
  if v_order.status = 'confirmed' then return v_order; end if;
  if v_order.status <> 'submitted' then raise exception 'Only submitted requests can be confirmed'; end if;

  if v_order.coupon_id is not null then
    select * into v_coupon from public.coupons where id = v_order.coupon_id for update;
    if not found or not v_coupon.is_active or v_coupon.archived_at is not null
       or v_coupon.starts_at > now() or (v_coupon.ends_at is not null and v_coupon.ends_at <= now())
       or (v_coupon.max_redemptions is not null and v_coupon.redemption_count >= v_coupon.max_redemptions) then
      raise exception 'The coupon is no longer available';
    end if;
    update public.coupons set redemption_count = redemption_count + 1 where id = v_coupon.id;
    insert into public.coupon_redemptions (coupon_id, order_request_id, discount_amount)
    values (v_coupon.id, v_order.id, v_order.discount_amount);
  end if;

  perform public.reserve_order_request_lots_v1(v_order.id, p_reason);

  for v_line in select * from public.order_request_items where order_request_id = v_order.id order by created_at
  loop
    insert into public.orders (
      sku, quantity, channel_source, fulfillment_method, order_status,
      payment_status, customer_name, customer_email, total_amount, order_request_id
    ) values (
      v_line.sku, v_line.quantity,
      case v_order.channel_source
        when 'shopee' then 'shopee'::channel_type
        when 'lazada' then 'lazada'::channel_type
        when 'tiktok' then 'tiktok'::channel_type
        else 'website_retail'::channel_type end,
      v_order.fulfillment_method, 'Pending'::order_status_enum, 'Unpaid'::payment_status_enum,
      v_order.customer_name, v_order.customer_email, v_line.line_total, v_order.id
    );
  end loop;

  update public.order_requests
  set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now(),
      delivery_status = case when shipping_quote_status in ('platform_charged', 'customer_confirmed', 'waived') then 'ready_to_pack' else delivery_status end,
      updated_at = now()
  where id = v_order.id returning * into v_order;

  -- Owned stock leaves the sellable pool here, once. The early return above
  -- keeps a replayed confirmation from deducting again, and the helper
  -- itself skips already-committed allocations, so both guards agree.
  perform public.commit_order_request_stock_v1(v_order.id, 'confirmation', p_reason);

  insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id)
  values (v_order.id, 'submitted', 'confirmed', p_reason, auth.uid());
  return v_order;
end;
$$;

-- No grant is restated here, deliberately. `create or replace function` keeps
-- the existing ACL, matching the hold migration convention.

-- ---------------------------------------------------------------------------
-- The temporary-hold sweep never touches committed allocations.
-- ---------------------------------------------------------------------------
-- Committed rows are owned stock with a 30-minute purchase shell around
-- them, not temporary holds. The exemption is order-atomic like the rest of
-- the sweep: an order holding any committed row is left entirely alone.

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
        and r.status='active' and (r.packed_quantity>0 or r.expires_at is null or r.committed_at is not null))
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
        and r.status='active' and (r.packed_quantity>0 or r.expires_at is null or r.committed_at is not null));
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
