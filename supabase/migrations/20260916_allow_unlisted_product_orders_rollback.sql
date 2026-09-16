-- ===========================================================================
-- Rollback for: 20260916_allow_unlisted_product_orders.sql
-- Restores submit_order_request_v2 to accept only ('Live', 'Active') products.
-- ===========================================================================

begin;

-- Preflight: submit_order_request_v2 must exist
do $$
begin
  if to_regprocedure('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text)') is null then
    raise exception 'PREFLIGHT_FAILED: public.submit_order_request_v2 must exist before applying rollback';
  end if;
end $$;

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
    if v_product.product_status not in ('Live', 'Active') then
      raise exception 'Product % is not available for website orders', v_product.sku;
    end if;

    insert into public.order_request_items (order_request_id, sku, product_name, quantity, unit_price, line_total)
    values (v_order.id, v_product.sku, v_product.product_name, v_qty, v_product.unit_price, v_product.unit_price * v_qty);
    v_subtotal := v_subtotal + (v_product.unit_price * v_qty);
  end loop;

  -- The purchase-time hold claims FEFO lot stock immediately when available.
  if to_regprocedure('public.reserve_order_request_lots_v1(uuid,text)') is not null then
    perform public.reserve_order_request_lots_v1(v_order.id, 'purchase');
  end if;

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

-- Postflight: verify function exists
do $$
begin
  if to_regprocedure('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text)') is null then
    raise exception 'POSTFLIGHT_FAILED: public.submit_order_request_v2 was not found after rollback';
  end if;
end $$;

commit;
