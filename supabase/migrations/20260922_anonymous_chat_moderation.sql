-- MAP-019 / MAP-020 / MAP-027 — anonymous website-chat moderation.
-- IP addresses never enter the database. The Storefront BFF supplies only its
-- keyed SHA-256 digest, which is useful for blocking but not for recovering the
-- network address. Account-linked conversations are never eligible for delete.

begin;

create table if not exists k2_private.anonymous_chat_principals (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  ip_hash bytea not null check (octet_length(ip_hash) = 32),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (conversation_id, ip_hash)
);

create table if not exists k2_private.anonymous_chat_blocks (
  id uuid primary key default gen_random_uuid(),
  ip_hash bytea not null unique check (octet_length(ip_hash) = 32),
  last_conversation_reference text,
  reason text not null check (length(trim(reason)) between 1 and 500),
  blocked_by uuid not null references auth.users(id) on delete restrict,
  blocked_at timestamptz not null default now()
);

create table if not exists k2_private.anonymous_chat_deletion_receipts (
  id bigint generated always as identity primary key,
  conversation_id uuid not null,
  guest_reference text,
  source_kind text not null,
  message_count integer not null check (message_count >= 0),
  reason text not null check (length(trim(reason)) between 1 and 500),
  deleted_by uuid not null references auth.users(id) on delete restrict,
  deleted_at timestamptz not null default now()
);

create table if not exists k2_private.anonymous_chat_moderation_events (
  id bigint generated always as identity primary key,
  action text not null check (action in ('block','unblock')),
  block_id uuid not null,
  conversation_id uuid,
  reason text not null check (length(trim(reason)) between 1 and 500),
  actor_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- The existing conversation_events trigger rejects every delete, including a
-- foreign-key cascade. This marker admits only the one reviewed moderation
-- transaction, and is removed before that transaction commits.
create table if not exists k2_private.anonymous_chat_delete_authorizations (
  conversation_id uuid primary key,
  transaction_id bigint not null,
  actor_id uuid not null references auth.users(id) on delete restrict
);

revoke all on table k2_private.anonymous_chat_principals from public, anon, authenticated;
revoke all on table k2_private.anonymous_chat_blocks from public, anon, authenticated;
revoke all on table k2_private.anonymous_chat_deletion_receipts from public, anon, authenticated;
revoke all on table k2_private.anonymous_chat_moderation_events from public, anon, authenticated;
revoke all on table k2_private.anonymous_chat_delete_authorizations from public, anon, authenticated;

create or replace function public.prevent_conversation_event_mutation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='DELETE' and exists (
    select 1 from k2_private.anonymous_chat_delete_authorizations delete_auth
    where delete_auth.conversation_id=old.conversation_id
      and delete_auth.transaction_id=txid_current()
      and delete_auth.actor_id=auth.uid()
  ) then return old; end if;
  raise exception 'Conversation event history is append-only';
end;
$$;
revoke all on function public.prevent_conversation_event_mutation() from public,anon,authenticated;

-- Keep the already-reviewed guest implementations intact and place a block
-- check plus hash association around them. The originals are no longer callable
-- by clients, so there is no bypass around the wrapper.
alter function public.start_guest_conversation_v1(bigint,uuid,text,text,text,text)
  rename to start_guest_conversation_without_moderation_v1;
alter function public.append_guest_message_v1(bigint,uuid,text,text,text,text)
  rename to append_guest_message_without_moderation_v1;
revoke all on function public.start_guest_conversation_without_moderation_v1(bigint,uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.append_guest_message_without_moderation_v1(bigint,uuid,text,text,text,text) from public, anon, authenticated;
-- The pre-BFF direct storefront writer cannot identify a trusted IP. Remove
-- its client grants at the coordinated BFF cutover or blocks are bypassable.
revoke all on function public.submit_storefront_chat_v1(text,text,text,uuid,text) from public,anon,authenticated;

create function public.start_guest_conversation_v1(
  p_timestamp bigint, p_nonce uuid, p_payload_text text, p_ip_hash text,
  p_signature text, p_guest_grant_hash text default null
)
returns table(ok boolean,error_code text,retry_after_seconds integer,conversation_reference text,status text,created_at timestamptz,guest_grant_token text)
language plpgsql security definer set search_path = '' as $$
declare v_result record; v_conversation_id uuid; v_ip bytea;
begin
  if p_ip_hash !~ '^[0-9a-f]{64}$' then
    return query select false,'REQUEST_INVALID',0,null::text,null::text,null::timestamptz,null::text; return;
  end if;
  v_ip := decode(p_ip_hash,'hex');
  if exists(select 1 from k2_private.anonymous_chat_blocks b where b.ip_hash=v_ip) then
    return query select false,'CHAT_BLOCKED',0,null::text,null::text,null::timestamptz,null::text; return;
  end if;
  select * into v_result from public.start_guest_conversation_without_moderation_v1(
    p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature,p_guest_grant_hash
  );
  if v_result.ok then
    select id into v_conversation_id from public.conversations where guest_reference=v_result.conversation_reference;
    insert into k2_private.anonymous_chat_principals(conversation_id,ip_hash)
      values(v_conversation_id,v_ip) on conflict(conversation_id,ip_hash)
      do update set last_seen_at=now();
  end if;
  return query select v_result.ok,v_result.error_code,v_result.retry_after_seconds,
    v_result.conversation_reference,v_result.status,v_result.created_at,v_result.guest_grant_token;
end;
$$;

create function public.append_guest_message_v1(
  p_timestamp bigint, p_nonce uuid, p_payload_text text, p_ip_hash text,
  p_signature text, p_guest_grant_hash text
)
returns table(ok boolean,error_code text,retry_after_seconds integer,message_status text,created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare v_result record; v_conversation_id uuid; v_ip bytea; v_reference text;
begin
  if p_ip_hash !~ '^[0-9a-f]{64}$' then
    return query select false,'REQUEST_INVALID',0,null::text,null::timestamptz; return;
  end if;
  v_ip := decode(p_ip_hash,'hex');
  if exists(select 1 from k2_private.anonymous_chat_blocks b where b.ip_hash=v_ip) then
    return query select false,'CHAT_BLOCKED',0,null::text,null::timestamptz; return;
  end if;
  select * into v_result from public.append_guest_message_without_moderation_v1(
    p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature,p_guest_grant_hash
  );
  if v_result.ok then
    v_reference := p_payload_text::jsonb->>'conversationReference';
    select id into v_conversation_id from public.conversations where guest_reference=v_reference;
    insert into k2_private.anonymous_chat_principals(conversation_id,ip_hash)
      values(v_conversation_id,v_ip) on conflict(conversation_id,ip_hash)
      do update set last_seen_at=now();
  end if;
  return query select v_result.ok,v_result.error_code,v_result.retry_after_seconds,v_result.message_status,v_result.created_at;
end;
$$;

revoke all on function public.start_guest_conversation_v1(bigint,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.start_guest_conversation_v1(bigint,uuid,text,text,text,text) to anon;
revoke all on function public.append_guest_message_v1(bigint,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.append_guest_message_v1(bigint,uuid,text,text,text,text) to anon;

create function public.list_anonymous_chat_moderation_v1()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_role text;
begin
  select role into v_role from public.user_profiles where id=auth.uid();
  if coalesce(v_role,'') not in ('Admin','SuperAdmin') then raise exception 'K2_ADMIN_REQUIRED'; end if;
  return jsonb_build_object(
    'conversations',coalesce((select jsonb_object_agg(c.id::text,jsonb_build_object(
      'eligible', c.source_kind in ('website_message','virtual_store_message')
        and not exists(select 1 from public.customer_accounts a where a.customer_id=c.customer_id),
      'hasPrincipal',exists(select 1 from k2_private.anonymous_chat_principals p where p.conversation_id=c.id),
      'isBlocked',exists(select 1 from k2_private.anonymous_chat_principals p join k2_private.anonymous_chat_blocks b using(ip_hash) where p.conversation_id=c.id)
    )) from public.conversations c where c.source_kind in ('website_message','virtual_store_message')),'{}'::jsonb),
    'activeBlocks',coalesce((select jsonb_agg(jsonb_build_object(
      'id',b.id,'lastConversationReference',b.last_conversation_reference,'reason',b.reason,
      'blockedAt',b.blocked_at,'blockedBy',b.blocked_by
    ) order by b.blocked_at desc) from k2_private.anonymous_chat_blocks b),'[]'::jsonb)
  );
end;
$$;
revoke all on function public.list_anonymous_chat_moderation_v1() from public,anon,authenticated;
grant execute on function public.list_anonymous_chat_moderation_v1() to authenticated;

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
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_secret bytea;
  v_payload_hash text;
  v_expected text;
  v_message text;
  v_bucket_start timestamptz;
  v_actor_hits integer;
  v_global_hits integer;
begin
  if v_actor is null or not public.is_staff() then
    raise exception using errcode='42501',message='K2_ADMIN_ACCESS_REQUIRED';
  end if;
  if coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_AAL2_REQUIRED';
  end if;
  if p_action not in (
    'confirm_order', 'packing_scan', 'payment_status', 'delivery_details',
    'fulfill_order', 'transfer_lot', 'assign_box',
    'inbox_internal_note', 'inbox_mark_read', 'inbox_workflow',
    'inbox_delete_anonymous', 'inbox_block_anonymous', 'inbox_unblock_anonymous',
    'pasabuy_transition', 'pasabuy_quote',
    'intake_session_create', 'intake_session_step', 'intake_draft',
    'intake_inventory', 'intake_publication', 'intake_evidence_register',
    'consignment_create', 'consignment_add_line', 'consignment_scan',
    'consignment_advance', 'consignment_finalize',
    'lots_reconcile', 'lot_clearance',
    'coupon_create', 'coupon_state', 'coupon_archive',
    'admin_session_register', 'admin_session_validate',
    'admin_session_revoke_current', 'admin_session_revoke_one', 'admin_session_revoke_all',
    'admin_session_list', 'catalog_import_chunk', 'wholesale_inquiry_review',
    'admin_mfa_replacement_requested', 'admin_mfa_replacement_completed',
    'product_media_upload', 'product_media_assign', 'product_media_cleanup_complete',
    'product_media_orphan_cleanup', 'product_media_orphan_cleanup_complete',
    'globe_config_update', 'review_create', 'review_update', 'review_publish', 'review_withdraw',
    'supplier_create', 'channel_internal_event_verify',
    'staff_role_change', 'admin_delete_pin_set',
    'product_master_update', 'product_master_status', 'product_master_delete',
    'inbox_send_reply', 'product_knowledge_save', 'ai_spend_controls_update',
    'marketplace_snapshot_stage', 'marketplace_order_fact_stage', 'marketplace_match_decision',
    'marketplace_coverage_override', 'marketplace_fee_estimate_save',
    'owner_close_stock_review_save', 'owner_close_pasabuy_review_save',
    'owner_close_bookkeeping_handoff_save',
    'owner_close_session_save'
  ) then
    raise exception using errcode='22023',message='K2_ADMIN_ACTION_INVALID';
  end if;
  if p_payload_text is null or octet_length(convert_to(p_payload_text,'UTF8')) >
       (case when p_action in ('marketplace_snapshot_stage','marketplace_order_fact_stage') then 4194304
             when p_action='catalog_import_chunk' then 1048576 else 65536 end)
     or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='K2_ADMIN_REQUEST_INVALID';
  end if;
  if abs(extract(epoch from clock_timestamp())::bigint-p_timestamp)>300 then
    raise exception using errcode='28000',message='K2_ADMIN_SIGNATURE_EXPIRED';
  end if;
  select request_secret into v_secret
  from k2_private.admin_bff_secrets where singleton=true;
  if v_secret is null then
    raise exception using errcode='55000',message='K2_ADMIN_BOUNDARY_NOT_CONFIGURED';
  end if;
  v_payload_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  v_message:=p_action||E'\n'||p_timestamp::text||E'\n'||p_nonce::text||E'\n'
    ||v_actor::text||E'\n'||p_idempotency_key::text||E'\n'||v_payload_hash;
  v_expected:=encode(extensions.hmac(convert_to(v_message,'UTF8'),v_secret,'sha256'),'hex');
  if extensions.digest(convert_to(v_expected,'UTF8'),'sha256')
     <>extensions.digest(convert_to(p_signature,'UTF8'),'sha256') then
    raise exception using errcode='28000',message='K2_ADMIN_SIGNATURE_INVALID';
  end if;
  v_bucket_start:=date_trunc('minute',clock_timestamp());
  delete from k2_private.admin_request_rate_buckets
  where bucket_start<v_bucket_start-interval '1 day';
  insert into k2_private.admin_request_rate_buckets(scope,subject,bucket_start,hit_count)
  values('actor',v_actor::text,v_bucket_start,1)
  on conflict(scope,subject,bucket_start) do update
    set hit_count=k2_private.admin_request_rate_buckets.hit_count+1
  returning hit_count into v_actor_hits;
  if v_actor_hits>360 then raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED'; end if;
  insert into k2_private.admin_request_rate_buckets(scope,subject,bucket_start,hit_count)
  values('global','all_admin_requests',v_bucket_start,1)
  on conflict(scope,subject,bucket_start) do update
    set hit_count=k2_private.admin_request_rate_buckets.hit_count+1
  returning hit_count into v_global_hits;
  if v_global_hits>6000 then raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED'; end if;
  delete from k2_private.admin_request_nonces where expires_at<=now();
  insert into k2_private.admin_request_nonces(actor_id,action,nonce,expires_at)
  values(v_actor,p_action,p_nonce,now()+interval '10 minutes') on conflict do nothing;
  return found;
end;
$$;
revoke all on function k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;

create function public.execute_admin_chat_moderation_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,p_payload_text text,p_signature text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_actor uuid:=auth.uid(); v_role text; v_payload jsonb; v_conversation public.conversations;
  v_reason text; v_result jsonb; v_count integer:=0; v_block record; v_block_id uuid;
  v_payload_hash text; v_existing k2_private.admin_command_receipts;
begin
  if not k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature)
    then raise exception 'K2_ADMIN_REQUEST_REPLAYED'; end if;
  select role into v_role from public.user_profiles where id=v_actor;
  if coalesce(v_role,'') not in ('Admin','SuperAdmin') then raise exception 'K2_ADMIN_REQUIRED'; end if;
  if p_action not in ('inbox_delete_anonymous','inbox_block_anonymous','inbox_unblock_anonymous') then raise exception 'K2_ADMIN_ACTION_INVALID'; end if;
  v_payload:=p_payload_text::jsonb; v_reason:=trim(coalesce(v_payload->>'reason',''));
  if length(v_reason) not between 1 and 500 then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
  v_payload_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  select * into v_existing from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash<>v_payload_hash then raise exception 'K2_ADMIN_IDEMPOTENCY_CONFLICT'; end if;
    if v_existing.result is null then raise exception 'K2_ADMIN_COMMAND_IN_PROGRESS'; end if;
    return v_existing.result;
  end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
    values(v_actor,p_action,p_idempotency_key,v_payload_hash);

  if p_action='inbox_unblock_anonymous' then
    delete from k2_private.anonymous_chat_blocks where id=(v_payload->>'blockId')::uuid returning * into v_block;
    if not found then raise exception 'K2_CHAT_BLOCK_NOT_FOUND'; end if;
    insert into k2_private.anonymous_chat_moderation_events(action,block_id,reason,actor_id)
      values('unblock',v_block.id,v_reason,v_actor);
    v_result:=jsonb_build_object('blockId',v_block.id,'unblocked',true);
  else
    select * into v_conversation from public.conversations where id=(v_payload->>'conversationId')::uuid for update;
    if not found then raise exception 'K2_CONVERSATION_NOT_FOUND'; end if;
    -- Account claim links a customer, not a conversation. Serialize against
    -- that FK insert before checking whether this is still anonymous.
    perform 1 from public.customers where id=v_conversation.customer_id for update;
    if v_conversation.source_kind not in ('website_message','virtual_store_message')
       or exists(select 1 from public.customer_accounts a where a.customer_id=v_conversation.customer_id)
      then raise exception 'K2_ANONYMOUS_CHAT_REQUIRED'; end if;
    if p_action='inbox_block_anonymous' then
      for v_block in select p.ip_hash from k2_private.anonymous_chat_principals p where p.conversation_id=v_conversation.id loop
        insert into k2_private.anonymous_chat_blocks(ip_hash,last_conversation_reference,reason,blocked_by)
          values(v_block.ip_hash,v_conversation.guest_reference,v_reason,v_actor)
          on conflict(ip_hash) do update set reason=excluded.reason,blocked_by=excluded.blocked_by,blocked_at=now()
          returning id into v_block_id;
        insert into k2_private.anonymous_chat_moderation_events(action,block_id,conversation_id,reason,actor_id)
          values('block',v_block_id,v_conversation.id,v_reason,v_actor);
        v_count:=v_count+1;
      end loop;
      if v_count=0 then raise exception 'K2_CHAT_PRINCIPAL_UNAVAILABLE'; end if;
      v_result:=jsonb_build_object('conversationId',v_conversation.id,'blockedPrincipals',v_count);
    else
      select count(*)::integer into v_count from public.messages where conversation_id=v_conversation.id;
      insert into k2_private.anonymous_chat_deletion_receipts(
        conversation_id,guest_reference,source_kind,message_count,reason,deleted_by
      ) values(v_conversation.id,v_conversation.guest_reference,v_conversation.source_kind,v_count,v_reason,v_actor);
      insert into k2_private.anonymous_chat_delete_authorizations(conversation_id,transaction_id,actor_id)
        values(v_conversation.id,txid_current(),v_actor);
      delete from public.guest_access_grant_scopes
        where scope_kind='conversation' and scope_id=v_conversation.id;
      delete from public.conversations where id=v_conversation.id;
      delete from k2_private.anonymous_chat_delete_authorizations
        where conversation_id=v_conversation.id;
      v_result:=jsonb_build_object('conversationId',v_conversation.id,'deleted',true,'messageCount',v_count);
    end if;
  end if;
  update k2_private.admin_command_receipts set result=v_result,completed_at=now()
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;
revoke all on function public.execute_admin_chat_moderation_v1(text,bigint,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.execute_admin_chat_moderation_v1(text,bigint,uuid,uuid,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
