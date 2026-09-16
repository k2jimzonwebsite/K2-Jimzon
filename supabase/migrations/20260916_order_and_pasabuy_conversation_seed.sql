-- ===========================================================================
-- MAP-019 Queue item 14: Order & Pasabuy Support Conversation Seed
--
-- Seeds an initial inbound support conversation in public.conversations and
-- public.messages for website order requests and pasabuy requests.
--
-- Invariants:
-- 1. conversations.status = 'Open' (capitalized, matches check constraint)
-- 2. conversations.priority = 'normal' (lowercase, matches check constraint)
-- 3. conversations.platform = 'Website' for orders, 'Pasabuy' for pasabuy requests
-- 4. messages.sender_type = 'Customer'::public.message_sender
-- 5. messages.delivery_status = 'received' (matches check constraint)
-- 6. unread_count = 1, response_due_at = now() + interval '4 hours'
-- 7. Additive, safe, and idempotent: ON CONFLICT on conversations and WHERE NOT EXISTS on messages
-- ===========================================================================

begin;

-- Preflight checks
do $preflight$
begin
  if to_regclass('public.order_requests') is null or to_regclass('public.pasabuy_requests') is null then
    raise exception 'PREFLIGHT_FAILED: order_requests or pasabuy_requests table is missing';
  end if;
  if to_regclass('public.conversations') is null or to_regclass('public.messages') is null then
    raise exception 'PREFLIGHT_FAILED: conversations or messages table is missing';
  end if;
  if to_regprocedure('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text)') is null then
    raise exception 'PREFLIGHT_FAILED: public.submit_order_request_v2 does not exist';
  end if;
  if to_regprocedure('public.submit_pasabuy_request(text,text,text,text,text,integer,numeric,text,boolean,text)') is null then
    raise exception 'PREFLIGHT_FAILED: public.submit_pasabuy_request does not exist';
  end if;
end
$preflight$;

-- Ensure direction and provider_event_key exist on public.messages
alter table public.messages
  add column if not exists direction text
  check (direction is null or direction in ('inbound', 'outbound', 'internal'));

alter table public.messages
  add column if not exists provider_event_key text;

create index if not exists messages_provider_event_key_idx
  on public.messages (provider_event_key)
  where provider_event_key is not null;

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
  v_conversation_id uuid;
  v_message_id uuid;
begin
  if nullif(trim(coalesce(p_customer_name, '')), '') is null then
    raise exception 'Customer name is required';
  end if;
  if nullif(trim(coalesce(p_customer_email, '')), '') is null
     and nullif(trim(coalesce(p_customer_phone, '')), '') is null then
    raise exception 'Email or mobile number is required';
  end if;
  if nullif(trim(coalesce(p_delivery_address, '')), '') is null then
    raise exception 'Delivery address is required';
  end if;
  if nullif(trim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception 'Request key is required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one item is required';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'A request may contain at most 50 items';
  end if;

  select * into v_order from public.order_requests where idempotency_key = trim(p_idempotency_key);
  if found then
    return v_order;
  end if;

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
    if v_qty < 1 or v_qty > 999 then
      raise exception 'Invalid item quantity';
    end if;

    select sku, coalesce(nullif(name, ''), nullif(title, ''), sku) product_name,
           coalesce(srp, retail_price, 0) unit_price, status::text product_status
    into v_product from public.products where sku = v_item ->> 'sku';
    if not found then
      raise exception 'Product % was not found', v_item ->> 'sku';
    end if;
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
    if not found then
      raise exception 'Coupon is invalid, inactive, expired, or fully redeemed';
    end if;
    if v_subtotal < v_coupon.min_spend then
      raise exception 'Coupon minimum spend is not met';
    end if;
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

  -- Seed support conversation (MAP-019 Queue item 14)
  insert into public.conversations (
    customer_name, customer_email, customer_phone,
    platform, source_kind, source_id,
    status, priority, unread_count,
    last_message_at, last_inbound_at, response_due_at
  ) values (
    v_order.customer_name, v_order.customer_email, v_order.customer_phone,
    'Website'::public.chat_platform, 'order_request', v_order.id,
    'Open', 'normal', 1,
    now(), now(), now() + interval '4 hours'
  )
  on conflict (source_kind, source_id)
    where source_kind is not null and source_id is not null
  do update set
    customer_name = excluded.customer_name,
    customer_email = excluded.customer_email,
    customer_phone = excluded.customer_phone,
    last_message_at = now(),
    updated_at = now()
  returning id into v_conversation_id;

  -- Seed initial customer message (system-recorded inbound request)
  insert into public.messages (
    conversation_id, sender_type, content, is_draft, delivery_status,
    external_message_id, provider_event_key, direction
  )
  select
    v_conversation_id,
    'Customer'::public.message_sender,
    'Order ' || v_order.public_reference || ' received through the website. '
      || 'Staff review stock, delivery charge and total, then reply here. '
      || 'This message was recorded automatically when the order was placed.',
    false,
    'received',
    'guest-order-seed:' || v_order.id::text,
    'guest-order-seed:' || v_order.id::text,
    'inbound'
  where not exists (
    select 1 from public.messages
    where external_message_id = 'guest-order-seed:' || v_order.id::text
       or (provider_event_key is not null and provider_event_key = 'guest-order-seed:' || v_order.id::text)
       or external_message_id = 'order_seed_' || v_order.id::text
  )
  returning id into v_message_id;

  if v_message_id is not null then
    update public.conversations
    set unread_count = 1,
        last_inbound_at = now(),
        response_due_at = now() + interval '4 hours',
        last_message_at = now(),
        updated_at = now()
    where id = v_conversation_id;

    if to_regclass('public.conversation_events') is not null then
      insert into public.conversation_events (
        conversation_id, event_type, reason, metadata
      ) values (
        v_conversation_id,
        'inbound_message',
        'Seeded customer conversation from order submission ' || v_order.public_reference,
        jsonb_build_object(
          'order_id', v_order.id,
          'public_reference', v_order.public_reference,
          'source_kind', 'order_request'
        )
      );
    end if;
  end if;

  return v_order;
end;
$function$;

revoke all on function public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text) from public;

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
declare
  v_request public.pasabuy_requests;
  v_conversation_id uuid;
  v_message_id uuid;
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

  -- Seed support conversation (MAP-019 Queue item 14)
  insert into public.conversations (
    customer_name, customer_email, customer_phone,
    platform, source_kind, source_id,
    status, priority, unread_count,
    last_message_at, last_inbound_at, response_due_at
  ) values (
    v_request.customer_name, v_request.customer_email, v_request.customer_phone,
    'Pasabuy'::public.chat_platform, 'pasabuy_request', v_request.id,
    'Open', 'normal', 1,
    now(), now(), now() + interval '4 hours'
  )
  on conflict (source_kind, source_id)
    where source_kind is not null and source_id is not null
  do update set
    customer_name = excluded.customer_name,
    customer_email = excluded.customer_email,
    customer_phone = excluded.customer_phone,
    last_message_at = now(),
    updated_at = now()
  returning conversations.id into v_conversation_id;

  insert into public.messages (
    conversation_id, sender_type, content, is_draft, delivery_status,
    external_message_id, provider_event_key, direction
  )
  select
    v_conversation_id,
    'Customer'::public.message_sender,
    'Pasabuy request ' || v_request.public_reference || ' received through the website. '
      || 'Staff research availability in Italy and reply here with a quote. '
      || 'This message was recorded automatically when the request was submitted.',
    false,
    'received',
    'guest-pasabuy-seed:' || v_request.id::text,
    'guest-pasabuy-seed:' || v_request.id::text,
    'inbound'
  where not exists (
    select 1 from public.messages
    where external_message_id = 'guest-pasabuy-seed:' || v_request.id::text
       or (provider_event_key is not null and provider_event_key = 'guest-pasabuy-seed:' || v_request.id::text)
  )
  returning messages.id into v_message_id;

  if v_message_id is not null then
    update public.conversations
    set unread_count = 1,
        last_inbound_at = now(),
        response_due_at = now() + interval '4 hours',
        last_message_at = now(),
        updated_at = now()
    where conversations.id = v_conversation_id;

    if to_regclass('public.conversation_events') is not null then
      insert into public.conversation_events (
        conversation_id, event_type, reason, metadata
      ) values (
        v_conversation_id,
        'inbound_message',
        'Seeded customer conversation from pasabuy submission ' || v_request.public_reference,
        jsonb_build_object(
          'pasabuy_id', v_request.id,
          'public_reference', v_request.public_reference,
          'source_kind', 'pasabuy_request'
        )
      );
    end if;
  end if;

  return query select v_request.id, v_request.public_reference,
                      v_request.status, v_request.created_at;
end;
$function$;

-- Postflight checks
do $postflight$
begin
  if to_regprocedure('public.submit_order_request_v2(text,text,text,text,text,text,jsonb,text,text,numeric,text)') is null then
    raise exception 'POSTFLIGHT_FAILED: public.submit_order_request_v2 missing after migration';
  end if;
  if to_regprocedure('public.submit_pasabuy_request(text,text,text,text,text,integer,numeric,text,boolean,text)') is null then
    raise exception 'POSTFLIGHT_FAILED: public.submit_pasabuy_request missing after migration';
  end if;
end
$postflight$;

commit;
