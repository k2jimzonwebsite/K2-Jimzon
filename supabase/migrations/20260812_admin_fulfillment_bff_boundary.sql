-- K2 Jimzon Admin BOS: signed, replay-safe fulfillment command boundary.
-- Prepared only. Do not apply until the exposed service-role credential is
-- disabled/replaced and MAP-017 is approved for permanent production use.

begin;

create schema if not exists k2_private;
revoke all on schema k2_private from public, anon, authenticated;

create table if not exists k2_private.admin_bff_secrets (
  singleton boolean primary key default true check (singleton),
  request_secret bytea not null check (octet_length(request_secret) = 32),
  configured_at timestamptz not null default now()
);
revoke all on table k2_private.admin_bff_secrets from public, anon, authenticated;

create table if not exists k2_private.admin_request_nonces (
  actor_id uuid not null,
  action text not null,
  nonce uuid not null,
  used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (actor_id, action, nonce)
);
revoke all on table k2_private.admin_request_nonces from public, anon, authenticated;

create table if not exists k2_private.admin_command_receipts (
  actor_id uuid not null,
  action text not null,
  idempotency_key uuid not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  result jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (actor_id, action, idempotency_key)
);
revoke all on table k2_private.admin_command_receipts from public, anon, authenticated;
create index if not exists admin_command_receipts_actor_time_idx
  on k2_private.admin_command_receipts (actor_id, created_at desc);

create or replace function k2_private.verify_admin_bff_request(
  p_action text,
  p_timestamp bigint,
  p_nonce uuid,
  p_idempotency_key uuid,
  p_payload_text text,
  p_signature text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_secret bytea;
  v_payload_hash text;
  v_expected text;
  v_message text;
begin
  if v_actor is null or not public.is_staff() then
    raise exception using errcode='42501', message='K2_ADMIN_ACCESS_REQUIRED';
  end if;
  if coalesce(auth.jwt()->>'aal', '') <> 'aal2' then
    raise exception using errcode='42501', message='K2_ADMIN_AAL2_REQUIRED';
  end if;
  if p_action not in (
    'confirm_order', 'packing_scan', 'payment_status', 'delivery_details',
    'fulfill_order', 'transfer_lot', 'assign_box',
    'inbox_internal_note', 'inbox_mark_read', 'inbox_workflow',
    'pasabuy_transition', 'pasabuy_quote',
    'intake_session_create', 'intake_session_step', 'intake_draft',
    'intake_inventory', 'intake_publication', 'intake_evidence_register',
    'consignment_create', 'consignment_add_line', 'consignment_scan',
    'consignment_advance', 'consignment_finalize',
    'lots_reconcile', 'lot_clearance',
    'coupon_create', 'coupon_state', 'coupon_archive',
    'catalog_import_chunk'
  ) then
    raise exception using errcode='22023', message='K2_ADMIN_ACTION_INVALID';
  end if;
  if p_payload_text is null or octet_length(convert_to(p_payload_text, 'UTF8')) >
       case when p_action='catalog_import_chunk' then 1048576 else 16384 end
     or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023', message='K2_ADMIN_REQUEST_INVALID';
  end if;
  if abs(extract(epoch from clock_timestamp())::bigint - p_timestamp) > 300 then
    raise exception using errcode='28000', message='K2_ADMIN_SIGNATURE_EXPIRED';
  end if;

  select request_secret into v_secret
  from k2_private.admin_bff_secrets where singleton = true;
  if v_secret is null then
    raise exception using errcode='55000', message='K2_ADMIN_BOUNDARY_NOT_CONFIGURED';
  end if;

  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text, 'UTF8'), 'sha256'), 'hex');
  v_message := p_action || E'\n' || p_timestamp::text || E'\n' || p_nonce::text
    || E'\n' || v_actor::text || E'\n' || p_idempotency_key::text || E'\n' || v_payload_hash;
  v_expected := encode(extensions.hmac(convert_to(v_message, 'UTF8'), v_secret, 'sha256'), 'hex');
  if extensions.digest(convert_to(v_expected, 'UTF8'), 'sha256')
     <> extensions.digest(convert_to(p_signature, 'UTF8'), 'sha256') then
    raise exception using errcode='28000', message='K2_ADMIN_SIGNATURE_INVALID';
  end if;

  delete from k2_private.admin_request_nonces where expires_at <= now();
  insert into k2_private.admin_request_nonces(actor_id, action, nonce, expires_at)
  values (v_actor, p_action, p_nonce, now() + interval '10 minutes')
  on conflict do nothing;
  return found;
end;
$$;
revoke all on function k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)
  from public, anon, authenticated;

create or replace function public.execute_admin_fulfillment_command_v1(
  p_action text,
  p_timestamp bigint,
  p_nonce uuid,
  p_idempotency_key uuid,
  p_payload_text text,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_payload jsonb;
  v_payload_hash text;
  v_existing k2_private.admin_command_receipts;
  v_order public.order_requests;
  v_result jsonb;
  v_uuid uuid;
  v_count integer;
  v_inserted integer;
  v_limit integer;
begin
  if not k2_private.verify_admin_bff_request(
    p_action, p_timestamp, p_nonce, p_idempotency_key, p_payload_text, p_signature
  ) then
    raise exception using errcode='28000', message='K2_ADMIN_REQUEST_REPLAYED';
  end if;

  v_payload := p_payload_text::jsonb;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
  end if;
  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text, 'UTF8'), 'sha256'), 'hex');

  select * into v_existing from k2_private.admin_command_receipts
  where actor_id = v_actor and action = p_action and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.payload_hash <> v_payload_hash then
      raise exception using errcode='22023', message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.result is null then
      raise exception using errcode='55000', message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;

  v_limit := case when p_action = 'packing_scan' then 240 else 30 end;
  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id = v_actor and action = p_action and created_at > now() - interval '1 minute';
  if v_count >= v_limit then
    raise exception using errcode='54000', message='K2_ADMIN_RATE_LIMITED';
  end if;

  insert into k2_private.admin_command_receipts(actor_id, action, idempotency_key, payload_hash)
  values (v_actor, p_action, p_idempotency_key, v_payload_hash)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    select * into v_existing from k2_private.admin_command_receipts
    where actor_id = v_actor and action = p_action and idempotency_key = p_idempotency_key;
    if v_existing.payload_hash <> v_payload_hash then
      raise exception using errcode='22023', message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    return v_existing.result;
  end if;

  if p_action = 'confirm_order' then
    if (v_payload - array['orderRequestId','reason']) <> '{}'::jsonb
       or length(trim(coalesce(v_payload->>'reason',''))) not between 1 and 500 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_order from public.confirm_order_request(
      (v_payload->>'orderRequestId')::uuid, v_payload->>'reason'
    );
    v_result := jsonb_build_object('orderId',v_order.id,'publicReference',v_order.public_reference,'status',v_order.status);
  elsif p_action = 'packing_scan' then
    if (v_payload - array['orderRequestId','scannedCode']) <> '{}'::jsonb
       or length(trim(coalesce(v_payload->>'scannedCode',''))) not between 1 and 120 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select public.record_packing_scan(
      (v_payload->>'orderRequestId')::uuid, v_payload->>'scannedCode'
    ) into v_result;
  elsif p_action = 'payment_status' then
    if (v_payload - array['orderRequestId','toStatus','evidenceNote']) <> '{}'::jsonb
       or coalesce(v_payload->>'toStatus','') not in ('awaiting_instructions','evidence_submitted','verified','failed','refunded') then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_order from public.set_order_request_payment_status(
      (v_payload->>'orderRequestId')::uuid, v_payload->>'toStatus', nullif(v_payload->>'evidenceNote','')
    );
    v_result := jsonb_build_object('orderId',v_order.id,'publicReference',v_order.public_reference,'paymentStatus',v_order.payment_status);
  elsif p_action = 'delivery_details' then
    if (v_payload - array['orderRequestId','shippingAmount','courierName','trackingNumber','waybillUrl','customerConfirmed','note']) <> '{}'::jsonb
       or length(trim(coalesce(v_payload->>'courierName',''))) not between 1 and 120
       or length(trim(coalesce(v_payload->>'note',''))) not between 1 and 1000 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_order from public.set_order_delivery_details(
      (v_payload->>'orderRequestId')::uuid, (v_payload->>'shippingAmount')::numeric,
      v_payload->>'courierName', nullif(v_payload->>'trackingNumber',''),
      nullif(v_payload->>'waybillUrl',''), (v_payload->>'customerConfirmed')::boolean,
      v_payload->>'note'
    );
    v_result := jsonb_build_object('orderId',v_order.id,'publicReference',v_order.public_reference,'deliveryStatus',v_order.delivery_status,'shippingQuoteStatus',v_order.shipping_quote_status);
  elsif p_action = 'fulfill_order' then
    if (v_payload - array['orderRequestId','handoverNote']) <> '{}'::jsonb
       or length(trim(coalesce(v_payload->>'handoverNote',''))) not between 1 and 1000 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_order from public.fulfill_order_request(
      (v_payload->>'orderRequestId')::uuid, v_payload->>'handoverNote'
    );
    v_result := jsonb_build_object('orderId',v_order.id,'publicReference',v_order.public_reference,'status',v_order.status,'deliveryStatus',v_order.delivery_status);
  elsif p_action = 'transfer_lot' then
    if (v_payload - array['batchId','quantity','toCustodian','toLocation','reason']) <> '{}'::jsonb
       or (v_payload->>'quantity')::integer < 1
       or length(trim(coalesce(v_payload->>'toCustodian',''))) not between 1 and 140
       or length(trim(coalesce(v_payload->>'reason',''))) not between 1 and 500 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select public.transfer_inventory_custody_exact(
      (v_payload->>'batchId')::uuid, (v_payload->>'quantity')::integer,
      v_payload->>'toCustodian', nullif(v_payload->>'toLocation',''), v_payload->>'reason'
    ) into v_uuid;
    v_result := jsonb_build_object('destinationBatchId',v_uuid);
  elsif p_action = 'assign_box' then
    if (v_payload - array['boxCode','toCustodian','reason']) <> '{}'::jsonb
       or length(trim(coalesce(v_payload->>'boxCode',''))) not between 1 and 140
       or length(trim(coalesce(v_payload->>'toCustodian',''))) not between 1 and 140
       or length(trim(coalesce(v_payload->>'reason',''))) not between 1 and 500 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select public.transfer_inventory_custody(
      v_payload->>'toCustodian', v_payload->>'boxCode', null, v_payload->>'reason'
    ) into v_count;
    v_result := jsonb_build_object('updatedLots',v_count);
  else
    raise exception using errcode='22023', message='K2_ADMIN_ACTION_INVALID';
  end if;

  update k2_private.admin_command_receipts
  set result = v_result, completed_at = now()
  where actor_id = v_actor and action = p_action and idempotency_key = p_idempotency_key;
  return v_result;
end;
$$;

revoke all on function public.execute_admin_fulfillment_command_v1(text,bigint,uuid,uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.execute_admin_fulfillment_command_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

notify pgrst, 'reload schema';
commit;
