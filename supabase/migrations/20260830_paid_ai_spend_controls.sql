-- Prepared MAP-018/MAP-023 paid-AI budget controls.
-- This migration is intentionally not live. Applying it only creates the
-- owner-controlled configuration/audit boundary; it does not enable a
-- provider, add an API key, or make a paid call.

alter type public.user_role add value if not exists 'SuperAdmin';

begin;

create schema if not exists k2_private;
revoke all on schema k2_private from public, anon, authenticated;

do $$
begin
  if to_regclass('k2_private.admin_command_receipts') is null
     or to_regclass('k2_private.admin_request_rate_buckets') is null
     or to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null then
    raise exception 'MAP-018 preflight: signed Admin command boundary is missing';
  end if;
end;
$$;

-- Extend the shared signer allow-list without weakening any existing action.
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
    'admin_session_list',
    'catalog_import_chunk',
    'wholesale_inquiry_review',
    'admin_mfa_replacement_requested', 'admin_mfa_replacement_completed',
    'product_media_upload', 'product_media_assign', 'product_media_cleanup_complete',
    'product_media_orphan_cleanup', 'product_media_orphan_cleanup_complete',
    'globe_config_update', 'review_create', 'review_update', 'review_publish', 'review_withdraw',
    'supplier_create',
    'channel_internal_event_verify',
    'staff_role_change', 'admin_delete_pin_set',
    'product_master_update', 'product_master_status', 'product_master_delete',
    'inbox_send_reply', 'product_knowledge_save',
    'ai_spend_controls_update'
  ) then
    raise exception using errcode='22023',message='K2_ADMIN_ACTION_INVALID';
  end if;
  if p_payload_text is null or octet_length(convert_to(p_payload_text, 'UTF8')) >
       (case when p_action='catalog_import_chunk' then 1048576 else 16384 end)
     or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='K2_ADMIN_REQUEST_INVALID';
  end if;
  if abs(extract(epoch from clock_timestamp())::bigint - p_timestamp)>300 then
    raise exception using errcode='28000',message='K2_ADMIN_SIGNATURE_EXPIRED';
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

  v_bucket_start := date_trunc('minute', clock_timestamp());
  delete from k2_private.admin_request_rate_buckets
  where bucket_start < v_bucket_start - interval '1 day';
  insert into k2_private.admin_request_rate_buckets(scope, subject, bucket_start, hit_count)
  values ('actor', v_actor::text, v_bucket_start, 1)
  on conflict (scope, subject, bucket_start) do update
    set hit_count = k2_private.admin_request_rate_buckets.hit_count + 1
  returning hit_count into v_actor_hits;
  if v_actor_hits > 360 then
    raise exception using errcode='54000', message='K2_ADMIN_RATE_LIMITED';
  end if;
  insert into k2_private.admin_request_rate_buckets(scope, subject, bucket_start, hit_count)
  values ('global', 'all_admin_requests', v_bucket_start, 1)
  on conflict (scope, subject, bucket_start) do update
    set hit_count = k2_private.admin_request_rate_buckets.hit_count + 1
  returning hit_count into v_global_hits;
  if v_global_hits > 6000 then
    raise exception using errcode='54000', message='K2_ADMIN_RATE_LIMITED';
  end if;

  delete from k2_private.admin_request_nonces where expires_at<=now();
  insert into k2_private.admin_request_nonces(actor_id,action,nonce,expires_at)
  values(v_actor,p_action,p_nonce,now()+interval '10 minutes') on conflict do nothing;
  return found;
end;
$$;
revoke all on function k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text) from public,anon,authenticated;

create table if not exists k2_private.ai_spend_control_config (
  config_key text primary key check (config_key = 'default'),
  paid_path_enabled boolean not null default false,
  provider_model_snapshot text,
  per_product_usd_micros bigint,
  per_session_usd_micros bigint,
  monthly_usd_micros bigint,
  content_confirmation_required boolean not null default true check (content_confirmation_required),
  image_confirmation_required boolean not null default true check (image_confirmation_required),
  manual_fallback_required boolean not null default true check (manual_fallback_required),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid,
  check (provider_model_snapshot is null or char_length(provider_model_snapshot) between 1 and 160),
  check (per_product_usd_micros is null or per_product_usd_micros between 0 and 1000000000000),
  check (per_session_usd_micros is null or per_session_usd_micros between 0 and 1000000000000),
  check (monthly_usd_micros is null or monthly_usd_micros between 0 and 1000000000000),
  check (per_product_usd_micros is null or per_session_usd_micros is null or per_product_usd_micros <= per_session_usd_micros),
  check (per_session_usd_micros is null or monthly_usd_micros is null or per_session_usd_micros <= monthly_usd_micros)
);
revoke all on table k2_private.ai_spend_control_config from public, anon, authenticated;

insert into k2_private.ai_spend_control_config(config_key)
values ('default')
on conflict (config_key) do nothing;

create table if not exists k2_private.ai_spend_control_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null check (action = 'ai_spend_controls_update'),
  request_id uuid not null,
  reason text not null check (char_length(reason) between 8 and 500),
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(actor_id, action, request_id)
);
alter table k2_private.ai_spend_control_events enable row level security;
alter table k2_private.ai_spend_control_events force row level security;
revoke all on table k2_private.ai_spend_control_events from public, anon, authenticated;

create or replace function public.read_admin_ai_spend_controls_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_controls jsonb;
begin
  if not exists (
    select 1 from public.user_profiles
    where id=auth.uid() and role::text in ('Admin','SuperAdmin')
  ) or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501', message='K2_AI_SPEND_SUPER_ADMIN_REQUIRED';
  end if;
  select jsonb_build_object(
    'paidPathEnabled', paid_path_enabled,
    'providerModelSnapshot', provider_model_snapshot,
    'perProductUsdMicros', per_product_usd_micros,
    'perSessionUsdMicros', per_session_usd_micros,
    'monthlyUsdMicros', monthly_usd_micros,
    'contentConfirmationRequired', content_confirmation_required,
    'imageConfirmationRequired', image_confirmation_required,
    'manualFallbackRequired', manual_fallback_required,
    'version', version,
    'updatedAt', updated_at,
    'updatedBy', updated_by
  ) into v_controls
  from k2_private.ai_spend_control_config where config_key='default';
  return coalesce(v_controls, '{}'::jsonb);
end;
$$;
revoke all on function public.read_admin_ai_spend_controls_v1() from public, anon;
grant execute on function public.read_admin_ai_spend_controls_v1() to authenticated;

create or replace function public.execute_admin_ai_spend_controls_command_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid(); v_payload jsonb; v_hash text; v_reason text;
  v_existing k2_private.admin_command_receipts; v_result jsonb;
  v_inserted integer; v_count integer; v_before jsonb; v_after jsonb;
  v_enabled boolean; v_model text; v_product bigint; v_session bigint; v_monthly bigint;
  v_expected_version bigint; v_version bigint; v_confirmation text;
begin
  if p_action<>'ai_spend_controls_update'
     or not exists (select 1 from public.user_profiles where id=v_actor and role::text='SuperAdmin')
     or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_AI_SPEND_SUPER_ADMIN_REQUIRED';
  end if;
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED'; end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object'
     or not (v_payload ?& array[
       'paidPathEnabled','providerModelSnapshot','perProductUsdMicros',
       'perSessionUsdMicros','monthlyUsdMicros','contentConfirmationRequired',
       'imageConfirmationRequired','manualFallbackRequired','expectedVersion',
       'reason','confirmation'
     ])
     or (v_payload - array[
       'paidPathEnabled','providerModelSnapshot','perProductUsdMicros',
       'perSessionUsdMicros','monthlyUsdMicros','contentConfirmationRequired',
       'imageConfirmationRequired','manualFallbackRequired','expectedVersion',
       'reason','confirmation'
     ])<>'{}'::jsonb then
    raise exception using errcode='22023',message='K2_AI_SPEND_INVALID';
  end if;
  v_reason:=trim(v_payload->>'reason');
  v_confirmation:=v_payload->>'confirmation';
  if length(v_reason) not between 8 and 500
     or (v_payload->>'paidPathEnabled') not in ('true','false')
     or (v_payload->>'contentConfirmationRequired')<>'true'
     or (v_payload->>'imageConfirmationRequired')<>'true'
     or (v_payload->>'manualFallbackRequired')<>'true'
     or (v_payload->>'expectedVersion')!~'^[1-9][0-9]*$'
     or v_confirmation not in ('ENABLE_PAID_AI','SAVE_PAID_AI_CONTROLS') then
    raise exception using errcode='22023',message='K2_AI_SPEND_INVALID';
  end if;
  v_enabled:=(v_payload->>'paidPathEnabled')::boolean;
  v_model:=nullif(trim(v_payload->>'providerModelSnapshot'),'');
  v_product:=nullif(v_payload->>'perProductUsdMicros','')::bigint;
  v_session:=nullif(v_payload->>'perSessionUsdMicros','')::bigint;
  v_monthly:=nullif(v_payload->>'monthlyUsdMicros','')::bigint;
  v_expected_version:=(v_payload->>'expectedVersion')::bigint;
  if v_enabled and (v_confirmation<>'ENABLE_PAID_AI' or v_model is null
      or v_product is null or v_product<=0 or v_session is null or v_session<=0
      or v_monthly is null or v_monthly<=0 or v_product>v_session or v_session>v_monthly) then
    raise exception using errcode='22023',message='K2_AI_SPEND_LIMIT_REQUIRED';
  end if;
  if not v_enabled and v_confirmation<>'SAVE_PAID_AI_CONTROLS' then
    raise exception using errcode='22023',message='K2_AI_SPEND_INVALID';
  end if;

  v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash<>v_hash then raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT'; end if;
    if v_existing.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS'; end if;
    return v_existing.result;
  end if;
  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_count>=10 then raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED'; end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS'; end if;

  select jsonb_build_object(
    'paidPathEnabled',paid_path_enabled,'providerModelSnapshot',provider_model_snapshot,
    'perProductUsdMicros',per_product_usd_micros,'perSessionUsdMicros',per_session_usd_micros,
    'monthlyUsdMicros',monthly_usd_micros,'contentConfirmationRequired',content_confirmation_required,
    'imageConfirmationRequired',image_confirmation_required,'manualFallbackRequired',manual_fallback_required,
    'version',version,'updatedAt',updated_at,'updatedBy',updated_by
  ),version into v_before,v_version
  from k2_private.ai_spend_control_config where config_key='default' for update;
  if v_expected_version<>v_version then
    raise exception using errcode='40001',message='K2_AI_SPEND_VERSION_CONFLICT';
  end if;
  update k2_private.ai_spend_control_config set
    paid_path_enabled=v_enabled,provider_model_snapshot=v_model,
    per_product_usd_micros=v_product,per_session_usd_micros=v_session,
    monthly_usd_micros=v_monthly,updated_at=clock_timestamp(),updated_by=v_actor,
    version=v_version+1 where config_key='default';
  select jsonb_build_object(
    'paidPathEnabled',paid_path_enabled,'providerModelSnapshot',provider_model_snapshot,
    'perProductUsdMicros',per_product_usd_micros,'perSessionUsdMicros',per_session_usd_micros,
    'monthlyUsdMicros',monthly_usd_micros,'contentConfirmationRequired',content_confirmation_required,
    'imageConfirmationRequired',image_confirmation_required,'manualFallbackRequired',manual_fallback_required,
    'version',version,'updatedAt',updated_at,'updatedBy',updated_by
  ) into v_after from k2_private.ai_spend_control_config where config_key='default';
  insert into k2_private.ai_spend_control_events(actor_id,action,request_id,reason,before_state,after_state)
  values(v_actor,p_action,p_idempotency_key,v_reason,v_before,v_after);
  v_result:=jsonb_build_object('controls',v_after);
  update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception using errcode='22023',message='K2_AI_SPEND_INVALID';
end;
$$;
revoke all on function public.execute_admin_ai_spend_controls_command_v1(text,bigint,uuid,uuid,text,text) from public, anon;
grant execute on function public.execute_admin_ai_spend_controls_command_v1(text,bigint,uuid,uuid,text,text) to authenticated;

commit;
