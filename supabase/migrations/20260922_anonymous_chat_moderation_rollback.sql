begin;
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
drop function if exists public.execute_admin_chat_moderation_v1(text,bigint,uuid,uuid,text,text);
drop function if exists public.list_anonymous_chat_moderation_v1();
create or replace function public.prevent_conversation_event_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'Conversation event history is append-only';
end;
$$;
revoke all on function public.prevent_conversation_event_mutation() from public,anon,authenticated;
drop function if exists public.start_guest_conversation_v1(bigint,uuid,text,text,text,text);
drop function if exists public.append_guest_message_v1(bigint,uuid,text,text,text,text);
alter function public.start_guest_conversation_without_moderation_v1(bigint,uuid,text,text,text,text) rename to start_guest_conversation_v1;
alter function public.append_guest_message_without_moderation_v1(bigint,uuid,text,text,text,text) rename to append_guest_message_v1;
grant execute on function public.submit_storefront_chat_v1(text,text,text,uuid,text) to anon,authenticated;
grant execute on function public.start_guest_conversation_v1(bigint,uuid,text,text,text,text) to anon;
grant execute on function public.append_guest_message_v1(bigint,uuid,text,text,text,text) to anon;
drop table if exists k2_private.anonymous_chat_moderation_events;
drop table if exists k2_private.anonymous_chat_deletion_receipts;
drop table if exists k2_private.anonymous_chat_blocks;
drop table if exists k2_private.anonymous_chat_principals;
drop table if exists k2_private.anonymous_chat_delete_authorizations;
notify pgrst,'reload schema';
commit;
