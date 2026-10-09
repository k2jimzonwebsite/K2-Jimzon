-- IDEA-20261002-05 / MAP-018. Fresh-only local preparation, outside migrations.
-- Requires the exact final hardened verifier/master and private policy fragments.
-- No bound is seeded: measured taxonomy/owner acceptance must configure activation.
do $preflight$
begin
 if current_user<>'postgres'
    or to_regprocedure('k2_private.mutate_category_policy_v1(uuid,text,integer,bigint,text,integer)') is null
    or to_regclass('k2_private.category_policy_command_config') is not null then
  raise exception 'K2_CATEGORY_SIGNED_TARGET_INVALID';
 end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_language l on l.oid=p.prolang
    where p.oid in (
      'k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure,
      'public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure)
    and (pg_catalog.pg_get_userbyid(p.proowner)<>'postgres' or not p.prosecdef
      or p.proconfig is distinct from array['search_path=""']
      or l.lanname<>'plpgsql' or p.provolatile<>'v' or p.prokind<>'f'
      or p.proacl::text[] is distinct from case when p.proname='verify_admin_bff_request'
        then array['postgres=X/postgres']
        else array['postgres=X/postgres','authenticated=X/postgres'] end)) then
  raise exception 'K2_CATEGORY_SIGNED_METADATA_DRIFT';
 end if;
 if (select encode(extensions.digest(convert_to(prosrc,'UTF8'),'sha256'),'hex')
     from pg_catalog.pg_proc where oid='k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure)
    is distinct from '2122886c341812fe0901b97c397680fe6317ec00ade82a7ed9c50d719af87385'
    or (select encode(extensions.digest(convert_to(prosrc,'UTF8'),'sha256'),'hex')
     from pg_catalog.pg_proc where oid='public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure)
    is distinct from '07a353c7e9dcb09e41e784bdfb096dbc0a12fbfce98fc59f0ff6ef6602e0368a' then
  raise exception 'K2_CATEGORY_SIGNED_SOURCE_DRIFT';
 end if;
end $preflight$;

create table k2_private.category_policy_command_config(
 singleton boolean primary key default true check(singleton),
 maximum_depth integer not null check(maximum_depth>0)
);
alter table k2_private.category_policy_command_config enable row level security;
revoke all on k2_private.category_policy_command_config from public,anon,authenticated,service_role;

create function k2_private.execute_category_policy_payload_v1(p_action text,p_payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $payload$
declare
 v_setting boolean:=p_action='category_policy_set';
 v_keys text[];
 v_category text;
 v_version text;
 v_minimum text;
 v_reason text;
 v_depth integer;
 v_result jsonb;
begin
 if auth.uid() is null or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
  raise exception using errcode='42501',message='K2_CATEGORY_POLICY_ADMIN_REQUIRED';
 end if;
 if p_action is null or p_action not in ('category_policy_set','category_policy_clear')
    or jsonb_typeof(p_payload) is distinct from 'object' then
  raise exception using errcode='22023',message='K2_CATEGORY_POLICY_INPUT_INVALID';
 end if;
 v_keys:=case when v_setting then array['categoryId','minimumDays','expectedVersion','reason']
   else array['categoryId','expectedVersion','reason'] end;
 if not (p_payload ?& v_keys) or (p_payload-v_keys)<>'{}'::jsonb
    or jsonb_typeof(p_payload->'categoryId') is distinct from 'string'
    or jsonb_typeof(p_payload->'expectedVersion') is distinct from 'string'
    or jsonb_typeof(p_payload->'reason') is distinct from 'string' then
  raise exception using errcode='22023',message='K2_CATEGORY_POLICY_INPUT_INVALID';
 end if;
 v_category:=p_payload->>'categoryId';v_version:=p_payload->>'expectedVersion';
 v_reason:=pg_catalog.btrim(p_payload->>'reason');
 if v_category!~'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or v_version!~'^(0|[1-9][0-9]{0,18})$'
    or length(v_reason) not between 8 and 500 then
  raise exception using errcode='22023',message='K2_CATEGORY_POLICY_INPUT_INVALID';
 end if;
 if v_version::numeric>9223372036854775807 then
  raise exception using errcode='22023',message='K2_CATEGORY_POLICY_INPUT_INVALID';
 end if;
 if v_setting then
  v_minimum:=p_payload->>'minimumDays';
  if jsonb_typeof(p_payload->'minimumDays') is distinct from 'number'
     or v_minimum!~'^[0-9]{1,10}$' then
   raise exception using errcode='22023',message='K2_CATEGORY_POLICY_INPUT_INVALID';
  end if;
  if v_minimum::numeric<90 or v_minimum::numeric>2147483647 then
   raise exception using errcode='22023',message='K2_CATEGORY_POLICY_INPUT_INVALID';
  end if;
 end if;
 select maximum_depth into v_depth from k2_private.category_policy_command_config where singleton;
 if v_depth is null then
  raise exception using errcode='55000',message='K2_CATEGORY_POLICY_NOT_CONFIGURED';
 end if;
 v_result:=k2_private.mutate_category_policy_v1(v_category::uuid,
   case when v_setting then 'set' else 'clear' end,v_minimum::integer,v_version::bigint,v_reason,v_depth);
 -- JSON bigint numbers would round in a browser. Receipts retain exact version text.
 return jsonb_set(v_result,'{version}',to_jsonb(v_result->>'version'));
end $payload$;
revoke all on function k2_private.execute_category_policy_payload_v1(text,jsonb)
 from public,anon,authenticated,service_role;

-- Fingerprints above protect the complete hardened bodies. Replace only allowlists
-- and one dispatch branch; retain all old actions, auth, HMAC, NULL/nonce/rate/replay.
do $compose$
declare v_definition text;v_anchor text;
begin
 v_definition:=pg_catalog.pg_get_functiondef('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure);
 v_anchor:='''product_master_update'', ''product_master_status'', ''product_master_delete'',';
 if (length(v_definition)-length(replace(v_definition,v_anchor,'')))/length(v_anchor)<>1 then
  raise exception 'K2_CATEGORY_SIGNED_ANCHOR_INVALID';
 end if;
 v_definition:=replace(v_definition,v_anchor,v_anchor||E'\n    ''category_policy_set'', ''category_policy_clear'',');
 execute v_definition;

 v_definition:=pg_catalog.pg_get_functiondef('public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text)'::regprocedure);
 v_anchor:='(''product_master_update'',''product_master_status'',''product_master_delete'')';
 if (length(v_definition)-length(replace(v_definition,v_anchor,'')))/length(v_anchor)<>1 then
  raise exception 'K2_CATEGORY_SIGNED_ANCHOR_INVALID';
 end if;
 v_definition:=replace(v_definition,v_anchor,'(''product_master_update'',''product_master_status'',''product_master_delete'',''category_policy_set'',''category_policy_clear'')');
 v_anchor:='  if p_action=''product_master_update'' then';
 if (length(v_definition)-length(replace(v_definition,v_anchor,'')))/length(v_anchor)<>1 then
  raise exception 'K2_CATEGORY_SIGNED_ANCHOR_INVALID';
 end if;
 v_definition:=replace(v_definition,v_anchor,
   E'  if p_action in (''category_policy_set'',''category_policy_clear'') then\n'
   ||E'    v_result:=k2_private.execute_category_policy_payload_v1(p_action,v_payload);\n'
   ||'  elsif p_action=''product_master_update'' then');
 execute v_definition;
end $compose$;
