-- K2 Jimzon MAP-018: durable reconciliation for unregistered private intake evidence.
-- Prepared only. This ledger stores the private path exclusively behind signed,
-- staff/AAL2-only functions so the browser receives only an opaque cleanup id.

begin;

create table if not exists k2_private.product_intake_evidence_cleanup_events (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid not null,
  session_id uuid not null references public.product_intake_sessions(id) on delete restrict,
  registration_request_id uuid not null,
  object_path text not null,
  object_path_hash text not null check (object_path_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending' check (status in ('pending','completed')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  last_attempt_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actor_id, registration_request_id),
  unique (object_path)
);

create index if not exists product_intake_evidence_cleanup_pending_idx
  on k2_private.product_intake_evidence_cleanup_events (created_at, id)
  where status = 'pending';

revoke all on table k2_private.product_intake_evidence_cleanup_events
  from public, anon, authenticated;
alter table k2_private.product_intake_evidence_cleanup_events enable row level security;
alter table k2_private.product_intake_evidence_cleanup_events force row level security;

create or replace function k2_private.verify_admin_bff_cleanup_request(
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
begin
  if v_actor is null or not public.is_staff() then
    raise exception using errcode='42501', message='K2_ADMIN_ACCESS_REQUIRED';
  end if;
  if coalesce(auth.jwt()->>'aal','') <> 'aal2' then
    raise exception using errcode='42501', message='K2_ADMIN_AAL2_REQUIRED';
  end if;
  if p_action not in (
    'intake_evidence_cleanup_pending',
    'intake_evidence_cleanup_retry',
    'intake_evidence_cleanup_complete'
  ) or p_payload_text is null
     or octet_length(convert_to(p_payload_text,'UTF8')) > 4096
     or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023', message='K2_INTAKE_CLEANUP_REQUEST_INVALID';
  end if;
  if abs(extract(epoch from clock_timestamp())::bigint-p_timestamp) > 300 then
    raise exception using errcode='28000', message='K2_ADMIN_SIGNATURE_EXPIRED';
  end if;
  select request_secret into v_secret
  from k2_private.admin_bff_secrets where singleton=true;
  if v_secret is null then
    raise exception using errcode='55000', message='K2_ADMIN_BOUNDARY_NOT_CONFIGURED';
  end if;
  v_payload_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  v_message:=p_action||E'\n'||p_timestamp::text||E'\n'||p_nonce::text
    ||E'\n'||v_actor::text||E'\n'||p_idempotency_key::text||E'\n'||v_payload_hash;
  v_expected:=encode(extensions.hmac(convert_to(v_message,'UTF8'),v_secret,'sha256'),'hex');
  if extensions.digest(convert_to(v_expected,'UTF8'),'sha256')
     <> extensions.digest(convert_to(p_signature,'UTF8'),'sha256') then
    raise exception using errcode='28000', message='K2_ADMIN_SIGNATURE_INVALID';
  end if;
  delete from k2_private.admin_request_nonces where expires_at<=now();
  insert into k2_private.admin_request_nonces(actor_id,action,nonce,expires_at)
  values(v_actor,p_action,p_nonce,now()+interval '10 minutes') on conflict do nothing;
  return found;
end;
$$;
revoke all on function k2_private.verify_admin_bff_cleanup_request(text,bigint,uuid,uuid,text,text)
  from public, anon, authenticated;

create or replace function public.record_admin_product_intake_evidence_cleanup_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid:=auth.uid();
  v_payload jsonb;
  v_session_id uuid;
  v_path text;
  v_hash text;
  v_event k2_private.product_intake_evidence_cleanup_events;
begin
  if p_action<>'intake_evidence_cleanup_pending'
     or not k2_private.verify_admin_bff_cleanup_request(
       p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
     ) then
    raise exception using errcode='28000',message='K2_INTAKE_CLEANUP_REQUEST_REPLAYED';
  end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object'
     or not (v_payload ?& array['sessionId','objectPath','objectPathHash'])
     or (v_payload-array['sessionId','objectPath','objectPathHash'])<>'{}'::jsonb then
    raise exception using errcode='22023',message='K2_INTAKE_CLEANUP_PAYLOAD_INVALID';
  end if;
  v_session_id:=(v_payload->>'sessionId')::uuid;
  v_path:=v_payload->>'objectPath';
  v_hash:=v_payload->>'objectPathHash';
  if v_hash!~'^[0-9a-f]{64}$'
     or v_hash<>encode(extensions.digest(convert_to(v_path,'UTF8'),'sha256'),'hex')
     or v_path!~('^'||v_actor::text||'/'||v_session_id::text||'/[A-Za-z0-9._-]{1,180}$')
     or not exists(
       select 1 from public.product_intake_sessions s
       where s.id=v_session_id and s.created_by=v_actor
     ) then
    raise exception using errcode='22023',message='K2_INTAKE_CLEANUP_PAYLOAD_INVALID';
  end if;
  insert into k2_private.product_intake_evidence_cleanup_events(
    actor_id,session_id,registration_request_id,object_path,object_path_hash
  ) values(v_actor,v_session_id,p_idempotency_key,v_path,v_hash)
  on conflict(actor_id,registration_request_id) do nothing;
  select * into v_event from k2_private.product_intake_evidence_cleanup_events
  where actor_id=v_actor and registration_request_id=p_idempotency_key;
  if not found or v_event.session_id<>v_session_id or v_event.object_path_hash<>v_hash
     or v_event.object_path<>v_path then
    raise exception using errcode='22023',message='K2_INTAKE_CLEANUP_IDEMPOTENCY_CONFLICT';
  end if;
  return jsonb_build_object('cleanupId',v_event.id,'status',v_event.status);
exception when invalid_text_representation then
  raise exception using errcode='22023',message='K2_INTAKE_CLEANUP_PAYLOAD_INVALID';
end;
$$;

create or replace function public.claim_admin_product_intake_evidence_cleanup_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid:=auth.uid();
  v_payload jsonb;
  v_cleanup_id uuid;
  v_event k2_private.product_intake_evidence_cleanup_events;
begin
  if p_action<>'intake_evidence_cleanup_retry'
     or not k2_private.verify_admin_bff_cleanup_request(
       p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
     ) then
    raise exception using errcode='28000',message='K2_INTAKE_CLEANUP_REQUEST_REPLAYED';
  end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' or not (v_payload ? 'cleanupId')
     or (v_payload-array['cleanupId'])<>'{}'::jsonb then
    raise exception using errcode='22023',message='K2_INTAKE_CLEANUP_PAYLOAD_INVALID';
  end if;
  v_cleanup_id:=(v_payload->>'cleanupId')::uuid;
  select * into v_event from k2_private.product_intake_evidence_cleanup_events
  where id=v_cleanup_id and actor_id=v_actor for update;
  if not found then
    raise exception using errcode='42501',message='K2_INTAKE_CLEANUP_NOT_FOUND';
  end if;
  if v_event.status='completed' then
    return jsonb_build_object('cleanupId',v_event.id,'status','completed');
  end if;
  if v_event.attempt_count>=10 then
    raise exception using errcode='54000',message='K2_INTAKE_CLEANUP_ATTEMPTS_EXHAUSTED';
  end if;
  update k2_private.product_intake_evidence_cleanup_events
  set attempt_count=attempt_count+1,last_attempt_at=clock_timestamp(),updated_at=clock_timestamp()
  where id=v_event.id;
  return jsonb_build_object(
    'cleanupId',v_event.id,'status','pending','objectPath',v_event.object_path,
    'objectPathHash',v_event.object_path_hash
  );
exception when invalid_text_representation then
  raise exception using errcode='22023',message='K2_INTAKE_CLEANUP_PAYLOAD_INVALID';
end;
$$;

create or replace function public.complete_admin_product_intake_evidence_cleanup_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid:=auth.uid();
  v_payload jsonb;
  v_cleanup_id uuid;
  v_hash text;
  v_event k2_private.product_intake_evidence_cleanup_events;
begin
  if p_action<>'intake_evidence_cleanup_complete'
     or not k2_private.verify_admin_bff_cleanup_request(
       p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
     ) then
    raise exception using errcode='28000',message='K2_INTAKE_CLEANUP_REQUEST_REPLAYED';
  end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object'
     or not (v_payload ?& array['cleanupId','objectPathHash'])
     or (v_payload-array['cleanupId','objectPathHash'])<>'{}'::jsonb then
    raise exception using errcode='22023',message='K2_INTAKE_CLEANUP_PAYLOAD_INVALID';
  end if;
  v_cleanup_id:=(v_payload->>'cleanupId')::uuid;
  v_hash:=v_payload->>'objectPathHash';
  select * into v_event from k2_private.product_intake_evidence_cleanup_events
  where id=v_cleanup_id and actor_id=v_actor for update;
  if not found or v_hash!~'^[0-9a-f]{64}$' or v_event.object_path_hash<>v_hash then
    raise exception using errcode='42501',message='K2_INTAKE_CLEANUP_NOT_FOUND';
  end if;
  update k2_private.product_intake_evidence_cleanup_events
  set status='completed',completed_at=coalesce(completed_at,clock_timestamp()),updated_at=clock_timestamp()
  where id=v_event.id;
  return jsonb_build_object('cleanupId',v_event.id,'status','completed');
exception when invalid_text_representation then
  raise exception using errcode='22023',message='K2_INTAKE_CLEANUP_PAYLOAD_INVALID';
end;
$$;

revoke all on function public.record_admin_product_intake_evidence_cleanup_v1(text,bigint,uuid,uuid,text,text)
  from public, anon, authenticated;
revoke all on function public.claim_admin_product_intake_evidence_cleanup_v1(text,bigint,uuid,uuid,text,text)
  from public, anon, authenticated;
revoke all on function public.complete_admin_product_intake_evidence_cleanup_v1(text,bigint,uuid,uuid,text,text)
  from public, anon, authenticated;
grant execute on function public.record_admin_product_intake_evidence_cleanup_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;
grant execute on function public.claim_admin_product_intake_evidence_cleanup_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;
grant execute on function public.complete_admin_product_intake_evidence_cleanup_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

do $$
begin
  if has_table_privilege('anon','k2_private.product_intake_evidence_cleanup_events','select')
     or has_table_privilege('authenticated','k2_private.product_intake_evidence_cleanup_events','select') then
    raise exception 'MAP-018 cleanup ledger leaked direct table access';
  end if;
end;
$$;

commit;
