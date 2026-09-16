-- MAP-019 Queue item 14 — seed the order/pasabuy conversation with its first
-- message instead of opening an empty thread.
--
-- `submit_guest_order_v1` and `submit_guest_pasabuy_v1` insert a conversation
-- row plus guest grants but no message, so customers land in an empty thread
-- while staff see no content, no unread badge, and no response-due timer.
-- `start_guest_conversation_v1` already seeds message + unread + 4-hour SLA;
-- this migration gives the order and pasabuy paths the same shape.
--
-- The seeded message is system-authored but recorded as an inbound Customer
-- message, exactly like the contact path: that is what raises the unread
-- count and starts the response-due timer. Its wording never claims a staff
-- member wrote it and never promises review speed, stock, or delivery.
-- Replay safety comes from the existing idempotency early-returns (same key
-- returns before reaching the seed), plus a provider_event_key guard so a
-- concurrent double execution cannot seed twice.
--
-- Additive and replayable. No column is dropped, no grant is changed
-- (`create or replace` preserves the anon execute grant), no existing row
-- changes meaning. Prepared only; provider application stays under MAP-017.

begin;

do $preflight$
begin
  if to_regprocedure('public.submit_guest_order_v1(bigint,uuid,text,text,text,text)') is null
     or to_regprocedure('public.submit_guest_pasabuy_v1(bigint,uuid,text,text,text,text)') is null then
    raise exception 'MAP-019 conversation seeding: the guest submission functions are missing';
  end if;
  if to_regclass('public.messages') is null or to_regclass('public.conversations') is null then
    raise exception 'MAP-019 conversation seeding: conversation tables are missing';
  end if;
end
$preflight$;

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

  select * into v_identity from k2_private.resolve_guest_identity(
    v_payload, 'website_guest', v_existing_hash
  );
  v_order := public.submit_order_request_v2(
    v_payload->>'customerName', nullif(v_payload->>'email',''), nullif(v_payload->>'phone',''),
    v_payload->>'address', v_payload->>'fulfillmentMethod', nullif(v_payload->>'note',''),
    v_payload->'items', v_payload->>'idempotencyKey', nullif(v_payload->>'couponCode','')
  );
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

  -- The first message. Same shape as the contact path: inbound, unread,
  -- response due in 4 hours. Guarded so a concurrent double execution seeds
  -- exactly once; ordinary replays return before reaching this block.
  insert into public.messages(
    conversation_id, sender_type, content, is_draft, delivery_status, provider_event_key, direction
  )
  select v_conversation_id, 'Customer',
    'Order ' || v_order.public_reference || ' received through the website. '
      || 'Staff review stock, delivery charge and total, then reply here. '
      || 'This message was recorded automatically when the order was placed.',
    false, 'received', 'guest-order-seed:' || v_order.id::text, 'inbound'
  where not exists (
    select 1 from public.messages
    where provider_event_key = 'guest-order-seed:' || v_order.id::text
  )
  returning id into v_message_id;
  if v_message_id is not null then
    update public.conversations
    set unread_count = 1, last_inbound_at = now(), response_due_at = now() + interval '4 hours',
      last_message_at = now(), updated_at = now()
    where id = v_conversation_id;
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

create or replace function public.submit_guest_pasabuy_v1(
  p_timestamp bigint,
  p_nonce uuid,
  p_payload_text text,
  p_ip_hash text,
  p_signature text,
  p_guest_grant_hash text default null
)
returns table(
  ok boolean, error_code text, retry_after_seconds integer,
  public_reference text, status text, created_at timestamptz, guest_grant_token text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_request public.pasabuy_requests;
  v_request_id uuid;
  v_identity record;
  v_conversation_id uuid;
  v_message_id uuid;
  v_ip bytea;
  v_contact bytea;
  v_rate record;
  v_fingerprint bytea;
  v_existing_hash bytea;
begin
  if not k2_private.verify_guest_bff_request('pasabuy', p_timestamp, p_nonce, p_payload_text, p_ip_hash, p_signature) then
    return query select false, 'REQUEST_REPLAYED', 0, null::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  v_payload := p_payload_text::jsonb;
  v_ip := decode(p_ip_hash, 'hex');
  v_contact := k2_private.contact_hash(v_payload);
  v_fingerprint := extensions.digest(convert_to(p_payload_text, 'UTF8'), 'sha256');
  if p_guest_grant_hash ~ '^[0-9a-f]{64}$' then v_existing_hash := decode(p_guest_grant_hash, 'hex'); end if;

  select * into v_rate from k2_private.consume_guest_rate('pasabuy','ip',v_ip,3600,4);
  if not v_rate.allowed then
    return query select false, 'RATE_LIMITED', v_rate.retry_after_seconds,
      null::text, null::text, null::timestamptz, null::text;
    return;
  end if;
  select * into v_rate from k2_private.consume_guest_rate('pasabuy','contact',v_contact,86400,3);
  if not v_rate.allowed then
    return query select false, 'RATE_LIMITED', v_rate.retry_after_seconds,
      null::text, null::text, null::timestamptz, null::text;
    return;
  end if;

  select * into v_request from public.pasabuy_requests
  where idempotency_key = v_payload->>'idempotencyKey';
  if found then
    if v_request.request_fingerprint is distinct from v_fingerprint then
      return query select false, 'IDEMPOTENCY_CONFLICT', 0,
        null::text, null::text, null::timestamptz, null::text;
    else
      return query select true, null::text, 0, v_request.public_reference,
        v_request.status, v_request.created_at, null::text;
    end if;
    return;
  end if;

  select * into v_identity from k2_private.resolve_guest_identity(
    v_payload, 'pasabuy', v_existing_hash
  );
  select submitted.id into v_request_id from public.submit_pasabuy_request(
    v_payload->>'customerName', nullif(v_payload->>'email',''), nullif(v_payload->>'phone',''),
    v_payload->>'item', nullif(v_payload->>'url',''), (v_payload->>'quantity')::integer,
    nullif(v_payload->>'budget','')::numeric, v_payload->>'shipping',
    coalesce((v_payload->>'alternativesAllowed')::boolean,false), nullif(v_payload->>'notes','')
  ) submitted;
  select * into v_request from public.pasabuy_requests where id=v_request_id;
  update public.pasabuy_requests set customer_id=v_identity.customer_id,
    request_fingerprint=v_fingerprint, idempotency_key=v_payload->>'idempotencyKey'
  where id=v_request.id returning * into v_request;

  insert into public.conversations(
    customer_id, customer_name, customer_email, customer_phone, platform, source_kind, source_id
  ) values (
    v_identity.customer_id, v_request.customer_name, v_request.customer_email, v_request.customer_phone,
    'Pasabuy', 'pasabuy_request', v_request.id
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
    'Pasabuy request ' || v_request.public_reference || ' received. '
      || 'Staff research availability in Italy and reply here with a quote. '
      || 'This message was recorded automatically when the request was placed.',
    false, 'received', 'guest-pasabuy-seed:' || v_request.id::text, 'inbound'
  where not exists (
    select 1 from public.messages
    where provider_event_key = 'guest-pasabuy-seed:' || v_request.id::text
  )
  returning id into v_message_id;
  if v_message_id is not null then
    update public.conversations
    set unread_count = 1, last_inbound_at = now(), response_due_at = now() + interval '4 hours',
      last_message_at = now(), updated_at = now()
    where id = v_conversation_id;
  end if;

  insert into public.guest_access_grant_scopes(grant_id,scope_kind,scope_id,permissions)
  values
    (v_identity.grant_id,'pasabuy_request',v_request.id,array['read']::text[]),
    (v_identity.grant_id,'conversation',v_conversation_id,array['read','reply']::text[])
  on conflict do nothing;

  return query select true, null::text, 0, v_request.public_reference,
    v_request.status, v_request.created_at, v_identity.raw_grant_token;
end;
$$;

notify pgrst, 'reload schema';
commit;
