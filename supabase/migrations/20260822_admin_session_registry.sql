-- K2 Jimzon Admin BOS: durable, owner-bound session registry and revocation.
-- Prepared only. Apply after the MAP-016 credential gate and the MAP-017
-- database-security migration sequence have permanent production evidence.

begin;

create schema if not exists k2_private;
revoke all on schema k2_private from public, anon, authenticated;

create table if not exists k2_private.admin_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_session_id uuid not null unique,
  created_at timestamptz not null,
  last_seen_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  revoked_reason text,
  check (expires_at > created_at),
  check (last_seen_at >= created_at and last_seen_at <= expires_at),
  check (revoked_reason is null or char_length(revoked_reason) between 3 and 160),
  check ((revoked_at is null) = (revoked_reason is null))
);
revoke all on table k2_private.admin_sessions from public, anon, authenticated;
-- Defence in depth. The revoke above already denies anon/authenticated at the
-- privilege layer, and access is mediated only by SECURITY DEFINER functions, so
-- no policy is attached. RLS is still enabled and forced so that a future grant
-- (for example a "my active sessions" self-service view) cannot accidentally
-- expose every staff member's session rows without a row filter. This matches
-- the pattern already used by 20260822_security_event_boundary.sql.
alter table k2_private.admin_sessions enable row level security;
alter table k2_private.admin_sessions force row level security;
create index if not exists admin_sessions_user_active_idx
  on k2_private.admin_sessions (user_id, expires_at desc)
  where revoked_at is null;

create table if not exists k2_private.admin_session_events (
  event_id bigint generated always as identity primary key,
  actor_id uuid not null,
  session_id uuid not null,
  event_type text not null check (event_type in (
    'session_registered', 'session_validation_denied',
    'session_revoked_one', 'session_revoked_all'
  )),
  outcome text not null check (outcome in ('succeeded', 'denied', 'unchanged')),
  reason_code text not null check (reason_code in (
    'authentication_completed', 'missing_expired_or_revoked',
    'provider_session_inactive', 'staff_requested', 'already_inactive'
  )),
  occurred_at timestamptz not null default now()
);
revoke all on table k2_private.admin_session_events from public, anon, authenticated;
alter table k2_private.admin_session_events enable row level security;
alter table k2_private.admin_session_events force row level security;
create index if not exists admin_session_events_actor_time_idx
  on k2_private.admin_session_events (actor_id, occurred_at desc);

-- Cross-action budgets close the gap left by the command-specific receipt
-- limits. The actor budget contains a compromised staff session while the
-- global budget protects the shared database/BFF capacity from many otherwise
-- valid sessions. Rows contain no request content, network identifiers, or
-- credentials and expire from the working set after one day.
create table if not exists k2_private.admin_request_rate_buckets (
  scope text not null check (scope in ('actor', 'global')),
  subject text not null check (char_length(subject) between 1 and 64),
  bucket_start timestamptz not null,
  hit_count integer not null default 1 check (hit_count > 0),
  primary key (scope, subject, bucket_start)
);
revoke all on table k2_private.admin_request_rate_buckets from public, anon, authenticated;
alter table k2_private.admin_request_rate_buckets enable row level security;
alter table k2_private.admin_request_rate_buckets force row level security;

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
  v_bucket_start timestamptz;
  v_actor_hits integer;
  v_global_hits integer;
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
    'admin_session_register', 'admin_session_validate',
    'admin_session_revoke_current', 'admin_session_revoke_one', 'admin_session_revoke_all',
    'admin_session_list',
    'catalog_import_chunk',
    'wholesale_inquiry_review',
    'product_media_upload', 'product_media_assign', 'product_media_cleanup_complete',
    'product_media_orphan_cleanup', 'product_media_orphan_cleanup_complete',
    'globe_config_update','review_create','review_update','review_publish','review_withdraw',
    'supplier_create',
    'channel_internal_event_verify',
    'staff_role_change','admin_delete_pin_set',
    'product_master_update','product_master_status','product_master_delete'
  ) then
    raise exception using errcode='22023', message='K2_ADMIN_ACTION_INVALID';
  end if;
  if p_payload_text is null or octet_length(convert_to(p_payload_text, 'UTF8')) >
       (case when p_action='catalog_import_chunk' then 1048576 else 16384 end)
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

  delete from k2_private.admin_request_nonces where expires_at <= now();
  insert into k2_private.admin_request_nonces(actor_id, action, nonce, expires_at)
  values (v_actor, p_action, p_nonce, now() + interval '10 minutes')
  on conflict do nothing;
  return found;
end;
$$;
revoke all on function k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)
  from public, anon, authenticated;

create or replace function public.execute_admin_session_command_v1(
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
  v_session_id uuid;
  v_provider_session_id uuid;
  v_reason text;
  v_created_at timestamptz;
  v_expires_at timestamptz;
  v_count integer;
  v_payload_hash text;
  v_existing k2_private.admin_command_receipts;
  v_inserted integer;
  v_result jsonb;
begin
  if not k2_private.verify_admin_bff_request(
    p_action, p_timestamp, p_nonce, p_idempotency_key, p_payload_text, p_signature
  ) then
    raise exception using errcode='28000', message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  if p_action not in (
    'admin_session_register', 'admin_session_validate',
    'admin_session_revoke_current', 'admin_session_revoke_one',
    'admin_session_revoke_all', 'admin_session_list'
  ) then
    raise exception using errcode='22023', message='K2_ADMIN_SESSION_ACTION_INVALID';
  end if;
  v_payload := p_payload_text::jsonb;
  if jsonb_typeof(v_payload) <> 'object'
     or not (v_payload ? 'sessionId')
     or jsonb_typeof(v_payload->'sessionId') <> 'string' then
    raise exception using errcode='22023', message='K2_ADMIN_SESSION_PAYLOAD_INVALID';
  end if;
  v_session_id := (v_payload->>'sessionId')::uuid;
  begin
    v_provider_session_id := nullif(auth.jwt()->>'session_id', '')::uuid;
  exception when invalid_text_representation then
    raise exception using errcode='28000', message='K2_ADMIN_PROVIDER_SESSION_INVALID';
  end;

  select count(*)::integer into v_count
  from k2_private.admin_request_nonces
  where actor_id = v_actor and action = p_action and used_at > now() - interval '1 minute';
  if v_count > (case when p_action = 'admin_session_validate' then 300 else 30 end) then
    raise exception using errcode='54000', message='K2_ADMIN_RATE_LIMITED';
  end if;

  if p_action = 'admin_session_register' then
    if v_payload <> jsonb_build_object(
      'sessionId', v_payload->'sessionId', 'createdAt', v_payload->'createdAt',
      'expiresAt', v_payload->'expiresAt'
    ) then
      raise exception using errcode='22023', message='K2_ADMIN_SESSION_PAYLOAD_INVALID';
    end if;
    v_created_at := to_timestamp((v_payload->>'createdAt')::double precision / 1000.0);
    v_expires_at := to_timestamp((v_payload->>'expiresAt')::double precision / 1000.0);
    if abs(extract(epoch from (clock_timestamp() - v_created_at))) > 300
       or v_expires_at <> v_created_at + interval '8 hours' then
      raise exception using errcode='22023', message='K2_ADMIN_SESSION_LIFETIME_INVALID';
    end if;
    if v_provider_session_id is null or not exists (
      select 1 from auth.sessions where id=v_provider_session_id and user_id=v_actor
    ) then
      raise exception using errcode='28000', message='K2_ADMIN_PROVIDER_SESSION_INACTIVE';
    end if;
    insert into k2_private.admin_sessions(
      session_id, user_id, provider_session_id, created_at, last_seen_at, expires_at
    ) values (v_session_id, v_actor, v_provider_session_id, v_created_at, v_created_at, v_expires_at)
    on conflict (session_id) do nothing;
    if not exists (
      select 1 from k2_private.admin_sessions
      where session_id = v_session_id and user_id = v_actor
        and provider_session_id = v_provider_session_id
        and created_at = v_created_at and expires_at = v_expires_at and revoked_at is null
    ) then
      raise exception using errcode='23505', message='K2_ADMIN_SESSION_CONFLICT';
    end if;
    insert into k2_private.admin_session_events(
      actor_id, session_id, event_type, outcome, reason_code
    ) values (
      v_actor, v_session_id, 'session_registered', 'succeeded', 'authentication_completed'
    );
    return jsonb_build_object('registered', true, 'sessionId', v_session_id);
  end if;

  if p_action in ('admin_session_validate', 'admin_session_list') then
    if v_payload <> jsonb_build_object('sessionId', v_payload->'sessionId') then
      raise exception using errcode='22023', message='K2_ADMIN_SESSION_PAYLOAD_INVALID';
    end if;
    if v_provider_session_id is null or not exists (
      select 1 from auth.sessions where id=v_provider_session_id and user_id=v_actor
    ) then
      update k2_private.admin_sessions
      set revoked_at=clock_timestamp(),revoked_reason='Provider session inactive'
      where session_id=v_session_id and user_id=v_actor and revoked_at is null;
      insert into k2_private.admin_session_events(
        actor_id,session_id,event_type,outcome,reason_code
      ) values (
        v_actor,v_session_id,'session_validation_denied','denied','provider_session_inactive'
      );
      return jsonb_build_object('active',false);
    end if;
    if not exists (
      select 1 from k2_private.admin_sessions
      where session_id = v_session_id and user_id = v_actor
        and provider_session_id = v_provider_session_id
        and revoked_at is null and expires_at > now()
    ) then
      insert into k2_private.admin_session_events(
        actor_id, session_id, event_type, outcome, reason_code
      ) values (
        v_actor, v_session_id, 'session_validation_denied', 'denied',
        'missing_expired_or_revoked'
      );
      return jsonb_build_object('active', false);
    end if;
    update k2_private.admin_sessions set last_seen_at = clock_timestamp()
    where session_id = v_session_id and user_id = v_actor;
    if p_action = 'admin_session_list' then
      return jsonb_build_object(
        'active', true,
        'sessions', coalesce((
          select jsonb_agg(jsonb_build_object(
            'sessionId', session_id, 'current', session_id = v_session_id,
            'createdAt', created_at, 'lastSeenAt', last_seen_at, 'expiresAt', expires_at
          ) order by last_seen_at desc)
          from k2_private.admin_sessions
          where user_id = v_actor and revoked_at is null and expires_at > now()
        ), '[]'::jsonb)
      );
    end if;
    return jsonb_build_object('active', true);
  end if;

  if v_payload <> jsonb_build_object(
    'sessionId', v_payload->'sessionId', 'reason', v_payload->'reason'
  ) then
    raise exception using errcode='22023', message='K2_ADMIN_SESSION_PAYLOAD_INVALID';
  end if;
  v_reason := btrim(v_payload->>'reason');
  if char_length(v_reason) not between 3 and 160 then
    raise exception using errcode='22023', message='K2_ADMIN_SESSION_REASON_INVALID';
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
    if v_existing.result is null then
      raise exception using errcode='55000', message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;
  if not exists (
    select 1 from k2_private.admin_sessions
    where session_id = v_session_id and user_id = v_actor and revoked_at is null
  ) then
    v_result := jsonb_build_object('revoked', false);
    insert into k2_private.admin_session_events(
      actor_id, session_id, event_type, outcome, reason_code
    ) values (
      v_actor, v_session_id,
      case when p_action = 'admin_session_revoke_all'
        then 'session_revoked_all' else 'session_revoked_one' end,
      'unchanged', 'already_inactive'
    );
    update k2_private.admin_command_receipts
    set result = v_result, completed_at = now()
    where actor_id = v_actor and action = p_action and idempotency_key = p_idempotency_key;
    return v_result;
  end if;
  if p_action in ('admin_session_revoke_current', 'admin_session_revoke_one') then
    update k2_private.admin_sessions
    set revoked_at = clock_timestamp(), revoked_reason = v_reason
    where session_id = v_session_id and user_id = v_actor and revoked_at is null;
  else
    update k2_private.admin_sessions
    set revoked_at = clock_timestamp(), revoked_reason = v_reason
    where user_id = v_actor and revoked_at is null;
  end if;
  insert into k2_private.admin_session_events(
    actor_id, session_id, event_type, outcome, reason_code
  ) values (
    v_actor, v_session_id,
    case when p_action = 'admin_session_revoke_all'
      then 'session_revoked_all' else 'session_revoked_one' end,
    'succeeded', 'staff_requested'
  );
  v_result := jsonb_build_object('revoked', true);
  update k2_private.admin_command_receipts
  set result = v_result, completed_at = now()
  where actor_id = v_actor and action = p_action and idempotency_key = p_idempotency_key;
  return v_result;
end;
$$;
revoke all on function public.execute_admin_session_command_v1(text,bigint,uuid,uuid,text,text)
  from public, anon;
grant execute on function public.execute_admin_session_command_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

commit;
