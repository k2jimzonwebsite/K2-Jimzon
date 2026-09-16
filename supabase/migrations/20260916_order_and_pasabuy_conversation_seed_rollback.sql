-- ===========================================================================
-- Rollback for MAP-019 Queue item 14 (20260916_order_and_pasabuy_conversation_seed.sql)
--
-- Restores submit_order_request_v2 and submit_pasabuy_request to baseline
-- without inline conversation seeding.
-- ===========================================================================

begin;

create or replace function public.submit_order_request_v2(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_delivery_address text,
  p_fulfillment_method text,
  p_customer_note text,
  p_items jsonb,
  p_idempotency_key text,
  p_coupon_code text default null::text,
  p_shipping_amount numeric default 0,
  p_shipping_quote_status text default null::text
)
returns public.order_requests
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_order public.order_requests;
  v_item jsonb;
  v_product record;
  v_coupon public.coupons;
  v_qty integer;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_shipping numeric := 0;
  v_shipping_status text := 'pending_quote';
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

  if p_shipping_amount is not null and p_shipping_amount >= 0 and p_shipping_amount <= 100000 and coalesce(p_shipping_quote_status, '') = 'customer_confirmed' then
    v_shipping := p_shipping_amount;
    v_shipping_status := 'customer_confirmed';
  end if;

  insert into public.order_requests (
    customer_name, customer_email, customer_phone, delivery_address,
    fulfillment_method, customer_note, idempotency_key,
    shipping_amount, shipping_quote_status, delivery_status,
    customer_delivery_confirmed_at
  ) values (
    trim(p_customer_name), nullif(trim(p_customer_email), ''), nullif(trim(p_customer_phone), ''),
    trim(p_delivery_address), coalesce(nullif(trim(p_fulfillment_method), ''), 'Courier delivery'),
    nullif(trim(p_customer_note), ''), trim(p_idempotency_key),
    v_shipping, v_shipping_status,
    case when v_shipping_status = 'customer_confirmed' then 'ready_to_pack' else 'awaiting_quote' end,
    case when v_shipping_status = 'customer_confirmed' then now() else null end
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
    if v_product.product_status not in ('Live', 'Active', 'Unlisted') then
      raise exception 'Product % is not available for website orders', v_product.sku;
    end if;

    insert into public.order_request_items (order_request_id, sku, product_name, quantity, unit_price, line_total)
    values (v_order.id, v_product.sku, v_product.product_name, v_qty, v_product.unit_price, v_product.unit_price * v_qty);
    v_subtotal := v_subtotal + (v_product.unit_price * v_qty);
  end loop;

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
      total_amount = v_subtotal - v_discount + v_shipping,
      updated_at = now()
  where id = v_order.id returning * into v_order;

  insert into public.order_request_events (order_request_id, to_status, metadata)
  values (v_order.id, 'submitted', jsonb_build_object(
    'channel', 'website',
    'shipping', v_shipping_status,
    'shipping_amount', v_shipping,
    'coupon_code', v_order.coupon_code,
    'discount_amount', v_order.discount_amount
  ));

  return v_order;
end;
$function$;

create or replace function public.submit_pasabuy_request(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_item_title text,
  p_reference_url text,
  p_quantity integer,
  p_target_budget_php numeric,
  p_shipping_preference text,
  p_alternatives_allowed boolean,
  p_customer_notes text
)
returns table(id uuid, public_reference text, status text, created_at timestamp with time zone)
language plpgsql
security definer
set search_path = public
as $function$
declare v_request public.pasabuy_requests;
begin
  if nullif(trim(coalesce(p_customer_name, '')), '') is null then
    raise exception 'Customer name is required';
  end if;
  if nullif(trim(coalesce(p_customer_email, '')), '') is null
     and nullif(trim(coalesce(p_customer_phone, '')), '') is null then
    raise exception 'Email or mobile number is required';
  end if;
  if nullif(trim(coalesce(p_item_title, '')), '') is null then
    raise exception 'Item description is required';
  end if;
  if coalesce(p_quantity, 0) < 1 or p_quantity > 999 then
    raise exception 'Quantity must be between 1 and 999';
  end if;
  if coalesce(p_shipping_preference, '') not in ('air', 'sea', 'either') then
    raise exception 'Invalid shipping preference';
  end if;

  insert into public.pasabuy_requests (
    customer_name, customer_email, customer_phone, item_title,
    reference_url, quantity, target_budget_php, shipping_preference,
    alternatives_allowed, customer_notes
  ) values (
    trim(p_customer_name), nullif(trim(p_customer_email), ''),
    nullif(trim(p_customer_phone), ''), trim(p_item_title),
    nullif(trim(p_reference_url), ''), p_quantity, p_target_budget_php,
    p_shipping_preference, coalesce(p_alternatives_allowed, false),
    nullif(trim(p_customer_notes), '')
  ) returning * into v_request;

  insert into public.pasabuy_events (pasabuy_request_id, event_type, to_status)
  values (v_request.id, 'request_submitted', 'request_received');

  return query select v_request.id, v_request.public_reference,
                      v_request.status, v_request.created_at;
end;
$function$;

commit;
