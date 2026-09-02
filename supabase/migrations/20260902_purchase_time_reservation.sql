-- MAP-023 / IDEA-20260902-04 — hold stock when the customer buys, not when
-- staff confirm.
--
-- OWNER-002 records the rule plainly: "Reservation — 30 minutes, starting when
-- the customer clicks purchase." The applied system does not do that. Stock is
-- claimed only inside `confirm_order_request`, whose sole caller is a staff
-- button, so between purchase and confirmation nothing is held. Two customers
-- can therefore submit an order for the same last unit and both receive a
-- success page; the second failure surfaces hours later, at staff confirm.
--
-- That is tolerable while a submission is only a request and no money moves. It
-- stops being tolerable the moment payment is taken at checkout, because the
-- second customer has already paid for a unit that was never theirs and K2 has
-- no gateway with which to automate the refund.
--
-- The reservation logic itself is not rewritten here. The exact FEFO selection,
-- row locking, balance arithmetic, and stock recomputation that
-- `confirm_order_request` has performed since 20260809 are extracted verbatim
-- into one function and then called from both places. Extracting rather than
-- duplicating is deliberate: two copies of the last-unit locking rule is how a
-- shop starts overselling in exactly the case this migration exists to prevent.
--
-- Additive and reversible. No column is dropped, no constraint is loosened, and
-- no existing row changes meaning. Rolling back means restoring the two prior
-- function bodies; the extracted function can be left in place harmlessly.
--
-- Depends on 20260902_reservation_expiry_policy.sql, which adds `hold_minutes`,
-- `expires_at`, and the BEFORE INSERT trigger that stamps the 30-minute
-- deadline on website reservations. Apply that first.

begin;

-- ---------------------------------------------------------------------------
-- Preflight. Refuse rather than half-apply.
-- ---------------------------------------------------------------------------

do $preflight$
begin
  if to_regclass('public.inventory_reservations') is null
     or to_regclass('public.order_request_items') is null
     or to_regclass('public.inventory_balances') is null
     or to_regclass('public.product_batches') is null then
    raise exception 'MAP-023 purchase-time reservation: required inventory tables are missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_reservations'
      and column_name = 'expires_at'
  ) then
    raise exception
      'MAP-023 purchase-time reservation: apply 20260902_reservation_expiry_policy.sql first; inventory_reservations.expires_at is missing';
  end if;

  if to_regprocedure('public.confirm_order_request(uuid,text)') is null
     or to_regprocedure('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text)') is null then
    raise exception 'MAP-023 purchase-time reservation: the order functions this migration replaces are missing';
  end if;
end
$preflight$;

-- ---------------------------------------------------------------------------
-- The shared hold. One definition of what claiming stock means.
-- ---------------------------------------------------------------------------

create or replace function public.reserve_order_request_lots_v1(
  p_order_request_id uuid,
  p_reason text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.order_requests;
  v_line public.order_request_items;
  v_batch public.product_batches;
  v_balance public.inventory_balances;
  v_remaining integer;
  v_take integer;
  v_held integer := 0;
  v_existing integer;
begin
  select * into v_order from public.order_requests where id = p_order_request_id for update;
  if not found then raise exception 'Order request not found'; end if;

  -- Idempotent by design. An order that already holds stock is returned
  -- untouched, so a retried submission, a staff confirmation following a
  -- purchase-time hold, and a replayed idempotency key can never stack a second
  -- claim on the same units.
  select count(*) into v_existing
  from public.inventory_reservations
  where order_request_id = v_order.id and status = 'active';
  if v_existing > 0 then return 0; end if;

  for v_line in
    select * from public.order_request_items
    where order_request_id = v_order.id order by created_at
  loop
    insert into public.inventory_balances (sku, location_code, on_hand)
    select p.sku, 'MANILA_MAIN', greatest(coalesce(sum(b.quantity), 0), 0)::integer
    from public.products p left join public.product_batches b on b.sku = p.sku
    where p.sku = v_line.sku group by p.sku
    on conflict (sku, location_code) do nothing;

    -- The balance row is locked before any batch row, in both callers, so two
    -- concurrent holds on one SKU serialize here rather than racing the lots.
    select * into v_balance from public.inventory_balances
    where sku = v_line.sku and location_code = 'MANILA_MAIN' for update;

    v_remaining := v_line.quantity;
    for v_batch in
      select * from public.product_batches
      where sku = v_line.sku
        and inventory_status = 'available'
        and quantity > reserved_quantity
        and (
          coalesce(expiry_date, best_before_date) >= current_date + 90
          or (
            coalesce(expiry_date, best_before_date) between current_date + 31 and current_date + 89
            and clearance_approved_at is not null
          )
        )
      order by coalesce(expiry_date, best_before_date), created_at
      for update
    loop
      exit when v_remaining = 0;
      v_take := least(v_remaining, v_batch.quantity - v_batch.reserved_quantity);
      update public.product_batches set reserved_quantity = reserved_quantity + v_take, updated_at = now()
      where id = v_batch.id;
      insert into public.inventory_reservations (
        order_request_id, order_request_item_id, batch_id, sku, quantity
      ) values (v_order.id, v_line.id, v_batch.id, v_line.sku, v_take);
      v_remaining := v_remaining - v_take;
    end loop;
    if v_remaining > 0 then
      raise exception 'Insufficient sellable lot stock for %. Check expiry, quarantine, and clearance approval.', v_line.sku
        using errcode = 'K2STK';
    end if;

    if v_balance.reserved + v_line.quantity > v_balance.on_hand then
      raise exception 'Inventory balance mismatch for %', v_line.sku using errcode = 'K2STK';
    end if;
    update public.inventory_balances set reserved = reserved + v_line.quantity, updated_at = now()
    where sku = v_line.sku and location_code = 'MANILA_MAIN';

    perform set_config('k2.allow_stock_write', 'on', true);
    update public.products set
      stock_available = (
        select coalesce(sum(b.quantity - b.reserved_quantity), 0)::integer from public.product_batches b
        where b.sku = v_line.sku and b.inventory_status = 'available'
          and (coalesce(b.expiry_date, b.best_before_date) >= current_date + 90
            or (coalesce(b.expiry_date, b.best_before_date) between current_date + 31 and current_date + 89 and b.clearance_approved_at is not null))
      )
    where sku = v_line.sku;

    insert into public.inventory_events (sku, location_code, event_type, quantity, reference_type, reference_id, reason, actor_id)
    values (v_line.sku, 'MANILA_MAIN', 'reserved', v_line.quantity, 'order_request', v_order.id, p_reason, auth.uid());

    v_held := v_held + 1;
  end loop;

  return v_held;
end;
$$;

comment on function public.reserve_order_request_lots_v1(uuid,text) is
  'MAP-023: claims FEFO lot stock for one order request. Idempotent — an order that already holds active reservations is returned untouched. Called at purchase by submit_order_request_v2 and again, as a no-op, by confirm_order_request.';

revoke all on function public.reserve_order_request_lots_v1(uuid,text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Purchase now takes the hold.
-- ---------------------------------------------------------------------------
-- Only the reservation call is new. Every other statement is unchanged from
-- 20260809 so the diff a reviewer must trust stays small.

create or replace function public.submit_order_request_v2(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address text,
  p_fulfillment_method text,
  p_customer_note text,
  p_items jsonb,
  p_idempotency_key text,
  p_coupon_code text default null
)
returns public.order_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.order_requests;
  v_item jsonb;
  v_product record;
  v_coupon public.coupons;
  v_qty integer;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
begin
  if nullif(trim(coalesce(p_customer_name, '')), '') is null then raise exception 'Customer name is required'; end if;
  if nullif(trim(coalesce(p_customer_email, '')), '') is null
     and nullif(trim(coalesce(p_customer_phone, '')), '') is null then
    raise exception 'Email or mobile number is required';
  end if;
  if nullif(trim(coalesce(p_delivery_address, '')), '') is null then raise exception 'Delivery address is required'; end if;
  if nullif(trim(coalesce(p_idempotency_key, '')), '') is null then raise exception 'Request key is required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one item is required'; end if;
  if jsonb_array_length(p_items) > 50 then raise exception 'A request may contain at most 50 items'; end if;

  select * into v_order from public.order_requests where idempotency_key = trim(p_idempotency_key);
  if found then return v_order; end if;

  insert into public.order_requests (
    customer_name, customer_email, customer_phone, delivery_address,
    fulfillment_method, customer_note, idempotency_key,
    shipping_amount, shipping_quote_status, delivery_status
  ) values (
    trim(p_customer_name), nullif(trim(p_customer_email), ''), nullif(trim(p_customer_phone), ''),
    trim(p_delivery_address), coalesce(nullif(trim(p_fulfillment_method), ''), 'Courier delivery'),
    nullif(trim(p_customer_note), ''), trim(p_idempotency_key),
    0, 'pending_quote', 'awaiting_quote'
  ) returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_qty := (v_item ->> 'quantity')::integer;
    exception when invalid_text_representation then
      raise exception 'Invalid item quantity';
    end;
    if v_qty < 1 or v_qty > 999 then raise exception 'Invalid item quantity'; end if;

    select sku, coalesce(nullif(name, ''), nullif(title, ''), sku) product_name,
           coalesce(srp, retail_price, 0) unit_price, status::text product_status
    into v_product from public.products where sku = v_item ->> 'sku';
    if not found then raise exception 'Product % was not found', v_item ->> 'sku'; end if;
    if v_product.product_status not in ('Live', 'Active') then raise exception 'Product % is not available for website orders', v_product.sku; end if;

    insert into public.order_request_items (order_request_id, sku, product_name, quantity, unit_price, line_total)
    values (v_order.id, v_product.sku, v_product.product_name, v_qty, v_product.unit_price, v_product.unit_price * v_qty);
    v_subtotal := v_subtotal + (v_product.unit_price * v_qty);
  end loop;

  -- The purchase-time hold. Raises K2STK when the units are already spoken for,
  -- which aborts the whole submission: an order that could not claim its stock
  -- must not exist at all, or staff inherit a request that can never be filled.
  perform public.reserve_order_request_lots_v1(v_order.id, 'purchase');

  if nullif(upper(trim(coalesce(p_coupon_code, ''))), '') is not null then
    select * into v_coupon from public.coupons
    where code = upper(trim(p_coupon_code))
      and is_active and archived_at is null
      and starts_at <= now() and (ends_at is null or ends_at > now())
      and (max_redemptions is null or redemption_count < max_redemptions);
    if not found then raise exception 'Coupon is invalid, inactive, expired, or fully redeemed'; end if;
    if v_subtotal < v_coupon.min_spend then raise exception 'Coupon minimum spend is not met'; end if;
    v_discount := case when v_coupon.discount_type = 'percentage'
      then round(v_subtotal * v_coupon.discount_value / 100, 2)
      else least(v_coupon.discount_value, v_subtotal) end;
  end if;

  update public.order_requests
  set subtotal = v_subtotal,
      coupon_id = case when v_coupon.id is null then null else v_coupon.id end,
      coupon_code = case when v_coupon.id is null then null else v_coupon.code end,
      discount_amount = v_discount,
      total_amount = v_subtotal - v_discount,
      updated_at = now()
  where id = v_order.id returning * into v_order;

  insert into public.order_request_events (order_request_id, to_status, metadata)
  values (v_order.id, 'submitted', jsonb_build_object(
    'channel', 'website', 'shipping', 'pending_quote',
    'coupon_code', v_order.coupon_code, 'discount_amount', v_order.discount_amount,
    'stock_held_at_purchase', true
  ));
  return v_order;
end;
$$;

-- No grant is restated here, deliberately. `create or replace function` keeps
-- the existing ACL, and 20260812_guest_submission_cutover.sql revoked anon
-- execute on this function on purpose: customers reach it only through
-- `submit_guest_order_v1`, which enforces the signature, bot challenge, rate
-- limits and idempotency key. Re-granting it to anon here would quietly reopen
-- an unsigned, unthrottled path straight to order submission.

-- ---------------------------------------------------------------------------
-- Confirmation reuses the same hold instead of taking a second one.
-- ---------------------------------------------------------------------------
-- The per-line reservation block is replaced by one call. Everything else —
-- staff gate, coupon redemption, the legacy `orders` rows, the status
-- transition and its event — is byte-for-byte the 20260809 behavior.
--
-- An order that already holds stock from purchase gets a no-op, so confirming
-- does not double-claim. An older order that predates this migration, or one
-- whose hold expired and was swept, still reserves here exactly as before, so
-- the confirm path keeps working for every row already in the table.

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
  insert into public.order_request_events (order_request_id, from_status, to_status, reason, actor_id)
  values (v_order.id, 'submitted', 'confirmed', p_reason, auth.uid());
  return v_order;
end;
$$;

commit;
