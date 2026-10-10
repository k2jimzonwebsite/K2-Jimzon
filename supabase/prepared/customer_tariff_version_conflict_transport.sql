-- IDEA-20261010-08 / MAP-018. Prepared compatibility overlay, not activation.
-- Business version conflicts must not trigger PostgREST14 serialization retries.
-- Preserve the complete current composed boundary and its BFF409 message mapping.
do $transport$
declare
 v_before pg_catalog.pg_proc%rowtype;
 v_after pg_catalog.pg_proc%rowtype;
 v_definition text;
 v_anchor text:='raise exception using errcode=''40001'',message=''K2_CUSTOMER_TARIFF_VERSION_STALE'';';
begin
 if current_user<>'postgres' then raise exception 'K2_TARIFF_TRANSPORT_TARGET_INVALID'; end if;
 select * into v_before from pg_catalog.pg_proc
 where oid=to_regprocedure('public.execute_customer_delivery_rates_v1(text,bigint,uuid,uuid,text,text)');
 if v_before.oid is null or pg_catalog.pg_get_userbyid(v_before.proowner)<>'postgres'
    or not v_before.prosecdef or v_before.proconfig is distinct from array['search_path=""']::text[]
    or v_before.proacl::text[] is distinct from array['postgres=X/postgres','authenticated=X/postgres']::text[] then
  raise exception 'K2_TARIFF_TRANSPORT_METADATA_DRIFT';
 end if;
 v_definition:=pg_catalog.pg_get_functiondef(v_before.oid);
 if encode(extensions.digest(convert_to(v_definition,'UTF8'),'sha256'),'hex')
    is distinct from '15f0d4d3373ae753c062d37c70d91def0dc6bb1d292f99f6935e2d2db26fbb81' then
  raise exception 'K2_TARIFF_TRANSPORT_SOURCE_DRIFT';
 end if;
 if (length(v_definition)-length(replace(v_definition,v_anchor,'')))/length(v_anchor)<>1 then
  raise exception 'K2_TARIFF_TRANSPORT_ANCHOR_INVALID';
 end if;
 execute replace(v_definition,v_anchor,
   'raise exception using errcode=''P0001'',message=''K2_CUSTOMER_TARIFF_VERSION_STALE'';');
 select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
 if (to_jsonb(v_after)-'prosrc') is distinct from (to_jsonb(v_before)-'prosrc')
    or v_after.prosrc is distinct from replace(v_before.prosrc,v_anchor,
      'raise exception using errcode=''P0001'',message=''K2_CUSTOMER_TARIFF_VERSION_STALE'';') then
  raise exception 'K2_TARIFF_TRANSPORT_POSTCONDITION_INVALID';
 end if;
end $transport$;
