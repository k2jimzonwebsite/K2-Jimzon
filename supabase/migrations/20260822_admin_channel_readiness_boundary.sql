-- Prepared MAP-020 channel-readiness boundary and internal-event verification.
-- Local rehearsal target only until OWNER-005 and the coordinated Admin cutover.
begin;

do $preflight$ begin
  if to_regclass('public.channels') is null or to_regclass('public.channel_shops') is null
     or to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null then
    raise exception 'PREFLIGHT_FAILED: canonical channels and Admin BFF signing must exist';
  end if;
end $preflight$;

-- Extend the installed verifier without replacing newer action, payload or
-- rate controls. Refuse an unfamiliar verifier instead of guessing its shape.
do $signing_action$
declare v_definition text; v_marker text:='''channel_internal_event_verify''';
begin
  select pg_get_functiondef('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure)
  into v_definition;
  if position('''website_listing_set''' in v_definition)=0 then
    if position('if p_action not in (' in v_definition)=0
       or position('K2_ADMIN_ACTION_INVALID' in v_definition)=0
       or (length(v_definition)-length(replace(v_definition,v_marker,'')))/length(v_marker)<>1 then
      raise exception 'PREFLIGHT_FAILED: unfamiliar Admin signing action allowlist';
    end if;
    execute replace(v_definition,v_marker,v_marker||', ''website_listing_set''');
  end if;
end $signing_action$;

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

-- Website membership is a separate reviewed decision from global publication.
create table if not exists k2_private.website_listing_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  request_id uuid not null,
  sku text not null,
  assigned boolean not null,
  reason text not null,
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(actor_id,request_id)
);
alter table k2_private.website_listing_events enable row level security;
alter table k2_private.website_listing_events force row level security;
revoke all on k2_private.website_listing_events from public,anon,authenticated;

-- Table revocation alone does not remove pre-existing column grants.
revoke insert,update,delete,truncate,references,trigger on public.channel_listings from public,anon,authenticated;
do $columns$ declare v_columns text; begin
  select string_agg(quote_ident(attname),',') into v_columns from pg_attribute
  where attrelid='public.channel_listings'::regclass and attnum>0 and not attisdropped;
  execute format('revoke insert (%1$s),update (%1$s),references (%1$s) on public.channel_listings from public,anon,authenticated',v_columns);
end $columns$;

create or replace function public.execute_admin_website_listing_command_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid(); v_payload jsonb; v_hash text; v_sku text; v_reason text;
  v_assigned boolean; v_expected timestamptz; v_has_listing boolean;
  v_existing k2_private.admin_command_receipts; v_count integer; v_inserted integer;
  v_before public.channel_listings%rowtype; v_after public.channel_listings%rowtype;
  v_result jsonb;
begin
  if p_action is distinct from 'website_listing_set' or public.is_admin() is distinct from true
     or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  -- SQL NULL must never bypass the installed verifier's signature predicates.
  if p_timestamp is null or p_nonce is null or p_idempotency_key is null
     or p_payload_text is null or octet_length(convert_to(p_payload_text,'UTF8'))>65536
     or p_signature is null or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='K2_ADMIN_REQUEST_INVALID';
  end if;
  if k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature) is distinct from true then
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload) is distinct from 'object'
     or not (v_payload ?& array['sku','assigned','expectedUpdatedAt','reason'])
     or (v_payload-array['sku','assigned','expectedUpdatedAt','reason'])<>'{}'::jsonb
     or jsonb_typeof(v_payload->'sku') is distinct from 'string'
     or jsonb_typeof(v_payload->'assigned') is distinct from 'boolean'
     or jsonb_typeof(v_payload->'reason') is distinct from 'string'
     or coalesce(jsonb_typeof(v_payload->'expectedUpdatedAt'),'') not in ('null','string') then
    raise exception using errcode='22023',message='K2_WEBSITE_LISTING_INVALID';
  end if;
  v_sku:=trim(v_payload->>'sku'); v_reason:=trim(v_payload->>'reason');
  v_assigned:=(v_payload->>'assigned')::boolean;
  if v_sku !~ '^[A-Za-z0-9._/-]{1,80}$' or length(v_reason) not between 3 and 500 then
    raise exception using errcode='22023',message='K2_WEBSITE_LISTING_INVALID';
  end if;
  if jsonb_typeof(v_payload->'expectedUpdatedAt')='string' then
    if v_payload->>'expectedUpdatedAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$' then
      raise exception using errcode='22023',message='K2_WEBSITE_LISTING_INVALID';
    end if;
    begin v_expected:=(v_payload->>'expectedUpdatedAt')::timestamptz;
    exception when invalid_datetime_format or datetime_field_overflow then
      raise exception using errcode='22023',message='K2_WEBSITE_LISTING_INVALID';
    end;
  end if;

  v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash is distinct from v_hash then
      raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
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

  -- All assignment and order membership decisions serialize on this product.
  perform 1 from public.products where sku=v_sku for update;
  if not found then raise exception using errcode='P0002',message='K2_WEBSITE_PRODUCT_NOT_FOUND'; end if;
  select * into v_before from public.channel_listings
  where sku=v_sku and channel_source='website' and shop_id is null for update;
  v_has_listing:=found;
  if (v_has_listing and v_expected is distinct from v_before.updated_at)
     or (not v_has_listing and v_expected is not null) then
    raise exception using errcode='40001',message='K2_WEBSITE_LISTING_STALE';
  end if;
  if not v_has_listing then
    insert into public.channel_listings(sku,channel_source,status,publication_status,updated_at)
    values(v_sku,'website',case when v_assigned then 'Active' else 'Paused' end,
      case when v_assigned then 'ready' else 'paused' end,clock_timestamp()) returning * into v_after;
  elsif (v_assigned and v_before.status='Active' and v_before.publication_status in ('ready','published'))
     or (not v_assigned and v_before.status='Paused' and v_before.publication_status='paused') then
    v_after:=v_before;
  else
    update public.channel_listings set status=case when v_assigned then 'Active' else 'Paused' end,
      publication_status=case when v_assigned then 'ready' else 'paused' end,updated_at=clock_timestamp()
    where id=v_before.id returning * into v_after;
  end if;
  v_result:=jsonb_build_object('listing',jsonb_build_object(
    'id',v_after.id,'sku',v_after.sku,'assigned',v_assigned,'updatedAt',v_after.updated_at));
  insert into k2_private.website_listing_events(actor_id,request_id,sku,assigned,reason,before_state,after_state)
  values(v_actor,p_idempotency_key,v_sku,v_assigned,v_reason,
    case when v_has_listing then to_jsonb(v_before) else '{}'::jsonb end,to_jsonb(v_after));
  update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end $$;
revoke all on function public.execute_admin_website_listing_command_v1(text,bigint,uuid,uuid,text,text) from public,anon;
grant execute on function public.execute_admin_website_listing_command_v1(text,bigint,uuid,uuid,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
