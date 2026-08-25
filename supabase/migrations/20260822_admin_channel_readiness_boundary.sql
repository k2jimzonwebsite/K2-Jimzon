-- Prepared MAP-020 channel-readiness boundary and internal-event verification.
-- Local rehearsal target only until OWNER-005 and the coordinated Admin cutover.
begin;

create table if not exists k2_private.channel_verification_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null check (action = 'channel_internal_event_verify'),
  request_id uuid not null,
  channel text not null check (channel in ('website','pasabuy')),
  public_reference text not null,
  reason text not null,
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(actor_id,action,request_id)
);
alter table k2_private.channel_verification_events enable row level security;
alter table k2_private.channel_verification_events force row level security;
revoke all on k2_private.channel_verification_events from public,anon,authenticated;

-- The browser may no longer invoke the legacy status-changing function directly.
revoke all on function public.verify_internal_channel_event(text,text,text) from public,anon,authenticated;

create or replace function public.read_admin_channel_readiness_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_connections jsonb; v_readiness jsonb;
begin
  if not public.is_staff() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'channel',c.channel,'displayName',c.display_name,'status',c.status,
    'lastEventAt',c.last_event_at,'note',c.note,'updatedAt',c.updated_at
  ) order by array_position(array['website','pasabuy','shopee','tiktok','lazada'],c.channel)),'[]'::jsonb)
  into v_connections
  from public.channel_connections c
  where c.channel in ('website','pasabuy','shopee','tiktok','lazada');

  select coalesce(jsonb_agg(jsonb_build_object(
    'channel',x.channel,'total',x.total,'ready',x.ready,
    'incomplete',x.incomplete,'published',x.published
  ) order by array_position(array['website','pasabuy','shopee','tiktok','lazada'],x.channel)),'[]'::jsonb)
  into v_readiness
  from (
    select r.channel,count(*)::integer total,
      count(*) filter(where coalesce(cardinality(r.missing_fields),0)=0 and r.publication_status in ('ready','published'))::integer ready,
      count(*) filter(where coalesce(cardinality(r.missing_fields),0)>0)::integer incomplete,
      count(*) filter(where r.publication_status='published')::integer published
    from public.v_channel_catalog_readiness r
    where r.channel in ('website','pasabuy','shopee','tiktok','lazada')
    group by r.channel
  ) x;
  return jsonb_build_object('connections',v_connections,'readiness',v_readiness,
    'externalConnectorsActivated',false,'pollAfterSeconds',30);
end;
$$;
revoke all on function public.read_admin_channel_readiness_v1() from public,anon;
grant execute on function public.read_admin_channel_readiness_v1() to authenticated;

create or replace function public.execute_admin_channel_command_v1(
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
  v_reference text; v_channel text; v_existing k2_private.admin_command_receipts;
  v_result jsonb; v_count integer; v_inserted integer;
  v_before public.channel_connections%rowtype; v_after public.channel_connections%rowtype;
begin
  if p_action<>'channel_internal_event_verify' or not public.is_admin()
     or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED'; end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object'
     or not (v_payload ?& array['channel','publicReference','reason'])
     or (v_payload-array['channel','publicReference','reason'])<>'{}'::jsonb then
    raise exception using errcode='22023',message='K2_ADMIN_CHANNEL_INVALID';
  end if;
  v_channel:=trim(v_payload->>'channel');
  v_reference:=trim(v_payload->>'publicReference');
  v_reason:=trim(v_payload->>'reason');
  if v_channel not in ('website','pasabuy') or length(v_reference) not between 3 and 80
     or length(v_reason) not between 3 and 500 then
    raise exception using errcode='22023',message='K2_ADMIN_CHANNEL_INVALID';
  end if;
  if v_channel='website' and not exists(
    select 1 from public.order_requests where public_reference=v_reference
  ) then raise exception using errcode='P0002',message='K2_ADMIN_CHANNEL_REFERENCE_NOT_FOUND'; end if;
  if v_channel='pasabuy' and not exists(
    select 1 from public.pasabuy_requests where public_reference=v_reference
  ) then raise exception using errcode='P0002',message='K2_ADMIN_CHANNEL_REFERENCE_NOT_FOUND'; end if;

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
  if v_count>=20 then raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED'; end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS'; end if;

  select * into v_before from public.channel_connections where channel=v_channel for update;
  if not found then raise exception using errcode='P0002',message='K2_ADMIN_CHANNEL_NOT_FOUND'; end if;
  update public.channel_connections set status='live',last_event_at=clock_timestamp(),
    note=v_reason||' · verified reference '||v_reference,updated_at=clock_timestamp()
  where channel=v_channel returning * into v_after;
  v_result:=jsonb_build_object('connection',jsonb_build_object(
    'channel',v_after.channel,'displayName',v_after.display_name,'status',v_after.status,
    'lastEventAt',v_after.last_event_at,'note',v_after.note,'updatedAt',v_after.updated_at));
  insert into k2_private.channel_verification_events(
    actor_id,action,request_id,channel,public_reference,reason,before_state,after_state
  ) values(v_actor,p_action,p_idempotency_key,v_channel,v_reference,v_reason,
    to_jsonb(v_before),to_jsonb(v_after));
  update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
$$;
revoke all on function public.execute_admin_channel_command_v1(text,bigint,uuid,uuid,text,text) from public,anon;
grant execute on function public.execute_admin_channel_command_v1(text,bigint,uuid,uuid,text,text) to authenticated;

commit;
