-- K2 Jimzon MAP-019/MAP-020: signed guest-commerce BFF boundary.
-- Depends on 20260812_guest_account_identity_and_messaging.sql.
-- This migration installs the new boundary but does not revoke the transitional
-- browser RPCs. Revocation is a coordinated cutover in the companion migration.

begin;

create schema if not exists k2_private;
revoke all on schema k2_private from public, anon, authenticated;

create table if not exists k2_private.guest_bff_secrets (
  singleton boolean primary key default true check (singleton),
  request_secret bytea not null check (octet_length(request_secret) >= 32),
  contact_secret bytea not null check (octet_length(contact_secret) >= 32),
  configured_at timestamptz not null default now()
);
revoke all on table k2_private.guest_bff_secrets from public, anon, authenticated;

create table if not exists k2_private.guest_request_nonces (
  action text not null,
  nonce uuid not null,
  used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (action, nonce)
);
revoke all on table k2_private.guest_request_nonces from public, anon, authenticated;

create table if not exists k2_private.guest_rate_buckets (
  action text not null,
  dimension text not null,
  subject_hash bytea not null,
  bucket_start timestamptz not null,
  window_seconds integer not null,
  hit_count integer not null default 0 check (hit_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (action, dimension, subject_hash, bucket_start)
);
revoke all on table k2_private.guest_rate_buckets from public, anon, authenticated;

alter table public.conversations add column if not exists guest_reference text;
update public.conversations
set guest_reference = 'CV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,16))
where guest_reference is null;
alter table public.conversations alter column guest_reference set default
  ('CV-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)));
alter table public.conversations alter column guest_reference set not null;
create unique index if not exists conversations_guest_reference_uidx
  on public.conversations(guest_reference);
create unique index if not exists messages_guest_idempotency_uidx
  on public.messages(conversation_id,provider_event_key)
  where provider_event_key is not null;

create or replace function k2_private.verify_guest_bff_request(
  p_action text,
  p_timestamp bigint,
  p_nonce uuid,
  p_payload_text text,
  p_ip_hash text,
  p_signature text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret bytea;
  v_payload_hash text;
  v_expected text;
  v_message text;
begin
  if p_action not in ('order', 'pasabuy', 'coupon', 'guest_read', 'guest_reply') then
    raise exception using errcode='22023', message='K2_GUEST_ACTION_INVALID';
  end if;
  if p_payload_text is null or octet_length(convert_to(p_payload_text, 'UTF8')) > 24576 then
    raise exception using errcode='22023', message='K2_GUEST_PAYLOAD_INVALID';
  end if;
  if p_ip_hash !~ '^[0-9a-f]{64}$' or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='28000', message='K2_GUEST_SIGNATURE_INVALID';
  end if;
  if abs(extract(epoch from clock_timestamp())::bigint - p_timestamp) > 300 then
    raise exception using errcode='28000', message='K2_GUEST_SIGNATURE_EXPIRED';
  end if;

  select request_secret into v_secret
  from k2_private.guest_bff_secrets where singleton = true;
  if v_secret is null then
    raise exception using errcode='55000', message='K2_GUEST_BOUNDARY_NOT_CONFIGURED';
  end if;

  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text, 'UTF8'), 'sha256'), 'hex');
  v_message := p_action || E'\n' || p_timestamp::text || E'\n' || p_nonce::text
    || E'\n' || v_payload_hash || E'\n' || p_ip_hash;
  v_expected := encode(extensions.hmac(convert_to(v_message, 'UTF8'), v_secret, 'sha256'), 'hex');
  if extensions.digest(convert_to(v_expected, 'UTF8'), 'sha256')
     <> extensions.digest(convert_to(p_signature, 'UTF8'), 'sha256') then
    raise exception using errcode='28000', message='K2_GUEST_SIGNATURE_INVALID';
  end if;

  delete from k2_private.guest_request_nonces where expires_at <= now();
  insert into k2_private.guest_request_nonces(action, nonce, expires_at)
  values (p_action, p_nonce, now() + interval '10 minutes')
  on conflict do nothing;
  return found;
end;
$$;
revoke all on function k2_private.verify_guest_bff_request(text,bigint,uuid,text,text,text)
  from public, anon, authenticated;

create or replace function k2_private.contact_hash(p_payload jsonb)
returns bytea
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret bytea;
  v_contact text;
begin
  select contact_secret into v_secret
  from k2_private.guest_bff_secrets where singleton = true;
  if v_secret is null then
    raise exception using errcode='55000', message='K2_GUEST_BOUNDARY_NOT_CONFIGURED';
  end if;
  v_contact := case
    when nullif(lower(trim(p_payload->>'email')), '') is not null
      then 'email:' || lower(trim(p_payload->>'email'))
    else 'phone:' || regexp_replace(coalesce(p_payload->>'phone', ''), '[^0-9+]', '', 'g')
  end;
  return extensions.hmac(convert_to(v_contact, 'UTF8'), v_secret, 'sha256');
end;
$$;
revoke all on function k2_private.contact_hash(jsonb) from public, anon, authenticated;

create or replace function k2_private.consume_guest_rate(
  p_action text,
  p_dimension text,
  p_subject_hash bytea,
  p_window_seconds integer,
  p_max_hits integer
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket timestamptz;
  v_hits integer;
begin
  if p_window_seconds not between 60 and 86400 or p_max_hits not between 1 and 10000
     or octet_length(p_subject_hash) <> 32 then
    raise exception using errcode='22023', message='K2_RATE_CONFIGURATION_INVALID';
  end if;
  v_bucket := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );
  insert into k2_private.guest_rate_buckets(
    action, dimension, subject_hash, bucket_start, window_seconds, hit_count
  ) values (p_action, p_dimension, p_subject_hash, v_bucket, p_window_seconds, 1)
  on conflict (action, dimension, subject_hash, bucket_start)
  do update set hit_count = k2_private.guest_rate_buckets.hit_count + 1, updated_at = now()
  returning hit_count into v_hits;

  delete from k2_private.guest_rate_buckets
  where bucket_start < now() - interval '2 days';

  allowed := v_hits <= p_max_hits;
  retry_after_seconds := case when allowed then 0 else greatest(
    1, ceil(extract(epoch from (v_bucket + make_interval(secs => p_window_seconds) - clock_timestamp())))::integer
  ) end;
  return next;
end;
$$;
revoke all on function k2_private.consume_guest_rate(text,text,bytea,integer,integer)
  from public, anon, authenticated;

create or replace function k2_private.resolve_guest_identity(
  p_payload jsonb,
  p_source text,
  p_existing_grant_hash bytea
)
returns table(customer_id uuid, grant_id uuid, raw_grant_token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer_id uuid;
  v_grant_id uuid;
  v_raw text;
  v_email text := nullif(lower(trim(p_payload->>'email')), '');
  v_phone text := nullif(regexp_replace(coalesce(p_payload->>'phone', ''), '[^0-9+]', '', 'g'), '');
  v_hash bytea;
begin
  if p_existing_grant_hash is not null then
    update public.guest_access_grants g
    set use_count = use_count + 1, last_used_at = now()
    where g.token_hash = p_existing_grant_hash
      and g.status = 'active' and g.expires_at > now()
      and (g.max_uses is null or g.use_count < g.max_uses)
    returning g.customer_id, g.id into v_customer_id, v_grant_id;
  end if;

  if v_customer_id is null then
    insert into public.customers(display_name, created_source)
    values (trim(p_payload->>'customerName'), p_source)
    returning id into v_customer_id;

    v_raw := encode(extensions.gen_random_bytes(32), 'hex');
    insert into public.guest_access_grants(customer_id, token_hash, expires_at, max_uses)
    values (v_customer_id, extensions.digest(convert_to(v_raw, 'UTF8'), 'sha256'), now() + interval '30 days', 10000)
    returning id into v_grant_id;
  end if;

  if v_email is not null then
    v_hash := extensions.hmac(convert_to('email:' || v_email, 'UTF8'),
      (select contact_secret from k2_private.guest_bff_secrets where singleton=true), 'sha256');
    if not exists (select 1 from public.customer_contact_points c
      where c.customer_id=v_customer_id and c.contact_kind='email' and c.normalized_hash=v_hash
        and c.revoked_at is null) then
      insert into public.customer_contact_points(
        customer_id, contact_kind, contact_value, normalized_hash, source
      ) values (v_customer_id, 'email', v_email, v_hash, p_source);
    end if;
  end if;
  if v_phone is not null then
    v_hash := extensions.hmac(convert_to('phone:' || v_phone, 'UTF8'),
      (select contact_secret from k2_private.guest_bff_secrets where singleton=true), 'sha256');
    if not exists (select 1 from public.customer_contact_points c
      where c.customer_id=v_customer_id and c.contact_kind='phone' and c.normalized_hash=v_hash
        and c.revoked_at is null) then
      insert into public.customer_contact_points(
        customer_id, contact_kind, contact_value, normalized_hash, source
      ) values (v_customer_id, 'phone', v_phone, v_hash, p_source);
    end if;
  end if;

  customer_id := v_customer_id;
  grant_id := v_grant_id;
  raw_grant_token := v_raw;
  return next;
end;
$$;
revoke all on function k2_private.resolve_guest_identity(jsonb,text,bytea)
  from public, anon, authenticated;

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
revoke all on function public.submit_guest_order_v1(bigint,uuid,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.submit_guest_order_v1(bigint,uuid,text,text,text,text) to anon;

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
  insert into public.guest_access_grant_scopes(grant_id,scope_kind,scope_id,permissions)
  values
    (v_identity.grant_id,'pasabuy_request',v_request.id,array['read']::text[]),
    (v_identity.grant_id,'conversation',v_conversation_id,array['read','reply']::text[])
  on conflict do nothing;

  return query select true, null::text, 0, v_request.public_reference,
    v_request.status, v_request.created_at, v_identity.raw_grant_token;
end;
$$;
revoke all on function public.submit_guest_pasabuy_v1(bigint,uuid,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.submit_guest_pasabuy_v1(bigint,uuid,text,text,text,text) to anon;

create or replace function public.preview_guest_coupon_v1(
  p_timestamp bigint,
  p_nonce uuid,
  p_payload_text text,
  p_ip_hash text,
  p_signature text
)
returns table(
  ok boolean, error_code text, retry_after_seconds integer,
  valid boolean, normalized_code text, discount_amount numeric, message_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_coupon public.coupons;
  v_ip bytea;
  v_rate record;
  v_subtotal numeric;
  v_discount numeric;
begin
  if not k2_private.verify_guest_bff_request('coupon', p_timestamp, p_nonce, p_payload_text, p_ip_hash, p_signature) then
    return query select false, 'REQUEST_REPLAYED', 0, false, null::text, 0::numeric, 'UNAVAILABLE'::text;
    return;
  end if;
  v_payload := p_payload_text::jsonb;
  v_ip := decode(p_ip_hash, 'hex');
  select * into v_rate from k2_private.consume_guest_rate('coupon','ip',v_ip,900,30);
  if not v_rate.allowed then
    return query select false, 'RATE_LIMITED', v_rate.retry_after_seconds,
      false, null::text, 0::numeric, 'RATE_LIMITED'::text;
    return;
  end if;

  v_subtotal := greatest(coalesce((v_payload->>'subtotal')::numeric,0),0);
  select * into v_coupon from public.coupons
  where code=upper(trim(v_payload->>'code')) and is_active=true and archived_at is null
    and starts_at <= now() and (ends_at is null or ends_at > now())
    and (max_redemptions is null or redemption_count < max_redemptions)
  limit 1;
  if not found or v_subtotal < v_coupon.min_spend then
    return query select true, null::text, 0, false, null::text, 0::numeric, 'INVALID_OR_INELIGIBLE'::text;
    return;
  end if;
  v_discount := case when v_coupon.discount_type='percentage'
    then round(v_subtotal*v_coupon.discount_value/100,2)
    else least(v_coupon.discount_value,v_subtotal) end;
  return query select true, null::text, 0, true, v_coupon.code, v_discount, 'VALID'::text;
end;
$$;
revoke all on function public.preview_guest_coupon_v1(bigint,uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.preview_guest_coupon_v1(bigint,uuid,text,text,text) to anon;

create or replace function public.list_guest_conversations_v1(
  p_timestamp bigint,
  p_nonce uuid,
  p_payload_text text,
  p_ip_hash text,
  p_signature text,
  p_guest_grant_hash text
)
returns table(ok boolean,error_code text,retry_after_seconds integer,conversations jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grant public.guest_access_grants;
  v_rate record;
begin
  if not k2_private.verify_guest_bff_request('guest_read',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature) then
    return query select false,'REQUEST_REPLAYED',0,'[]'::jsonb; return;
  end if;
  if p_guest_grant_hash !~ '^[0-9a-f]{64}$' then
    return query select false,'GUEST_ACCESS_REQUIRED',0,'[]'::jsonb; return;
  end if;
  update public.guest_access_grants g set use_count=use_count+1,last_used_at=now()
  where g.token_hash=decode(p_guest_grant_hash,'hex') and g.status='active'
    and g.expires_at>now() and (g.max_uses is null or g.use_count<g.max_uses)
  returning g.* into v_grant;
  if not found then
    return query select false,'GUEST_ACCESS_EXPIRED',0,'[]'::jsonb; return;
  end if;
  select * into v_rate from k2_private.consume_guest_rate(
    'guest_read','grant',v_grant.token_hash,300,60
  );
  if not v_rate.allowed then
    return query select false,'RATE_LIMITED',v_rate.retry_after_seconds,'[]'::jsonb; return;
  end if;
  return query select true,null::text,0,coalesce((
    select jsonb_agg(jsonb_build_object(
      'conversation_reference', scoped.guest_reference,
      'channel', scoped.platform::text,
      'status', scoped.status,
      'last_message_at', scoped.last_message_at,
      'messages', coalesce((
        select jsonb_agg(jsonb_build_object(
          'direction', case when m.sender_type='Customer' then 'inbound' else 'outbound' end,
          'content',m.content,
          'delivery_status',m.delivery_status,
          'created_at',m.created_at
        ) order by m.created_at)
        from (
          select msg.* from public.messages msg
          where msg.conversation_id=scoped.id
            and (msg.delivery_status<>'internal_only' or msg.sender_type='Customer')
          order by msg.created_at desc limit 100
        ) m
      ),'[]'::jsonb)
    ) order by scoped.last_message_at desc)
    from (
      select c.* from public.conversations c
      join public.guest_access_grant_scopes s on s.scope_kind='conversation' and s.scope_id=c.id
      where s.grant_id=v_grant.id and 'read'=any(s.permissions)
      order by c.last_message_at desc limit 20
    ) scoped
  ),'[]'::jsonb);
end;
$$;
revoke all on function public.list_guest_conversations_v1(bigint,uuid,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.list_guest_conversations_v1(bigint,uuid,text,text,text,text) to anon;

create or replace function public.append_guest_message_v1(
  p_timestamp bigint,
  p_nonce uuid,
  p_payload_text text,
  p_ip_hash text,
  p_signature text,
  p_guest_grant_hash text
)
returns table(ok boolean,error_code text,retry_after_seconds integer,message_status text,created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_grant public.guest_access_grants;
  v_conversation public.conversations;
  v_rate record;
  v_message public.messages;
  v_key text;
begin
  if not k2_private.verify_guest_bff_request('guest_reply',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature) then
    return query select false,'REQUEST_REPLAYED',0,null::text,null::timestamptz; return;
  end if;
  v_payload := p_payload_text::jsonb;
  if coalesce(v_payload->>'conversationReference','') !~ '^CV-[0-9A-F]{16}$'
     or length(trim(coalesce(v_payload->>'message',''))) not between 1 and 2000
     or coalesce(v_payload->>'idempotencyKey','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return query select false,'REQUEST_INVALID',0,null::text,null::timestamptz; return;
  end if;
  if p_guest_grant_hash !~ '^[0-9a-f]{64}$' then
    return query select false,'GUEST_ACCESS_REQUIRED',0,null::text,null::timestamptz; return;
  end if;
  update public.guest_access_grants g set use_count=use_count+1,last_used_at=now()
  where g.token_hash=decode(p_guest_grant_hash,'hex') and g.status='active'
    and g.expires_at>now() and (g.max_uses is null or g.use_count<g.max_uses)
  returning g.* into v_grant;
  if not found then
    return query select false,'GUEST_ACCESS_EXPIRED',0,null::text,null::timestamptz; return;
  end if;
  select c.* into v_conversation from public.conversations c
  join public.guest_access_grant_scopes s on s.scope_kind='conversation' and s.scope_id=c.id
  where s.grant_id=v_grant.id and 'reply'=any(s.permissions)
    and c.guest_reference=v_payload->>'conversationReference';
  if not found then
    return query select false,'CONVERSATION_NOT_AVAILABLE',0,null::text,null::timestamptz; return;
  end if;
  select * into v_rate from k2_private.consume_guest_rate(
    'guest_reply','grant',v_grant.token_hash,3600,20
  );
  if not v_rate.allowed then
    return query select false,'RATE_LIMITED',v_rate.retry_after_seconds,null::text,null::timestamptz; return;
  end if;
  v_key := 'guest:' || (v_payload->>'idempotencyKey');
  select * into v_message from public.messages
  where conversation_id=v_conversation.id and provider_event_key=v_key;
  if found then
    if v_message.content is distinct from v_payload->>'message' then
      return query select false,'IDEMPOTENCY_CONFLICT',0,null::text,null::timestamptz;
    else
      return query select true,null::text,0,v_message.delivery_status,v_message.created_at;
    end if;
    return;
  end if;
  insert into public.messages(
    conversation_id,sender_type,content,is_draft,delivery_status,provider_event_key,direction
  ) values (
    v_conversation.id,'Customer',v_payload->>'message',false,'received',v_key,'inbound'
  ) returning * into v_message;
  update public.conversations set last_message_at=v_message.created_at,
    last_inbound_at=v_message.created_at,unread_count=unread_count+1,updated_at=now()
  where id=v_conversation.id;
  return query select true,null::text,0,v_message.delivery_status,v_message.created_at;
end;
$$;
revoke all on function public.append_guest_message_v1(bigint,uuid,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.append_guest_message_v1(bigint,uuid,text,text,text,text) to anon;

notify pgrst, 'reload schema';
commit;
