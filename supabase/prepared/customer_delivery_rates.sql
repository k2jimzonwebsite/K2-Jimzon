-- IDEA-20261002-03 / MAP-023. Prepared, fresh-only fragment. Not live activation.
-- Execute inside the coordinated root transaction after the accepted guest chain.
-- No production rate amounts, evidence, staff identities or future tariff seeded.
do $admission$
declare
 v_oid oid:=to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)');
 v_body text;
 v_definition text;
begin
 if v_oid is null or to_regclass('k2_private.admin_command_receipts') is null
    or to_regclass('k2_private.customer_delivery_rate_heads') is not null
    or to_regclass('k2_private.customer_delivery_rate_versions') is not null
    or to_regprocedure('public.execute_customer_delivery_rates_v1(text,bigint,uuid,uuid,text,text)') is not null
    or to_regprocedure('public.read_customer_delivery_rates_v1()') is not null
    or to_regprocedure('k2_private.customer_delivery_fee_minor_v1(integer,text,integer)') is not null
    or to_regprocedure('k2_private.reject_customer_delivery_rate_mutation_v1()') is not null then
  raise exception using errcode='55000',message='K2_CUSTOMER_TARIFF_FRESH_CONTRACT_REQUIRED';
 end if;
 select prosrc,pg_get_functiondef(oid) into v_body,v_definition from pg_proc
 where oid=v_oid and pg_get_userbyid(proowner)='postgres' and prosecdef
   and proconfig=array['search_path=""']::text[] and proacl=array['postgres=X/postgres']::aclitem[];
 if v_body is null or encode(extensions.digest(convert_to(v_body,'UTF8'),'sha256'),'hex')
    <>'bdb4bd2857aa6c28a865c3ca05b4db7fd2839e704f421f12f81282097649d0e6' then
  raise exception using errcode='55000',message='K2_CUSTOMER_TARIFF_VERIFIER_DRIFT';
 end if;
 execute replace(v_definition,'  if p_action not in (',
  '  if p_action not in (''delivery_customer_rates_publish'',');
end $admission$;

create table k2_private.customer_delivery_rate_versions (
 policy text not null check(policy='jt_current'),
 version integer not null check(version>0),
 rates jsonb not null check(jsonb_typeof(rates)='object'),
 actor_id uuid not null references public.user_profiles(id),
 created_at timestamptz not null default clock_timestamp(),
 reason text not null check(length(btrim(reason)) between 1 and 500),
 evidence_ref text not null check(length(btrim(evidence_ref)) between 1 and 500),
 payload_hash text not null check(payload_hash~'^[0-9a-f]{64}$'),
 primary key(policy,version)
);
create table k2_private.customer_delivery_rate_heads (
 policy text primary key check(policy in ('jt_current','future_standard')),
 current_version integer,
 active boolean not null,
 foreign key(policy,current_version) references k2_private.customer_delivery_rate_versions(policy,version),
 check((policy='jt_current' and active) or (policy='future_standard' and not active and current_version is null))
);
insert into k2_private.customer_delivery_rate_heads(policy,current_version,active)
 values('jt_current',null,true),('future_standard',null,false);
alter table k2_private.customer_delivery_rate_versions enable row level security;
alter table k2_private.customer_delivery_rate_versions force row level security;
alter table k2_private.customer_delivery_rate_heads enable row level security;
alter table k2_private.customer_delivery_rate_heads force row level security;
revoke all on k2_private.customer_delivery_rate_heads,k2_private.customer_delivery_rate_versions
 from public,anon,authenticated,service_role;

create function k2_private.reject_customer_delivery_rate_mutation_v1()
returns trigger language plpgsql set search_path='' as $$
begin
 raise exception using errcode='55000',message='K2_CUSTOMER_TARIFF_HISTORY_IMMUTABLE';
end $$;
revoke all on function k2_private.reject_customer_delivery_rate_mutation_v1() from public,anon,authenticated,service_role;
create trigger customer_delivery_rate_history_immutable before update or delete
 on k2_private.customer_delivery_rate_versions for each row
 execute function k2_private.reject_customer_delivery_rate_mutation_v1();
create trigger customer_delivery_rate_history_no_truncate before truncate
 on k2_private.customer_delivery_rate_versions for each statement
 execute function k2_private.reject_customer_delivery_rate_mutation_v1();

create function public.execute_customer_delivery_rates_v1(
 p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
 p_payload_text text,p_signature text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_actor uuid:=auth.uid();
 v_payload jsonb;
 v_hash text;
 v_receipt k2_private.admin_command_receipts;
 v_current integer;
 v_expected numeric;
 v_version integer;
 v_area text;
 v_row jsonb;
 v_key text;
 v_num numeric;
 v_result jsonb;
 v_instant timestamptz;
begin
 if p_action is distinct from 'delivery_customer_rates_publish' then
  raise exception using errcode='22023',message='K2_ADMIN_ACTION_INVALID';
 end if;
 if not k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature) then
  raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
 end if;
 if not exists(select 1 from public.user_profiles where id=v_actor and role::text in ('Admin','Staff')) then
  raise exception using errcode='42501',message='K2_CUSTOMER_TARIFF_STAFF_REQUIRED';
 end if;
 v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
 select * into v_receipt from k2_private.admin_command_receipts
 where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
 if found then
  if v_receipt.payload_hash is distinct from v_hash then
   raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
  end if;
  if v_receipt.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';end if;
  return v_receipt.result;
 end if;
 select current_version into v_current from k2_private.customer_delivery_rate_heads
 where policy='jt_current' and active for update;
 if not found then raise exception using errcode='55000',message='K2_CUSTOMER_TARIFF_NOT_CONFIGURED';end if;
 -- A concurrent same-key transaction may have committed while this head waited.
 select * into v_receipt from k2_private.admin_command_receipts
 where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
 if found then
  if v_receipt.payload_hash is distinct from v_hash then
   raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
  end if;
  if v_receipt.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';end if;
  return v_receipt.result;
 end if;
 v_payload:=p_payload_text::jsonb;
 if jsonb_typeof(v_payload) is distinct from 'object'
    or not(v_payload ?& array['expectedVersion','reason','evidenceRef','rates'])
    or v_payload-array['expectedVersion','reason','evidenceRef','rates']<>'{}'::jsonb
    or jsonb_typeof(v_payload->'expectedVersion') is distinct from 'number'
    or jsonb_typeof(v_payload->'reason') is distinct from 'string'
    or jsonb_typeof(v_payload->'evidenceRef') is distinct from 'string'
    or length(btrim(v_payload->>'reason')) not between 1 and 500
    or length(btrim(v_payload->>'evidenceRef')) not between 1 and 500
    or jsonb_typeof(v_payload->'rates') is distinct from 'object' then
  raise exception using errcode='22023',message='K2_CUSTOMER_TARIFF_INPUT_INVALID';
 end if;
 v_expected:=(v_payload->>'expectedVersion')::numeric;
 if v_expected<>trunc(v_expected) or v_expected<0 or v_expected>2147483646 then
  raise exception using errcode='22023',message='K2_CUSTOMER_TARIFF_INPUT_INVALID';
 end if;
 if v_expected is distinct from coalesce(v_current,0)::numeric then
  raise exception using errcode='40001',message='K2_CUSTOMER_TARIFF_VERSION_STALE';
 end if;
 if not(v_payload->'rates' ?& array['NCR','Greater Luzon','Visayas','Mindanao'])
    or (v_payload->'rates')-array['NCR','Greater Luzon','Visayas','Mindanao']<>'{}'::jsonb then
  raise exception using errcode='22023',message='K2_CUSTOMER_TARIFF_INPUT_INVALID';
 end if;
 foreach v_area in array array['NCR','Greater Luzon','Visayas','Mindanao'] loop
  v_row:=v_payload->'rates'->v_area;
  if jsonb_typeof(v_row) is distinct from 'object'
     or not(v_row ?& array['baseMinor','includedWeightG','extraKgMinor','roundMinor'])
     or v_row-array['baseMinor','includedWeightG','extraKgMinor','roundMinor']<>'{}'::jsonb then
   raise exception using errcode='22023',message='K2_CUSTOMER_TARIFF_INPUT_INVALID';
  end if;
  foreach v_key in array array['baseMinor','includedWeightG','extraKgMinor','roundMinor'] loop
   if jsonb_typeof(v_row->v_key) is distinct from 'number' then
    raise exception using errcode='22023',message='K2_CUSTOMER_TARIFF_INPUT_INVALID';
   end if;
   v_num:=(v_row->>v_key)::numeric;
   if v_num<>trunc(v_num) or v_num<(case when v_key='extraKgMinor' then 0 else 1 end)
      or v_num>(case when v_key='includedWeightG' then 100000 else 10000000 end) then
    raise exception using errcode='22023',message='K2_CUSTOMER_TARIFF_INPUT_INVALID';
   end if;
  end loop;
 end loop;
 v_version:=coalesce(v_current,0)+1;
 v_instant:=clock_timestamp();
 insert into k2_private.customer_delivery_rate_versions(policy,version,rates,actor_id,created_at,reason,evidence_ref,payload_hash)
 values('jt_current',v_version,v_payload->'rates',v_actor,v_instant,btrim(v_payload->>'reason'),btrim(v_payload->>'evidenceRef'),v_hash);
 update k2_private.customer_delivery_rate_heads set current_version=v_version where policy='jt_current';
 v_result:=jsonb_build_object('policy','jt_current','version',v_version,'actorId',v_actor,'createdAt',v_instant);
 insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash,result)
 values(v_actor,p_action,p_idempotency_key,v_hash,v_result);
 return v_result;
end $$;
revoke all on function public.execute_customer_delivery_rates_v1(text,bigint,uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.execute_customer_delivery_rates_v1(text,bigint,uuid,uuid,text,text) to authenticated;

create function k2_private.customer_delivery_fee_minor_v1(p_version integer,p_area text,p_weight_g integer)
returns integer language plpgsql security definer stable set search_path='' as $$
declare v_row jsonb;v_fee bigint;v_step bigint;
begin
 if p_version is null or p_version<=0 or p_area is null
    or p_area not in ('NCR','Greater Luzon','Visayas','Mindanao')
    or p_weight_g is null or p_weight_g not between 1 and 495000000 then
  raise exception using errcode='22023',message='K2_CUSTOMER_TARIFF_INPUT_INVALID';
 end if;
 select rates->p_area into v_row from k2_private.customer_delivery_rate_versions
 where policy='jt_current' and version=p_version;
 if not found or v_row is null then raise exception using errcode='22023',message='K2_CUSTOMER_TARIFF_MISSING';end if;
 v_fee:=(v_row->>'baseMinor')::bigint
   +((greatest(p_weight_g::bigint-(v_row->>'includedWeightG')::bigint,0)+999)/1000)*(v_row->>'extraKgMinor')::bigint;
 v_step:=(v_row->>'roundMinor')::bigint;
 v_fee:=((v_fee+v_step-1)/v_step)*v_step;
 if v_fee not between 1 and 10000000 then raise exception using errcode='22023',message='K2_CUSTOMER_TARIFF_FEE_OUT_OF_RANGE';end if;
 return v_fee::integer;
end $$;
revoke all on function k2_private.customer_delivery_fee_minor_v1(integer,text,integer) from public,anon,authenticated,service_role;

create function public.read_customer_delivery_rates_v1()
returns jsonb language plpgsql security definer stable set search_path='' as $$
declare v_result jsonb;
begin
 if auth.uid() is null or coalesce(auth.jwt()->>'aal','')<>'aal2'
    or not exists(select 1 from public.user_profiles where id=auth.uid() and role::text in ('Admin','Staff')) then
  raise exception using errcode='42501',message='K2_CUSTOMER_TARIFF_STAFF_REQUIRED';
 end if;
 select jsonb_build_object('current',(select jsonb_build_object('policy',v.policy,'version',v.version,'rates',v.rates,
  'actorId',v.actor_id,'createdAt',v.created_at,'reason',v.reason,'evidenceRef',v.evidence_ref)
  from k2_private.customer_delivery_rate_heads h join k2_private.customer_delivery_rate_versions v
  on v.policy=h.policy and v.version=h.current_version where h.policy='jt_current' and h.active),
  'future',(select jsonb_build_object('policy',policy,'currentVersion',current_version,'active',active)
  from k2_private.customer_delivery_rate_heads where policy='future_standard')) into v_result;
 return v_result;
end $$;
revoke all on function public.read_customer_delivery_rates_v1() from public,anon,authenticated,service_role;
grant execute on function public.read_customer_delivery_rates_v1() to authenticated;
