-- MAP-023 / IDEA-20261014-03. Prepared only; no production apply authorization.
-- Adapt guest-grant access to the existing canonical order chat/private proof.
begin;
create or replace function public.guest_order_conversation_v1(
  p_timestamp bigint, p_nonce uuid, p_payload_text text, p_ip_hash text,
  p_signature text, p_guest_grant_hash text, p_base64 text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_payload jsonb := p_payload_text::jsonb;
  v_operation text := v_payload->>'operation';
  v_grant public.guest_access_grants;
  v_order public.order_requests;
  v_conversation public.conversations;
  v_rate record;
  v_result jsonb;
  v_message public.messages;
  v_receipt k2_private.order_payment_receipts;
  v_bytes bytea;
  v_request uuid;
  v_blocked boolean;
begin
  if p_signature is null or p_guest_grant_hash is null or p_ip_hash is null
    or p_guest_grant_hash !~ '^[0-9a-f]{64}$' or p_ip_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok',false,'error_code','GUEST_ACCESS_REQUIRED');
  end if;
  if v_operation is null or v_operation not in ('read','message','receipt')
    or coalesce(v_payload->>'orderReference','') !~ '^WEB-[A-Z0-9-]+$' then
    return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID');
  end if;
  if not k2_private.verify_guest_bff_request(case when v_operation='read' then 'guest_read' else 'guest_reply' end,
      p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature) then
    return jsonb_build_object('ok',false,'error_code','REQUEST_REPLAYED');
  end if;
  update public.guest_access_grants g set use_count=use_count+1,last_used_at=now()
    where g.token_hash=decode(p_guest_grant_hash,'hex') and g.status='active' and g.expires_at>now()
      and (g.max_uses is null or g.use_count<g.max_uses) returning g.* into v_grant;
  if not found then return jsonb_build_object('ok',false,'error_code','GUEST_ACCESS_EXPIRED'); end if;
  select o.* into v_order from public.order_requests o
    join public.guest_access_grant_scopes s on s.scope_kind='order_request' and s.scope_id=o.id
    where s.grant_id=v_grant.id and 'read'=any(s.permissions)
      and o.public_reference=v_payload->>'orderReference' for update of o;
  if not found then return jsonb_build_object('ok',false,'error_code','CONVERSATION_NOT_AVAILABLE'); end if;
  select c.* into v_conversation from public.conversations c
    join public.guest_access_grant_scopes s on s.scope_kind='conversation' and s.scope_id=c.id
    where s.grant_id=v_grant.id and 'read'=any(s.permissions)
      and (v_operation='read' or 'reply'=any(s.permissions))
      and c.source_kind='order_request' and c.source_id=v_order.id;
  if not found then return jsonb_build_object('ok',false,'error_code','CONVERSATION_NOT_AVAILABLE'); end if;
  if v_operation<>'read' and to_regclass('k2_private.anonymous_chat_blocks') is not null then
    execute 'select exists(select 1 from k2_private.anonymous_chat_blocks where ip_hash=$1)'
      into v_blocked using decode(p_ip_hash,'hex');
    if v_blocked then return jsonb_build_object('ok',false,'error_code','CHAT_BLOCKED'); end if;
  end if;
  select * into v_rate from k2_private.consume_guest_rate('guest_order_'||v_operation,'grant',v_grant.token_hash,
    case when v_operation='read' then 300 else 3600 end, case when v_operation='read' then 60 else 20 end);
  if not v_rate.allowed then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',v_rate.retry_after_seconds); end if;
  v_result := public.get_order_conversation_v1(v_order.id,v_order.idempotency_key);
  if v_result->>'ok' is distinct from 'true' then
    return jsonb_build_object('ok',false,'error_code','CONVERSATION_NOT_AVAILABLE');
  end if;
  if v_operation='read' then return v_result; end if;
  v_request := (v_payload->>'idempotencyKey')::uuid;
  if v_request is null then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
  if v_operation='message' then
    select * into v_message from public.messages where provider_event_key='order-reply:'||v_request::text;
    if found and (v_message.conversation_id is distinct from v_conversation.id
      or v_message.content is distinct from trim(v_payload->>'message')) then
      return jsonb_build_object('ok',false,'error_code','IDEMPOTENCY_CONFLICT');
    end if;
    v_result := public.submit_order_message_v1(v_order.id,v_order.idempotency_key,v_payload->>'message',v_request);
  else
    if p_base64 is null or length(p_base64)>4194304 then return jsonb_build_object('ok',false,'error_code','RECEIPT_INVALID'); end if;
    begin v_bytes := decode(p_base64,'base64');
    exception when data_exception then return jsonb_build_object('ok',false,'error_code','RECEIPT_INVALID'); end;
    if octet_length(v_bytes) not between 16 and 3145728
      or v_payload->>'proofSha256' is distinct from encode(extensions.digest(v_bytes,'sha256'),'hex') then
      return jsonb_build_object('ok',false,'error_code','RECEIPT_INVALID');
    end if;
    select * into v_receipt from k2_private.order_payment_receipts where order_id=v_order.id and request_key=v_request;
    if found then
      if v_receipt.contents is distinct from v_bytes or v_receipt.payment_reference is distinct from trim(v_payload->>'paymentReference')
        or v_receipt.media_type is distinct from v_payload->>'mediaType' then
        return jsonb_build_object('ok',false,'error_code','IDEMPOTENCY_CONFLICT');
      end if;
      return jsonb_build_object('ok',true,'received',true);
    end if;
    -- Fresh canonical charge projection is mandatory; old cached totals cannot permit payment.
    if v_result->>'delivery_review_required' is distinct from 'false'
      or coalesce(v_result->>'shipping_quote_status','') not in ('customer_confirmed','platform_charged','waived')
      or v_result->>'total_amount' is null
      or (v_result->>'total_amount')::numeric<0
      or coalesce(v_order.payment_status,'') not in ('awaiting_instructions','evidence_submitted','failed')
      or coalesce(v_order.status,'') not in ('submitted','confirmed')
      or coalesce(v_order.customer_note,'') like '[Payment: Cash on Delivery (COD)]%' then
      return jsonb_build_object('ok',false,'error_code','DELIVERY_REVIEW_REQUIRED');
    end if;
    v_result := public.submit_order_payment_receipt_v1(v_order.id,v_order.idempotency_key,
      v_payload->>'paymentReference',v_payload->>'mediaType',p_base64,v_request);
  end if;
  if v_result->>'ok' is distinct from 'true' then
    return jsonb_build_object('ok',false,'error_code',coalesce(v_result->>'error','REQUEST_REJECTED'));
  end if;
  return jsonb_build_object('ok',true,'received',true);
end;
$$;
revoke all on function public.guest_order_conversation_v1(bigint,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.guest_order_conversation_v1(bigint,uuid,text,text,text,text,text) to anon;
notify pgrst, 'reload schema';
commit;
