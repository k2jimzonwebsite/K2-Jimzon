-- MAP-019: private, signed audit receipts for active Admin TOTP replacement.
-- Activate only with the exact Admin BFF route and K2_MFA_REPLACEMENT_ENABLED.

begin;

do $preflight$
begin
  if to_regclass('k2_private.admin_bff_secrets') is null
     or to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regprocedure('public.is_admin()') is null then
    raise exception 'Admin BFF signing and role foundations must be applied first';
  end if;
end
$preflight$;

create table if not exists k2_private.admin_mfa_replacement_events (
  actor_id uuid not null references auth.users(id) on delete restrict,
  replacement_id uuid not null,
  phase text not null check (phase in ('requested','completed')),
  reason text not null check (char_length(reason) between 3 and 500),
  previous_factor_hash text not null check (previous_factor_hash ~ '^[0-9a-f]{64}$'),
  factor_hash text check (factor_hash is null or factor_hash ~ '^[0-9a-f]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default clock_timestamp(),
  primary key(actor_id,replacement_id,phase),
  check ((phase='requested' and factor_hash is null) or (phase='completed' and factor_hash is not null))
);

create index if not exists admin_mfa_replacement_events_created_idx
  on k2_private.admin_mfa_replacement_events(actor_id,created_at desc);

alter table k2_private.admin_mfa_replacement_events enable row level security;
alter table k2_private.admin_mfa_replacement_events force row level security;
revoke all on table k2_private.admin_mfa_replacement_events from public,anon,authenticated;

create or replace function public.record_admin_mfa_replacement_event_v1(
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
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_payload jsonb;
  v_phase text;
  v_reason text;
  v_previous_hash text;
  v_factor_hash text;
  v_payload_hash text;
  v_existing k2_private.admin_mfa_replacement_events;
  v_recent integer;
begin
  if v_actor is null or not public.is_admin()
     or coalesce(auth.jwt()->>'aal','')<>'aal2'
     or p_action not in ('admin_mfa_replacement_requested','admin_mfa_replacement_completed') then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
  end if;

  v_payload:=p_payload_text::jsonb;
  v_reason:=trim(coalesce(v_payload->>'reason',''));
  v_previous_hash:=coalesce(v_payload->>'previousFactorHash','');
  v_factor_hash:=v_payload->>'factorHash';
  v_phase:=case when p_action='admin_mfa_replacement_requested' then 'requested' else 'completed' end;
  if jsonb_typeof(v_payload)<>'object' or char_length(v_reason) not between 3 and 500
     or v_previous_hash!~'^[0-9a-f]{64}$'
     or (v_phase='requested' and (
       not (v_payload ?& array['reason','previousFactorHash'])
       or (v_payload-array['reason','previousFactorHash'])<>'{}'::jsonb
     ))
     or (v_phase='completed' and (
       not (v_payload ?& array['reason','previousFactorHash','factorHash'])
       or (v_payload-array['reason','previousFactorHash','factorHash'])<>'{}'::jsonb
       or coalesce(v_factor_hash,'')!~'^[0-9a-f]{64}$'
     )) then
    raise exception using errcode='22023',message='K2_ADMIN_MFA_REPLACEMENT_INVALID';
  end if;

  if v_phase='completed' and not exists(
    select 1 from k2_private.admin_mfa_replacement_events e
    where e.actor_id=v_actor and e.replacement_id=p_idempotency_key
      and e.phase='requested' and e.reason=v_reason
      and e.previous_factor_hash=v_previous_hash
  ) then
    raise exception using errcode='23514',message='K2_ADMIN_MFA_REPLACEMENT_REQUEST_REQUIRED';
  end if;

  v_payload_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  select * into v_existing
  from k2_private.admin_mfa_replacement_events
  where actor_id=v_actor and replacement_id=p_idempotency_key and phase=v_phase;
  if found then
    if v_existing.payload_hash<>v_payload_hash then
      raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('recorded',true,'replayed',true,'phase',v_phase);
  end if;

  if v_phase='requested' then
    select count(*)::integer into v_recent
    from k2_private.admin_mfa_replacement_events
    where actor_id=v_actor and phase='requested' and created_at>now()-interval '1 hour';
    if v_recent>=5 then
      raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED';
    end if;
  end if;

  insert into k2_private.admin_mfa_replacement_events(
    actor_id,replacement_id,phase,reason,previous_factor_hash,factor_hash,payload_hash
  ) values(
    v_actor,p_idempotency_key,v_phase,v_reason,v_previous_hash,v_factor_hash,v_payload_hash
  );
  return jsonb_build_object('recorded',true,'replayed',false,'phase',v_phase);
exception when invalid_text_representation then
  raise exception using errcode='22023',message='K2_ADMIN_MFA_REPLACEMENT_INVALID';
end;
$$;

revoke all on function public.record_admin_mfa_replacement_event_v1(
  text,bigint,uuid,uuid,text,text
) from public,anon;
grant execute on function public.record_admin_mfa_replacement_event_v1(
  text,bigint,uuid,uuid,text,text
) to authenticated;

notify pgrst,'reload schema';
commit;
