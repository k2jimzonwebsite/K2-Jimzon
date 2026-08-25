-- MAP-019: bind every secure staff invitation receipt to an attributable reason.
-- The v1 claim remains available until the deployed Edge Function is upgraded.

begin;

alter table k2_private.staff_invitation_operations
  add column if not exists reason text;

alter table k2_private.staff_invitation_operations
  drop constraint if exists staff_invitation_operations_reason_check;
alter table k2_private.staff_invitation_operations
  add constraint staff_invitation_operations_reason_check
  check (reason is null or char_length(reason) between 3 and 500);

create or replace function public.claim_staff_invitation_operation_v2(
  p_actor_id uuid,
  p_idempotency_key uuid,
  p_payload_hash text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing k2_private.staff_invitation_operations;
  v_recent integer;
  v_reason text := trim(coalesce(p_reason,''));
  v_retry boolean := false;
begin
  if p_actor_id is null or p_idempotency_key is null
     or p_payload_hash !~ '^[0-9a-f]{64}$'
     or char_length(v_reason) not between 3 and 500 then
    raise exception using errcode='22023', message='K2_INVITE_OPERATION_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_actor_id::text || ':invite_staff', 0));

  select * into v_existing
  from k2_private.staff_invitation_operations
  where actor_id=p_actor_id and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash <> p_payload_hash or v_existing.reason is distinct from v_reason then
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
    set state='pending', result=null, reason=v_reason,
        attempt_count=case when last_attempt_at <= now()-interval '10 minutes' then 1 else attempt_count+1 end,
        last_attempt_at=now(), completed_at=null
    where actor_id=p_actor_id and idempotency_key=p_idempotency_key;
    return jsonb_build_object('state', 'claimed');
  end if;

  insert into k2_private.staff_invitation_operations(actor_id,idempotency_key,payload_hash,reason)
  values(p_actor_id,p_idempotency_key,p_payload_hash,v_reason);
  return jsonb_build_object('state', 'claimed');
end;
$$;

revoke all on function public.claim_staff_invitation_operation_v2(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.claim_staff_invitation_operation_v2(uuid,uuid,text,text) to service_role;

notify pgrst,'reload schema';
commit;
