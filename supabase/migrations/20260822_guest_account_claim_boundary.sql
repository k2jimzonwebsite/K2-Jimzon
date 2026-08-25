-- MAP-019: verified guest-to-account claim boundary.
-- Depends on the guest identity and signed submission migrations. Prepared only;
-- do not activate until MAP-017 and the coordinated Storefront BFF cutover pass.

begin;

alter table public.customer_claim_requests
  add column if not exists request_fingerprint bytea;
alter table public.customer_claim_requests
  drop constraint if exists customer_claim_request_fingerprint_check;
alter table public.customer_claim_requests
  add constraint customer_claim_request_fingerprint_check
  check (request_fingerprint is null or octet_length(request_fingerprint) = 32) not valid;

create table if not exists k2_private.guest_account_claim_events (
  id bigint generated always as identity primary key,
  claim_id uuid not null references public.customer_claim_requests(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  contact_point_id uuid not null references public.customer_contact_points(id) on delete restrict,
  outcome text not null check (outcome = 'claimed'),
  created_at timestamptz not null default now()
);
revoke all on table k2_private.guest_account_claim_events from public, anon, authenticated;

create or replace function k2_private.verify_guest_bff_request(
  p_action text, p_timestamp bigint, p_nonce uuid, p_payload_text text,
  p_ip_hash text, p_signature text
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
  if p_action not in (
    'order', 'pasabuy', 'coupon', 'guest_start', 'guest_read', 'guest_reply',
    'account_claim', 'account_read', 'account_reply', 'wholesale_inquiry'
  ) then
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
  from k2_private.guest_bff_secrets where singleton=true;
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
  insert into k2_private.guest_request_nonces(action,nonce,expires_at)
  values (p_action,p_nonce,now()+interval '10 minutes') on conflict do nothing;
  return found;
end;
$$;
revoke all on function k2_private.verify_guest_bff_request(text,bigint,uuid,text,text,text)
  from public,anon,authenticated;

create or replace function public.claim_guest_customer_account_v1(
  p_timestamp bigint,
  p_nonce uuid,
  p_payload_text text,
  p_ip_hash text,
  p_signature text,
  p_guest_grant_hash text
)
returns table(
  ok boolean,
  error_code text,
  retry_after_seconds integer,
  claimed boolean,
  guest_access_revoked boolean,
  linked_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_payload_hash bytea;
  v_claim_token_hash bytea;
  v_claim public.customer_claim_requests;
  v_grant public.guest_access_grants;
  v_contact public.customer_contact_points;
  v_account public.customer_accounts;
  v_auth_email text;
  v_auth_phone text;
  v_auth_contact text;
  v_contact_hash bytea;
  v_contact_secret bytea;
  v_rate record;
begin
  if auth.uid() is null then
    return query select false,'ACCOUNT_AUTH_REQUIRED',0,false,false,null::timestamptz; return;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('account-claim-user:' || auth.uid()::text, 0)
  );
  if not k2_private.verify_guest_bff_request(
    'account_claim',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature
  ) then
    return query select false,'REQUEST_REPLAYED',0,false,false,null::timestamptz; return;
  end if;
  begin
    v_payload := p_payload_text::jsonb;
  exception when others then
    return query select false,'REQUEST_INVALID',0,false,false,null::timestamptz; return;
  end;
  if jsonb_typeof(v_payload) <> 'object'
     or not (v_payload ? 'contactKind' and v_payload ? 'idempotencyKey')
     or exists (select 1 from jsonb_object_keys(v_payload) key
       where key not in ('contactKind','idempotencyKey'))
     or v_payload->>'contactKind' not in ('email','phone')
     or coalesce(v_payload->>'idempotencyKey','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return query select false,'REQUEST_INVALID',0,false,false,null::timestamptz; return;
  end if;
  if p_guest_grant_hash !~ '^[0-9a-f]{64}$' then
    return query select false,'GUEST_ACCESS_REQUIRED',0,false,false,null::timestamptz; return;
  end if;

  v_payload_hash := extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256');
  v_claim_token_hash := extensions.digest(convert_to(
    auth.uid()::text || ':' || lower(v_payload->>'idempotencyKey'),'UTF8'
  ),'sha256');
  select * into v_claim from public.customer_claim_requests
  where token_hash=v_claim_token_hash for update;
  if found then
    if v_claim.requested_user_id<>auth.uid()
       or v_claim.request_fingerprint is distinct from v_payload_hash then
      return query select false,'IDEMPOTENCY_CONFLICT',0,false,false,null::timestamptz; return;
    end if;
    if v_claim.status='consumed' then
      select * into v_account from public.customer_accounts
      where user_id=auth.uid() and customer_id=v_claim.customer_id and status='active';
      if found then
        return query select true,null::text,0,true,true,v_account.linked_at; return;
      end if;
    end if;
    return query select false,'ACCOUNT_IDENTITY_CONFLICT',0,false,false,null::timestamptz; return;
  end if;

  select * into v_grant from public.guest_access_grants
  where token_hash=decode(p_guest_grant_hash,'hex') and status='active'
    and expires_at>now() and (max_uses is null or use_count<max_uses)
  for update;
  if not found then
    return query select false,'GUEST_ACCESS_EXPIRED',0,false,false,null::timestamptz; return;
  end if;
  select * into v_rate from k2_private.consume_guest_rate(
    'account_claim','actor',extensions.digest(convert_to(auth.uid()::text,'UTF8'),'sha256'),3600,10
  );
  if not v_rate.allowed then
    return query select false,'RATE_LIMITED',v_rate.retry_after_seconds,false,false,null::timestamptz; return;
  end if;

  select lower(email), regexp_replace(coalesce(phone,''),'[^0-9+]','','g')
  into v_auth_email,v_auth_phone from auth.users
  where id=auth.uid()
    and case when v_payload->>'contactKind'='email'
      then email_confirmed_at is not null else phone_confirmed_at is not null end;
  if not found then
    return query select false,'ACCOUNT_CONTACT_NOT_VERIFIED',0,false,false,null::timestamptz; return;
  end if;
  v_auth_contact := case when v_payload->>'contactKind'='email'
    then 'email:'||coalesce(v_auth_email,'') else 'phone:'||coalesce(v_auth_phone,'') end;
  select contact_secret into v_contact_secret
  from k2_private.guest_bff_secrets where singleton=true;
  v_contact_hash := extensions.hmac(convert_to(v_auth_contact,'UTF8'),v_contact_secret,'sha256');
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'account-claim-contact:' || encode(v_contact_hash, 'hex'), 0
    )
  );

  select * into v_contact from public.customer_contact_points
  where customer_id=v_grant.customer_id
    and contact_kind=v_payload->>'contactKind'
    and normalized_hash=v_contact_hash and revoked_at is null
  for update;
  if not found then
    return query select false,'CLAIM_CONTACT_MISMATCH',0,false,false,null::timestamptz; return;
  end if;
  if exists (
    select 1 from public.customer_contact_points other
    where other.normalized_hash=v_contact_hash and other.contact_kind=v_contact.contact_kind
      and other.customer_id<>v_grant.customer_id
      and other.verification_status='verified' and other.revoked_at is null
  ) then
    return query select false,'ACCOUNT_IDENTITY_CONFLICT',0,false,false,null::timestamptz; return;
  end if;
  select * into v_account from public.customer_accounts where user_id=auth.uid() for update;
  if found and (v_account.customer_id<>v_grant.customer_id or v_account.status<>'active') then
    return query select false,'ACCOUNT_IDENTITY_CONFLICT',0,false,false,null::timestamptz; return;
  end if;
  if exists (select 1 from public.customer_accounts account
    where account.customer_id=v_grant.customer_id and account.user_id<>auth.uid()) then
    return query select false,'ACCOUNT_IDENTITY_CONFLICT',0,false,false,null::timestamptz; return;
  end if;

  update public.customer_contact_points set
    verification_status='verified',verified_at=coalesce(verified_at,now()),
    verified_by=auth.uid(),updated_at=now()
  where id=v_contact.id;
  insert into public.customer_claim_requests(
    customer_id,contact_point_id,requested_user_id,token_hash,status,expires_at,request_fingerprint
  ) values (
    v_grant.customer_id,v_contact.id,auth.uid(),v_claim_token_hash,'pending',
    now()+interval '30 minutes',v_payload_hash
  ) returning * into v_claim;
  if v_account.user_id is null then
    insert into public.customer_accounts(
      user_id,customer_id,verified_contact_point_id,status,linked_by
    ) values (auth.uid(),v_grant.customer_id,v_contact.id,'active',auth.uid())
    returning * into v_account;
  end if;
  update public.customer_claim_requests set status='consumed',consumed_at=now()
  where id=v_claim.id;
  update public.guest_access_grants set
    status='revoked',revoked_at=now(),revoke_reason='claimed_by_verified_account',
    use_count=use_count+1,last_used_at=now()
  where id=v_grant.id;
  insert into k2_private.guest_account_claim_events(
    claim_id,customer_id,actor_user_id,contact_point_id,outcome
  ) values (v_claim.id,v_grant.customer_id,auth.uid(),v_contact.id,'claimed');
  return query select true,null::text,0,true,true,v_account.linked_at;
end;
$$;

revoke all on function public.claim_guest_customer_account_v1(bigint,uuid,text,text,text,text)
  from public,anon,authenticated;
grant execute on function public.claim_guest_customer_account_v1(bigint,uuid,text,text,text,text)
  to authenticated;

create or replace function public.list_customer_account_history_v1(
  p_timestamp bigint, p_nonce uuid, p_payload_text text,
  p_ip_hash text, p_signature text
)
returns table(
  ok boolean, error_code text, retry_after_seconds integer,
  linked_at timestamptz, orders jsonb, pasabuy_requests jsonb, conversations jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.customer_accounts;
  v_rate record;
begin
  if auth.uid() is null then
    return query select false,'ACCOUNT_AUTH_REQUIRED',0,null::timestamptz,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb; return;
  end if;
  if not k2_private.verify_guest_bff_request(
    'account_read',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature
  ) then
    return query select false,'REQUEST_REPLAYED',0,null::timestamptz,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb; return;
  end if;
  if p_payload_text <> '{}' then
    return query select false,'REQUEST_INVALID',0,null::timestamptz,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb; return;
  end if;
  select * into v_account from public.customer_accounts
  where user_id=auth.uid() and status='active';
  if not found then
    return query select false,'ACCOUNT_NOT_LINKED',0,null::timestamptz,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb; return;
  end if;
  select * into v_rate from k2_private.consume_guest_rate(
    'account_read','actor',extensions.digest(convert_to(auth.uid()::text,'UTF8'),'sha256'),300,60
  );
  if not v_rate.allowed then
    return query select false,'RATE_LIMITED',v_rate.retry_after_seconds,null::timestamptz,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb; return;
  end if;
  return query select true,null::text,0,v_account.linked_at,
    coalesce((select jsonb_agg(jsonb_build_object(
      'public_reference',o.public_reference,'status',o.status,
      'payment_status',o.payment_status,'total_amount',o.total_amount,
      'created_at',o.created_at
    ) order by o.created_at desc) from (
      select * from public.order_requests where customer_id=v_account.customer_id
      order by created_at desc limit 20
    ) o),'[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
      'public_reference',p.public_reference,'status',p.status,
      'item_title',p.item_title,'quantity',p.quantity,'created_at',p.created_at
    ) order by p.created_at desc) from (
      select * from public.pasabuy_requests where customer_id=v_account.customer_id
      order by created_at desc limit 20
    ) p),'[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object(
      'conversation_reference',c.guest_reference,'channel',c.platform::text,
      'status',c.status,'last_message_at',c.last_message_at,
      'messages',coalesce((select jsonb_agg(jsonb_build_object(
        'direction',case when m.sender_type='Customer' then 'inbound' else 'outbound' end,
        'content',m.content,'delivery_status',m.delivery_status,'created_at',m.created_at
      ) order by m.created_at) from (
        select msg.* from public.messages msg where msg.conversation_id=c.id
          and (msg.delivery_status<>'internal_only' or msg.sender_type='Customer')
        order by msg.created_at desc limit 100
      ) m),'[]'::jsonb)
    ) order by c.last_message_at desc) from (
      select * from public.conversations where customer_id=v_account.customer_id
      order by last_message_at desc limit 20
    ) c),'[]'::jsonb);
end;
$$;
revoke all on function public.list_customer_account_history_v1(bigint,uuid,text,text,text)
  from public,anon,authenticated;
grant execute on function public.list_customer_account_history_v1(bigint,uuid,text,text,text)
  to authenticated;

create or replace function public.append_customer_account_message_v1(
  p_timestamp bigint, p_nonce uuid, p_payload_text text,
  p_ip_hash text, p_signature text
)
returns table(ok boolean,error_code text,retry_after_seconds integer,message_status text,created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_account public.customer_accounts;
  v_conversation public.conversations;
  v_message public.messages;
  v_rate record;
  v_key text;
begin
  if auth.uid() is null then
    return query select false,'ACCOUNT_AUTH_REQUIRED',0,null::text,null::timestamptz; return;
  end if;
  if not k2_private.verify_guest_bff_request(
    'account_reply',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature
  ) then
    return query select false,'REQUEST_REPLAYED',0,null::text,null::timestamptz; return;
  end if;
  begin v_payload:=p_payload_text::jsonb;
  exception when others then
    return query select false,'REQUEST_INVALID',0,null::text,null::timestamptz; return;
  end;
  if jsonb_typeof(v_payload)<>'object'
     or not (v_payload ? 'conversationReference' and v_payload ? 'message' and v_payload ? 'idempotencyKey')
     or exists(select 1 from jsonb_object_keys(v_payload) key
       where key not in ('conversationReference','message','idempotencyKey'))
     or coalesce(v_payload->>'conversationReference','') !~ '^CV-[0-9A-F]{16}$'
     or length(trim(coalesce(v_payload->>'message',''))) not between 1 and 2000
     or coalesce(v_payload->>'idempotencyKey','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return query select false,'REQUEST_INVALID',0,null::text,null::timestamptz; return;
  end if;
  select * into v_account from public.customer_accounts
  where user_id=auth.uid() and status='active';
  if not found then
    return query select false,'ACCOUNT_NOT_LINKED',0,null::text,null::timestamptz; return;
  end if;
  select * into v_conversation from public.conversations
  where customer_id=v_account.customer_id
    and guest_reference=v_payload->>'conversationReference';
  if not found then
    return query select false,'CONVERSATION_NOT_AVAILABLE',0,null::text,null::timestamptz; return;
  end if;
  select * into v_rate from k2_private.consume_guest_rate(
    'account_reply','actor',extensions.digest(convert_to(auth.uid()::text,'UTF8'),'sha256'),3600,40
  );
  if not v_rate.allowed then
    return query select false,'RATE_LIMITED',v_rate.retry_after_seconds,null::text,null::timestamptz; return;
  end if;
  v_key:='account:'||auth.uid()::text||':'||lower(v_payload->>'idempotencyKey');
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
    v_conversation.id,'Customer',trim(v_payload->>'message'),false,'received',v_key,'inbound'
  ) returning * into v_message;
  update public.conversations set last_message_at=v_message.created_at,
    last_inbound_at=v_message.created_at,unread_count=unread_count+1,updated_at=now()
  where id=v_conversation.id;
  return query select true,null::text,0,v_message.delivery_status,v_message.created_at;
end;
$$;
revoke all on function public.append_customer_account_message_v1(bigint,uuid,text,text,text)
  from public,anon,authenticated;
grant execute on function public.append_customer_account_message_v1(bigint,uuid,text,text,text)
  to authenticated;

notify pgrst, 'reload schema';
commit;
