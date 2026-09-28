-- MAP-023 / IDEA-20260928-02. Additive direct-order continuity and private buyer proof.
-- Apply only after a fresh verified backup and a rollback-only rehearsal against
-- the current production schema. The signed guest BFF path remains MAP-020 work.
begin;

do $preflight$
begin
  if to_regclass('public.order_requests') is null
     or to_regclass('public.conversations') is null
     or to_regclass('public.messages') is null
     or to_regprocedure('public.is_staff()') is null then
    raise exception 'K2_RECEIPT_PREFLIGHT_MISSING_DEPENDENCY';
  end if;
end;
$preflight$;

create table if not exists k2_private.order_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.order_requests(id) on delete restrict,
  request_key uuid not null,
  payment_reference text not null check (length(payment_reference) between 1 and 100),
  media_type text not null check (media_type in ('image/png','image/jpeg','application/pdf')),
  byte_size integer not null check (byte_size between 16 and 3145728),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  contents bytea not null,
  submitted_at timestamptz not null default now(),
  unique (order_id, request_key),
  unique (order_id, sha256)
);
create index if not exists order_payment_receipts_order_time_idx
  on k2_private.order_payment_receipts(order_id, submitted_at desc);
revoke all on k2_private.order_payment_receipts from public, anon, authenticated;

create or replace function public.get_order_conversation_v1(
  p_order_id uuid, p_order_key text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.order_requests;
  v_conversation_id uuid;
begin
  if p_order_id is null or p_order_key is null or length(p_order_key) not between 32 and 100 then
    return jsonb_build_object('ok', false, 'error', 'ORDER_ACCESS_REQUIRED');
  end if;
  select * into v_order from public.order_requests
  where id=p_order_id and idempotency_key=p_order_key;
  if not found then return jsonb_build_object('ok', false, 'error', 'ORDER_ACCESS_REQUIRED'); end if;
  select id into v_conversation_id from public.conversations
  where source_kind='order_request' and source_id=v_order.id;
  if v_conversation_id is null then
    return jsonb_build_object('ok', false, 'error', 'ORDER_CONVERSATION_UNAVAILABLE');
  end if;
  return jsonb_build_object(
    'ok', true,
    'public_reference', v_order.public_reference,
    'order_status', v_order.status,
    'payment_status', v_order.payment_status,
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id, 'content', m.content, 'created_at', m.created_at,
        'direction', case when m.sender_type='Customer' then 'inbound' else 'outbound' end
      ) order by m.created_at)
      from (select * from public.messages
        where conversation_id=v_conversation_id and delivery_status<>'internal_only'
        order by created_at desc limit 100) m
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.get_order_conversation_v1(uuid,text) from public, anon, authenticated;
grant execute on function public.get_order_conversation_v1(uuid,text) to anon, authenticated;

create unique index if not exists order_reply_idempotency_idx
  on public.messages(provider_event_key)
  where provider_event_key like 'order-reply:%';

create or replace function public.submit_order_message_v1(
  p_order_id uuid, p_order_key text, p_message text, p_request_key uuid
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.order_requests;
  v_conversation_id uuid;
  v_message_id uuid;
  v_content text := trim(coalesce(p_message,''));
  v_event_key text := 'order-reply:' || p_request_key::text;
begin
  if p_order_id is null or p_order_key is null or length(p_order_key) not between 32 and 100
     or p_request_key is null then
    return jsonb_build_object('ok', false, 'error', 'ORDER_ACCESS_REQUIRED');
  end if;
  select * into v_order from public.order_requests
  where id=p_order_id and idempotency_key=p_order_key for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'ORDER_ACCESS_REQUIRED'); end if;
  select id into v_message_id from public.messages where provider_event_key=v_event_key;
  if v_message_id is not null then return jsonb_build_object('ok', true, 'message_id', v_message_id, 'replayed', true); end if;
  if length(v_content) not between 1 and 2000 then
    return jsonb_build_object('ok', false, 'error', 'MESSAGE_INVALID');
  end if;
  select id into v_conversation_id from public.conversations
  where source_kind='order_request' and source_id=p_order_id;
  if v_conversation_id is null then
    return jsonb_build_object('ok', false, 'error', 'ORDER_CONVERSATION_UNAVAILABLE');
  end if;
  insert into public.messages(conversation_id,sender_type,content,is_draft,delivery_status,direction,provider_event_key)
  values (v_conversation_id,'Customer',v_content,false,'received','inbound',v_event_key)
  returning id into v_message_id;
  update public.conversations set unread_count=coalesce(unread_count,0)+1,
    last_inbound_at=now(), last_message_at=now(), response_due_at=now()+interval '4 hours',
    updated_at=now() where id=v_conversation_id;
  return jsonb_build_object('ok', true, 'message_id', v_message_id, 'replayed', false);
end;
$$;
revoke all on function public.submit_order_message_v1(uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.submit_order_message_v1(uuid,text,text,uuid) to anon, authenticated;

create or replace function public.submit_order_payment_receipt_v1(
  p_order_id uuid, p_order_key text, p_payment_reference text,
  p_media_type text, p_base64 text, p_request_key uuid
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_order public.order_requests;
  v_conversation_id uuid;
  v_bytes bytea;
  v_sha text;
  v_id uuid;
  v_ref text := trim(coalesce(p_payment_reference,''));
begin
  if p_order_id is null or p_order_key is null or length(p_order_key) not between 32 and 100
     or p_request_key is null then
    return jsonb_build_object('ok', false, 'error', 'ORDER_ACCESS_REQUIRED');
  end if;
  select * into v_order from public.order_requests
  where id=p_order_id and idempotency_key=p_order_key for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'ORDER_ACCESS_REQUIRED'); end if;

  select id into v_id from k2_private.order_payment_receipts
  where order_id=p_order_id and request_key=p_request_key;
  if v_id is not null then return jsonb_build_object('ok', true, 'receipt_id', v_id, 'replayed', true); end if;

  if v_order.status not in ('submitted','confirmed') or v_order.payment_status in ('verified','refunded') then
    return jsonb_build_object('ok', false, 'error', 'ORDER_RECEIPT_CLOSED');
  end if;
  if length(v_ref) not between 1 and 100
     or p_media_type is null or p_media_type not in ('image/png','image/jpeg','application/pdf')
     or p_base64 is null or length(p_base64) not between 24 and 4194304 then
    return jsonb_build_object('ok', false, 'error', 'RECEIPT_INVALID');
  end if;
  if (select count(*) from k2_private.order_payment_receipts where order_id=p_order_id) >= 3 then
    return jsonb_build_object('ok', false, 'error', 'RECEIPT_LIMIT_REACHED');
  end if;

  begin
    v_bytes := decode(p_base64, 'base64');
  exception when invalid_parameter_value or data_exception then
    return jsonb_build_object('ok', false, 'error', 'RECEIPT_INVALID');
  end;
  if octet_length(v_bytes) not between 16 and 3145728
     or not (
       (p_media_type='image/png' and substring(v_bytes from 1 for 8)=decode('89504e470d0a1a0a','hex')) or
       (p_media_type='image/jpeg' and substring(v_bytes from 1 for 3)=decode('ffd8ff','hex')) or
       (p_media_type='application/pdf' and substring(v_bytes from 1 for 5)=decode('255044462d','hex'))
     ) then
    return jsonb_build_object('ok', false, 'error', 'RECEIPT_INVALID');
  end if;
  v_sha := encode(extensions.digest(v_bytes,'sha256'),'hex');
  select id into v_id from k2_private.order_payment_receipts
  where order_id=p_order_id and sha256=v_sha;
  if v_id is not null then return jsonb_build_object('ok', true, 'receipt_id', v_id, 'replayed', true); end if;

  select id into v_conversation_id from public.conversations
  where source_kind='order_request' and source_id=p_order_id;
  if v_conversation_id is null then
    return jsonb_build_object('ok', false, 'error', 'ORDER_CONVERSATION_UNAVAILABLE');
  end if;

  insert into k2_private.order_payment_receipts
    (order_id, request_key, payment_reference, media_type, byte_size, sha256, contents)
  values (p_order_id,p_request_key,v_ref,p_media_type,octet_length(v_bytes),v_sha,v_bytes)
  returning id into v_id;
  insert into public.messages(conversation_id,sender_type,content,is_draft,delivery_status,direction)
  values (v_conversation_id,'Customer',
    'Payment receipt uploaded for order ' || v_order.public_reference || '. Reference: ' || v_ref ||
      '. Staff must review this proof and confirm funds separately. Receipt ID: ' || v_id::text,
    false,'received','inbound');
  update public.conversations set unread_count=coalesce(unread_count,0)+1,
    last_inbound_at=now(), last_message_at=now(), response_due_at=now()+interval '4 hours',
    updated_at=now() where id=v_conversation_id;
  return jsonb_build_object('ok', true, 'receipt_id', v_id, 'replayed', false);
end;
$$;
revoke all on function public.submit_order_payment_receipt_v1(uuid,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.submit_order_payment_receipt_v1(uuid,text,text,text,text,uuid) to anon, authenticated;

create or replace function public.list_order_payment_receipts_v1(p_order_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_staff() or coalesce(auth.jwt()->>'aal','') <> 'aal2' then
    raise exception using errcode='42501', message='K2_ADMIN_AAL2_REQUIRED';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',id, 'payment_reference',payment_reference, 'media_type',media_type,
    'byte_size',byte_size, 'submitted_at',submitted_at
  ) order by submitted_at desc) from k2_private.order_payment_receipts where order_id=p_order_id), '[]'::jsonb);
end;
$$;
revoke all on function public.list_order_payment_receipts_v1(uuid) from public, anon, authenticated;
grant execute on function public.list_order_payment_receipts_v1(uuid) to authenticated;

create or replace function public.get_order_payment_receipt_v1(p_receipt_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_receipt k2_private.order_payment_receipts;
begin
  if auth.uid() is null or not public.is_staff() or coalesce(auth.jwt()->>'aal','') <> 'aal2' then
    raise exception using errcode='42501', message='K2_ADMIN_AAL2_REQUIRED';
  end if;
  select * into v_receipt from k2_private.order_payment_receipts where id=p_receipt_id;
  if not found then return jsonb_build_object('ok', false, 'error', 'RECEIPT_NOT_FOUND'); end if;
  return jsonb_build_object('ok', true, 'media_type', v_receipt.media_type,
    'contents_base64', encode(v_receipt.contents,'base64'),
    'sha256',v_receipt.sha256, 'payment_reference',v_receipt.payment_reference);
end;
$$;
revoke all on function public.get_order_payment_receipt_v1(uuid) from public, anon, authenticated;
grant execute on function public.get_order_payment_receipt_v1(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
