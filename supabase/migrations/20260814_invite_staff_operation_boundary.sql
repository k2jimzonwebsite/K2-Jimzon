-- Prepared MAP-016 boundary for durable, replay-safe staff invitations.
-- Apply before deploying the corrected invite-staff Edge Function.

begin;

create schema if not exists k2_private;
revoke all on schema k2_private from public, anon, authenticated;

create table if not exists k2_private.staff_invitation_operations (
  actor_id uuid not null,
  idempotency_key uuid not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  result jsonb,
  state text not null default 'pending' check (state in ('pending','completed','released')),
  attempt_count integer not null default 1 check (attempt_count between 1 and 3),
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (actor_id, idempotency_key)
);
revoke all on table k2_private.staff_invitation_operations from public, anon, authenticated;
create index if not exists staff_invitation_operations_actor_time_idx
  on k2_private.staff_invitation_operations (actor_id, created_at desc);

create or replace function public.claim_staff_invitation_operation(
  p_actor_id uuid,
  p_idempotency_key uuid,
  p_payload_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing k2_private.staff_invitation_operations;
  v_recent integer;
  v_retry boolean := false;
begin
  if p_actor_id is null or p_idempotency_key is null
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023', message='K2_INVITE_OPERATION_INVALID';
  end if;

  -- Serialize claims for one actor so the rate limit and receipt insert are atomic.
  perform pg_advisory_xact_lock(hashtextextended(p_actor_id::text || ':invite_staff', 0));

  select * into v_existing
  from k2_private.staff_invitation_operations
  where actor_id=p_actor_id and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash <> p_payload_hash then
      return jsonb_build_object('state', 'conflict');
    end if;
    if v_existing.state='completed' and v_existing.result is not null then
      return jsonb_build_object('state', 'completed', 'result', v_existing.result);
    end if;
    if v_existing.state='pending' and v_existing.last_attempt_at > now()-interval '5 minutes' then
      return jsonb_build_object('state', 'in_progress');
    end if;
    if v_existing.attempt_count >= 3
       and v_existing.last_attempt_at > now()-interval '10 minutes' then
      return jsonb_build_object('state', 'rate_limited');
    end if;
    -- A released claim or a stale pending claim may be retried. This prevents a
    -- terminated Edge isolate from stranding the operation forever.
    v_retry := true;
  end if;

  select coalesce(sum(attempt_count),0)::integer into v_recent
  from k2_private.staff_invitation_operations
  where actor_id=p_actor_id and last_attempt_at > now()-interval '10 minutes';
  if v_recent >= 10 then
    return jsonb_build_object('state', 'rate_limited');
  end if;

  if v_retry then
    update k2_private.staff_invitation_operations
    set state='pending', result=null,
        attempt_count=case when last_attempt_at <= now()-interval '10 minutes' then 1 else attempt_count+1 end,
        last_attempt_at=now(), completed_at=null
    where actor_id=p_actor_id and idempotency_key=p_idempotency_key;
    return jsonb_build_object('state', 'claimed');
  end if;

  insert into k2_private.staff_invitation_operations(actor_id,idempotency_key,payload_hash)
  values(p_actor_id,p_idempotency_key,p_payload_hash);
  return jsonb_build_object('state', 'claimed');
end;
$$;

create or replace function public.complete_staff_invitation_operation(
  p_actor_id uuid,
  p_idempotency_key uuid,
  p_payload_hash text,
  p_result jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if jsonb_typeof(p_result) <> 'object' or coalesce((p_result->>'ok')::boolean, false) is not true then
    raise exception using errcode='22023', message='K2_INVITE_RESULT_INVALID';
  end if;
  update k2_private.staff_invitation_operations
  set result=p_result, state='completed', completed_at=now()
  where actor_id=p_actor_id and idempotency_key=p_idempotency_key
    and payload_hash=p_payload_hash and state='pending';
  if not found then raise exception using errcode='55000', message='K2_INVITE_OPERATION_NOT_PENDING'; end if;
end;
$$;

create or replace function public.release_staff_invitation_operation(
  p_actor_id uuid,
  p_idempotency_key uuid,
  p_payload_hash text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update k2_private.staff_invitation_operations
  set state='released', last_attempt_at=now()
  where actor_id=p_actor_id and idempotency_key=p_idempotency_key
    and payload_hash=p_payload_hash and state='pending';
end;
$$;

revoke all on function public.claim_staff_invitation_operation(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.complete_staff_invitation_operation(uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.release_staff_invitation_operation(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_staff_invitation_operation(uuid,uuid,text) to service_role;
grant execute on function public.complete_staff_invitation_operation(uuid,uuid,text,jsonb) to service_role;
grant execute on function public.release_staff_invitation_operation(uuid,uuid,text) to service_role;

-- Role changes are sensitive even outside the invitation function.
create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns public.user_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.user_profiles;
  v_admin_count integer;
begin
  if not public.is_admin() then raise exception 'Admin access required'; end if;
  if coalesce(auth.jwt()->>'aal', '') <> 'aal2' then raise exception 'AAL2 required'; end if;
  if p_role not in ('Admin', 'Staff', 'Customer') then raise exception 'Invalid role'; end if;
  select * into v_profile from public.user_profiles where id=p_user_id for update;
  if not found then raise exception 'Profile not found'; end if;
  if v_profile.role::text='Admin' and p_role<>'Admin' then
    select count(*) into v_admin_count from public.user_profiles where role::text='Admin';
    if v_admin_count <= 1 then raise exception 'The final Admin cannot be demoted'; end if;
  end if;
  update public.user_profiles set role=p_role::public.user_role, updated_at=now()
  where id=p_user_id returning * into v_profile;
  return v_profile;
end;
$$;
revoke all on function public.set_user_role(uuid,text) from public;
grant execute on function public.set_user_role(uuid,text) to authenticated;

notify pgrst,'reload schema';
commit;
