-- MAP-023 / MAP-018 — automated delivery quotation recording on guest order submission.
--
-- When a customer selects a calculated delivery mode at checkout, the storefront BFF
-- supplies shippingAmount and shippingQuoteStatus ('customer_confirmed').
-- This migration updates submit_guest_order_v1 to apply the calculated shipping fee
-- directly to order_requests.shipping_amount, records the confirmed quote status,
-- and updates total_amount = subtotal - discount + shipping_amount atomically.
--
-- Orders submitted without an upfront delivery quote continue to default to 0 and 'pending_quote'.

begin;

-- Preflight checks
do $preflight$
begin
  if to_regprocedure('public.submit_guest_order_v1(bigint,uuid,text,text,text,text)') is null then
    raise exception 'PREFLIGHT_FAILED: public.submit_guest_order_v1 must exist';
  end if;
  if to_regclass('public.channels') is null or to_regclass('public.channel_shops') is null
     or to_regprocedure('public.execute_admin_website_listing_command_v1(text,bigint,uuid,uuid,text,text)') is null then
    raise exception 'PREFLIGHT_FAILED: protected canonical Website assignment must exist';
  end if;
end
$preflight$;

create or replace function k2_private.require_website_order_items(p_items jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare v_sku text; v_product public.products%rowtype;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception using errcode='K2WEB',message='K2_PRODUCT_NOT_OFFERED_ON_WEBSITE';
  end if;
  -- Inventory writers take balances before lots and product projections. Take
  -- every basket balance in that same SKU order before any product/listing lock.
  -- A missing balance derives only from canonical lots, never a display count.
  insert into public.inventory_balances(sku,location_code,on_hand,reserved)
  select p.sku,'MANILA_MAIN',coalesce(sum(b.quantity),0)::integer,
    coalesce(sum(b.reserved_quantity),0)::integer
  from public.products p left join public.product_batches b on b.sku=p.sku
  where p.sku in (select item->>'sku' from jsonb_array_elements(p_items) item)
  group by p.sku order by p.sku on conflict(sku,location_code) do nothing;
  perform 1 from public.inventory_balances b where b.location_code='MANILA_MAIN'
    and b.sku in (select item->>'sku' from jsonb_array_elements(p_items) item)
    order by b.sku for update;
  for v_sku in select distinct item->>'sku' from jsonb_array_elements(p_items) item order by 1 loop
    -- The assignment command takes product then listing; it never takes stock.
    select * into v_product from public.products where sku=v_sku for update;
    if not found or v_product.is_human_reviewed is distinct from true
       or nullif(trim(v_product.name),'') is null or nullif(trim(v_product.primary_image_url),'') is null
       or coalesce(v_product.srp,v_product.retail_price,0)<=0
       or (v_product.status::text='Unlisted'
         or (v_product.status::text in ('Live','Active') and v_product.published is true)) is distinct from true then
      raise exception using errcode='K2WEB',message='K2_PRODUCT_NOT_OFFERED_ON_WEBSITE';
    end if;
    perform 1 from public.channel_listings where sku=v_sku and channel_source='website' and shop_id is null
      and status='Active' and publication_status in ('ready','published')
      and validation_errors='[]'::jsonb for share;
    if not found then raise exception using errcode='K2WEB',message='K2_PRODUCT_NOT_OFFERED_ON_WEBSITE'; end if;
  end loop;
end $$;
revoke all on function k2_private.require_website_order_items(jsonb) from public,anon,authenticated;

create or replace function public.submit_guest_order_v1(
  p_timestamp bigint,
  p_nonce uuid,
  p_payload_text text,
  p_ip_hash text,
  p_signature text,
  p_guest_grant_hash text default null
)
returns table(
  ok boolean, error_code text, retry_after_seconds integer,
  public_reference text, status text, subtotal numeric, discount_amount numeric,
  total_amount numeric, shipping_quote_status text, delivery_status text,
  created_at timestamptz, guest_grant_token text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_order public.order_requests;
  v_identity record;
  v_conversation_id uuid;
  v_message_id uuid;
  v_ip bytea;
  v_contact bytea;
  v_rate record;
  v_fingerprint bytea;
  v_existing_hash bytea;
  v_shipping_num numeric;
begin
  if not k2_private.verify_guest_bff_request('order', p_timestamp, p_nonce, p_payload_text, p_ip_hash, p_signature) then
    return query select false, 'REQUEST_REPLAYED', 0, null::text, null::text, null::numeric,
      null::numeric, null::numeric, null::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  v_payload := p_payload_text::jsonb;
  v_ip := decode(p_ip_hash, 'hex');
  v_contact := k2_private.contact_hash(v_payload);
  v_fingerprint := extensions.digest(convert_to(p_payload_text, 'UTF8'), 'sha256');
  if p_guest_grant_hash ~ '^[0-9a-f]{64}$' then v_existing_hash := decode(p_guest_grant_hash, 'hex'); end if;

  select * into v_rate from k2_private.consume_guest_rate('order','ip',v_ip,900,5);
  if not v_rate.allowed then
    return query select false, 'RATE_LIMITED', v_rate.retry_after_seconds, null::text, null::text,
      null::numeric, null::numeric, null::numeric, null::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  select * into v_rate from k2_private.consume_guest_rate('order','contact',v_contact,3600,3);
  if not v_rate.allowed then
    return query select false, 'RATE_LIMITED', v_rate.retry_after_seconds, null::text, null::text,
      null::numeric, null::numeric, null::numeric, null::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  -- Match the canonical writer: serialize the key before inventory/FK locks.
  perform pg_advisory_xact_lock(hashtextextended('k2.website-order:'||trim(v_payload->>'idempotencyKey'),0));
  select * into v_order from public.order_requests
  where idempotency_key = v_payload->>'idempotencyKey';
  if found then
    if v_order.request_fingerprint is distinct from v_fingerprint then
      return query select false, 'IDEMPOTENCY_CONFLICT', 0, null::text, null::text,
        null::numeric, null::numeric, null::numeric, null::text, null::text, null::timestamptz, null::text;
    else
      return query select true, null::text, 0, v_order.public_reference, v_order.status,
        v_order.subtotal, v_order.discount_amount, v_order.total_amount,
        v_order.shipping_quote_status, v_order.delivery_status, v_order.created_at, null::text;
    end if;
    return;
  end if;

  perform k2_private.require_website_order_items(v_payload->'items');
  select * into v_identity from k2_private.resolve_guest_identity(
    v_payload, 'website_guest', v_existing_hash
  );
  v_order := public.submit_order_request_v2(
    v_payload->>'customerName', nullif(v_payload->>'email',''), nullif(v_payload->>'phone',''),
    v_payload->>'address', v_payload->>'fulfillmentMethod', nullif(v_payload->>'note',''),
    v_payload->'items', v_payload->>'idempotencyKey', nullif(v_payload->>'couponCode','')
  );

  -- Apply upfront delivery quotation if provided by checkout
  if (v_payload->>'shippingAmount') is not null then
    begin
      v_shipping_num := (v_payload->>'shippingAmount')::numeric;
      if v_shipping_num >= 0 and v_shipping_num <= 100000 then
        update public.order_requests as o
        set shipping_amount = v_shipping_num,
            shipping_quote_status = coalesce(nullif(v_payload->>'shippingQuoteStatus',''), 'customer_confirmed'),
            total_amount = o.subtotal - o.discount_amount + v_shipping_num,
            customer_delivery_confirmed_at = now(),
            updated_at = now()
        where o.id = v_order.id
        returning o.* into v_order;
      end if;
    exception when others then
      -- Fall back cleanly to unpriced order request on invalid numeric
      null;
    end;
  end if;

  update public.order_requests set customer_id=v_identity.customer_id,
    request_fingerprint=v_fingerprint where id=v_order.id returning * into v_order;

  insert into public.conversations(
    customer_id, customer_name, customer_email, customer_phone, platform, source_kind, source_id
  ) values (
    v_identity.customer_id, v_order.customer_name, v_order.customer_email, v_order.customer_phone,
    'Website', 'order_request', v_order.id
  )
  on conflict (source_kind, source_id)
    where source_kind is not null and source_id is not null
  do update set
    customer_id=excluded.customer_id,
    customer_name=excluded.customer_name,
    customer_email=excluded.customer_email,
    customer_phone=excluded.customer_phone,
    updated_at=now()
  returning id into v_conversation_id;

  insert into public.messages(
    conversation_id, sender_type, content, is_draft, delivery_status, provider_event_key, direction
  )
  select v_conversation_id, 'Customer',
    'Order ' || v_order.public_reference || ' received through the website. '
      || 'Delivery option: ' || coalesce(v_order.fulfillment_method, 'Standard') || ' (₱' || v_order.shipping_amount::text || '). '
      || 'Total: ₱' || v_order.total_amount::text || '. Staff verify Manila stock and contact with payment details.',
    false, 'received', 'guest-order-seed:' || v_order.id::text, 'inbound'
  where not exists (
    select 1 from public.messages
    where conversation_id = v_conversation_id
      and (provider_event_key in ('guest-order-seed:' || v_order.id::text, 'order_seed_' || v_order.id::text)
        or external_message_id in ('guest-order-seed:' || v_order.id::text, 'order_seed_' || v_order.id::text))
  )
  returning id into v_message_id;

  insert into public.conversation_events(
    conversation_id, event_type, reason, metadata
  )
  select v_conversation_id, 'inbound_message',
    'Seeded customer conversation from order submission ' || v_order.public_reference,
    jsonb_build_object('order_id',v_order.id,'public_reference',v_order.public_reference,'source_kind','order_request')
  where v_message_id is not null;

  if v_message_id is not null then
    update public.conversations
    set unread_count=1,last_inbound_at=now(),response_due_at=now()+interval '4 hours',
      last_message_at=now(),updated_at=now()
    where id=v_conversation_id;
  end if;

  insert into public.guest_access_grant_scopes(grant_id,scope_kind,scope_id,permissions)
  values
    (v_identity.grant_id,'order_request',v_order.id,array['read']::text[]),
    (v_identity.grant_id,'conversation',v_conversation_id,array['read','reply']::text[])
  on conflict do nothing;

  return query select true, null::text, 0, v_order.public_reference, v_order.status,
    v_order.subtotal, v_order.discount_amount, v_order.total_amount,
    v_order.shipping_quote_status, v_order.delivery_status, v_order.created_at,
    v_identity.raw_grant_token;
end;
$$;

revoke all on function public.submit_guest_order_v1(bigint,uuid,text,text,text,text) from public;
grant execute on function public.submit_guest_order_v1(bigint,uuid,text,text,text,text) to anon;

-- Postflight check
do $postflight$
begin
  if to_regprocedure('public.submit_guest_order_v1(bigint,uuid,text,text,text,text)') is null then
    raise exception 'POSTFLIGHT_FAILED: public.submit_guest_order_v1 was not found after migration';
  end if;
end
$postflight$;

commit;
