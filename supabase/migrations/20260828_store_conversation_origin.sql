-- MAP-027 — where a guest conversation came from.
--
-- A question asked at a shelf in the virtual store and a question asked from
-- the contact form both landed in the admin inbox as an identical "Website"
-- row. Staff answering them could not tell that one customer was standing in
-- front of a specific product, which is exactly the context that makes the
-- answer useful.
--
-- This records the originating surface on the conversation so the inbox can
-- show it.
--
-- The function signature is deliberately unchanged. The origin travels inside
-- the already-signed payload text, so the existing HMAC verification, the
-- argument list, and every grant on this function stay exactly as they were —
-- there is no new surface to re-audit, and no window where the old grants are
-- dropped and re-added.
--
-- The value is constrained here as well as at the BFF. The BFF is the only
-- caller today, but a platform label that staff rely on to judge context must
-- not be writable as free text by whatever calls this next.

create or replace function public.start_guest_conversation_v1(
  p_timestamp bigint,
  p_nonce uuid,
  p_payload_text text,
  p_ip_hash text,
  p_signature text,
  p_guest_grant_hash text default null
)
returns table(
  ok boolean, error_code text, retry_after_seconds integer,
  conversation_reference text, status text, created_at timestamptz,
  guest_grant_token text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_identity record;
  v_conversation public.conversations;
  v_message public.messages;
  v_receipt k2_private.guest_conversation_receipts;
  v_ip bytea;
  v_contact bytea;
  v_rate record;
  v_payload_hash bytea;
  v_existing_hash bytea;
  v_key uuid;
  v_email text;
  v_phone text;
  v_origin text;
  v_platform text;
  v_source_kind text;
begin
  if not k2_private.verify_guest_bff_request('guest_start',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature) then
    return query select false,'REQUEST_REPLAYED',0,null::text,null::text,null::timestamptz,null::text; return;
  end if;
  v_payload := p_payload_text::jsonb;
  v_email := lower(trim(coalesce(v_payload->>'email','')));
  v_phone := regexp_replace(coalesce(v_payload->>'phone',''),'[^0-9+]','','g');
  if length(trim(coalesce(v_payload->>'customerName',''))) not between 1 and 140
     or length(trim(coalesce(v_payload->>'message',''))) not between 2 and 2000
     or (v_email='' and v_phone='')
     or (v_email<>'' and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
     or (v_phone<>'' and length(regexp_replace(v_phone,'[^0-9]','','g')) < 7)
     or coalesce(v_payload->>'idempotencyKey','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return query select false,'REQUEST_INVALID',0,null::text,null::text,null::timestamptz,null::text; return;
  end if;

  -- An unrecognised or absent origin is the plain storefront. A client that
  -- predates this column keeps working and is labelled honestly.
  v_origin := coalesce(v_payload->>'origin','storefront');
  if v_origin not in ('storefront','virtual_store') then
    return query select false,'REQUEST_INVALID',0,null::text,null::text,null::timestamptz,null::text; return;
  end if;
  if v_origin = 'virtual_store' then
    v_platform := 'Virtual Store';
    v_source_kind := 'virtual_store_message';
  else
    v_platform := 'Website';
    v_source_kind := 'website_message';
  end if;

  v_ip := decode(p_ip_hash,'hex');
  v_contact := k2_private.contact_hash(v_payload);
  v_payload_hash := extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256');
  v_key := (v_payload->>'idempotencyKey')::uuid;
  if p_guest_grant_hash ~ '^[0-9a-f]{64}$' then v_existing_hash := decode(p_guest_grant_hash,'hex'); end if;

  select * into v_rate from k2_private.consume_guest_rate('guest_start','ip',v_ip,900,5);
  if not v_rate.allowed then
    return query select false,'RATE_LIMITED',v_rate.retry_after_seconds,null::text,null::text,null::timestamptz,null::text; return;
  end if;
  select * into v_rate from k2_private.consume_guest_rate('guest_start','contact',v_contact,3600,5);
  if not v_rate.allowed then
    return query select false,'RATE_LIMITED',v_rate.retry_after_seconds,null::text,null::text,null::timestamptz,null::text; return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_key::text,0));
  select * into v_receipt from k2_private.guest_conversation_receipts
  where idempotency_key=v_key;
  if found then
    if v_receipt.payload_hash is distinct from v_payload_hash then
      return query select false,'IDEMPOTENCY_CONFLICT',0,null::text,null::text,null::timestamptz,null::text;
    else
      select * into v_conversation from public.conversations where id=v_receipt.conversation_id;
      return query select true,null::text,0,v_conversation.guest_reference,
        v_conversation.status,v_conversation.created_at,null::text;
    end if;
    return;
  end if;

  -- Identity resolution keeps the original kind so a customer who writes from
  -- the store and from the contact form is still one person, not two.
  select * into v_identity from k2_private.resolve_guest_identity(
    v_payload,'website_message',v_existing_hash
  );
  insert into public.conversations(
    customer_id,customer_name,customer_email,customer_phone,platform,status,
    source_kind,source_id,unread_count,last_inbound_at,response_due_at
  ) values (
    v_identity.customer_id,trim(v_payload->>'customerName'),nullif(v_email,''),nullif(v_phone,''),
    v_platform,'Open',v_source_kind,v_key,1,now(),now()+interval '4 hours'
  ) returning * into v_conversation;
  insert into public.messages(
    conversation_id,sender_type,content,is_draft,delivery_status,provider_event_key,direction
  ) values (
    v_conversation.id,'Customer',trim(v_payload->>'message'),false,'received',
    'guest-start:'||v_key::text,'inbound'
  ) returning * into v_message;
  update public.conversations set last_message_at=v_message.created_at,
    last_inbound_at=v_message.created_at,updated_at=now() where id=v_conversation.id
  returning * into v_conversation;
  insert into public.guest_access_grant_scopes(grant_id,scope_kind,scope_id,permissions)
  values (v_identity.grant_id,'conversation',v_conversation.id,array['read','reply']::text[])
  on conflict do nothing;
  insert into k2_private.guest_conversation_receipts(idempotency_key,payload_hash,conversation_id)
  values (v_key,v_payload_hash,v_conversation.id);

  return query select true,null::text,0,v_conversation.guest_reference,
    v_conversation.status,v_conversation.created_at,v_identity.raw_grant_token;
end;
$$;
