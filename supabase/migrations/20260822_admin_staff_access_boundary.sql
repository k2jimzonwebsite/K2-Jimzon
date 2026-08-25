-- Prepared MAP-020 staff-access read, role-change, and delete-PIN boundary.
-- Local rehearsal target only until OWNER-005 and the coordinated Admin cutover.
begin;

create table if not exists k2_private.staff_access_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null check (action in ('staff_role_change','admin_delete_pin_set')),
  request_id uuid not null,
  target_user_id uuid,
  reason text not null,
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(actor_id,action,request_id)
);
alter table k2_private.staff_access_events enable row level security;
alter table k2_private.staff_access_events force row level security;
revoke all on k2_private.staff_access_events from public,anon,authenticated;

-- Direct browser privilege changes are removed at the coordinated cutover.
revoke all on function public.set_user_role(uuid,text) from public,anon,authenticated;
revoke all on function public.set_delete_pin(text) from public,anon,authenticated;
revoke all on function public.has_delete_pin() from public,anon,authenticated;

create or replace function public.read_admin_staff_access_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_profiles jsonb; v_has_pin boolean;
begin
  if not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'email',p.email,'fullName',p.full_name,'role',p.role::text,
    'createdAt',p.created_at,'updatedAt',p.updated_at
  ) order by p.created_at,p.id),'[]'::jsonb) into v_profiles
  from (select * from public.user_profiles order by created_at,id limit 200) p;
  select exists(select 1 from k2_private.staff_delete_credentials d where d.user_id=auth.uid()) into v_has_pin;
  return jsonb_build_object('profiles',v_profiles,'hasDeletePin',v_has_pin,
    'currentSessionAal2',true,'invitationAvailable',false,'mfaEnrollmentAvailable',false);
end;
$$;
revoke all on function public.read_admin_staff_access_v1() from public,anon;
grant execute on function public.read_admin_staff_access_v1() to authenticated;

create or replace function public.execute_admin_staff_access_command_v1(
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
  v_count integer; v_inserted integer; v_target uuid; v_role text;
  v_before public.user_profiles%rowtype; v_after public.user_profiles%rowtype;
  v_admin_count integer; v_had_pin boolean;
begin
  if p_action not in ('staff_role_change','admin_delete_pin_set') or not public.is_admin()
     or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED'; end if;
  v_payload:=p_payload_text::jsonb;
  v_reason:=trim(v_payload->>'reason');
  if jsonb_typeof(v_payload)<>'object' or length(v_reason) not between 3 and 500 then
    raise exception using errcode='22023',message='K2_ADMIN_STAFF_INVALID';
  end if;
  if p_action='staff_role_change' then
    if not (v_payload ?& array['targetUserId','role','reason'])
       or (v_payload-array['targetUserId','role','reason'])<>'{}'::jsonb then
      raise exception using errcode='22023',message='K2_ADMIN_STAFF_INVALID';
    end if;
    v_target:=(v_payload->>'targetUserId')::uuid; v_role:=v_payload->>'role';
    if v_role not in ('Admin','Staff','Customer') then
      raise exception using errcode='22023',message='K2_ADMIN_STAFF_INVALID';
    end if;
  else
    if not (v_payload ?& array['pin','reason'])
       or (v_payload-array['pin','reason'])<>'{}'::jsonb
       or coalesce(v_payload->>'pin','')!~'^[0-9]{4}$' then
      raise exception using errcode='22023',message='K2_ADMIN_STAFF_INVALID';
    end if;
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

  if p_action='staff_role_change' then
    select * into v_before from public.user_profiles where id=v_target for update;
    if not found then raise exception using errcode='P0002',message='K2_ADMIN_STAFF_NOT_FOUND'; end if;
    if v_before.role::text=v_role then raise exception using errcode='22023',message='K2_ADMIN_STAFF_UNCHANGED'; end if;
    if v_before.role::text='Admin' and v_role<>'Admin' then
      select count(*)::integer into v_admin_count from public.user_profiles where role::text='Admin';
      if v_admin_count<=1 then raise exception using errcode='23514',message='K2_ADMIN_FINAL_ADMIN'; end if;
    end if;
    update public.user_profiles set role=v_role::public.user_role,updated_at=clock_timestamp()
    where id=v_target returning * into v_after;
    v_result:=jsonb_build_object('profile',jsonb_build_object(
      'id',v_after.id,'email',v_after.email,'fullName',v_after.full_name,
      'role',v_after.role::text,'createdAt',v_after.created_at,'updatedAt',v_after.updated_at));
    insert into k2_private.staff_access_events(actor_id,action,request_id,target_user_id,reason,before_state,after_state)
    values(v_actor,p_action,p_idempotency_key,v_target,v_reason,
      jsonb_build_object('role',v_before.role::text),jsonb_build_object('role',v_after.role::text));
  else
    select exists(select 1 from k2_private.staff_delete_credentials where user_id=v_actor) into v_had_pin;
    insert into k2_private.staff_delete_credentials(
      user_id,pin_hash,pin_set_at,failed_attempts,attempt_window_started_at,locked_until,updated_at
    ) values(v_actor,extensions.crypt(v_payload->>'pin',extensions.gen_salt('bf',12)),now(),0,null,null,now())
    on conflict(user_id) do update set pin_hash=excluded.pin_hash,pin_set_at=excluded.pin_set_at,
      failed_attempts=0,attempt_window_started_at=null,locked_until=null,updated_at=now();
    v_result:=jsonb_build_object('hasDeletePin',true);
    insert into k2_private.staff_access_events(actor_id,action,request_id,target_user_id,reason,before_state,after_state)
    values(v_actor,p_action,p_idempotency_key,v_actor,v_reason,
      jsonb_build_object('configured',v_had_pin),jsonb_build_object('configured',true));
  end if;
  update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
exception when invalid_text_representation then
  raise exception using errcode='22023',message='K2_ADMIN_STAFF_INVALID';
end;
$$;
revoke all on function public.execute_admin_staff_access_command_v1(text,bigint,uuid,uuid,text,text) from public,anon;
grant execute on function public.execute_admin_staff_access_command_v1(text,bigint,uuid,uuid,text,text) to authenticated;

commit;
