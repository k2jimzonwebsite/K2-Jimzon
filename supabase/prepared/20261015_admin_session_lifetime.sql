-- IDEA-20261015-01 / MAP-025. Prepared exact update; owner SQL approval required.
begin;
set local lock_timeout='2s';
set local statement_timeout='10s';
do $guard$
begin
 if encode(extensions.digest(convert_to(pg_get_functiondef('public.execute_admin_session_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure),'UTF8'),'sha256'),'hex') <> 'd26c26c31a85b7f9f5bd7a7a40a9734cb35de0227ba6d3e91a31e898f98a3b4e' then raise exception 'K2_SESSION_LIFETIME_SOURCE_DRIFT'; end if;
end
$guard$;
CREATE OR REPLACE FUNCTION public.execute_admin_session_command_v1(p_action text, p_timestamp bigint, p_nonce uuid, p_idempotency_key uuid, p_payload_text text, p_signature text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
       or v_expires_at <> v_created_at + interval '7 days' then
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
$function$

;
do $postflight$
begin
 if encode(extensions.digest(convert_to(pg_get_functiondef('public.execute_admin_session_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure),'UTF8'),'sha256'),'hex') <> 'cbe4a555286a52597925315072ac5738916ce36167e2148d412404cbb7bee5d6' then raise exception 'K2_SESSION_LIFETIME_POSTFLIGHT_FAILED'; end if;
end
$postflight$;
notify pgrst,'reload schema';
commit;
