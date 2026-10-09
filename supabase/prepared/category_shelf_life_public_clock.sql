-- IDEA-20261002-05 / MAP-018. PREPARED ONLY, outside activation migrations.
-- Approved SK-05: public projection uses one statement instant, never staff context.
-- Clock-only composition over the exact reviewed Website projection; category parity
-- remains a separate required integration. No grants, view or physical rows change.
do $public_clock$
declare v_before pg_catalog.pg_proc%rowtype;v_after pg_catalog.pg_proc%rowtype;
 v_definition text;v_source text;v_count integer;
begin
 if current_user<>'postgres' then raise exception 'K2_PUBLIC_CLOCK_TARGET_INVALID'; end if;
 select * into v_before from pg_catalog.pg_proc
 where oid=to_regprocedure('public.get_public_product_stock()');
 if not found or pg_get_userbyid(v_before.proowner)<>'postgres'
  or not v_before.prosecdef or v_before.provolatile<>'s'
  or v_before.prolang<>(select oid from pg_catalog.pg_language where lanname='sql')
  or v_before.proconfig is distinct from array['search_path=""']::text[]
  or v_before.proacl is null
  or exists(select 1 from pg_catalog.aclexplode(v_before.proacl) a
   where a.grantee not in (v_before.proowner,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)
    or a.privilege_type<>'EXECUTE' or a.is_grantable)
  or not pg_catalog.has_function_privilege('anon',v_before.oid,'EXECUTE')
  or not pg_catalog.has_function_privilege('authenticated',v_before.oid,'EXECUTE')
  or md5(replace(v_before.prosrc,chr(13),''))<>'3007471a23043753b52b8b6731d78c49' then
  raise exception 'K2_PUBLIC_CLOCK_FUNCTION_DRIFT';
 end if;
 v_count:=(length(v_before.prosrc)-length(replace(v_before.prosrc,
  'pg_catalog.transaction_timestamp()','')))/length('pg_catalog.transaction_timestamp()');
 if v_count<>4 then raise exception 'K2_PUBLIC_CLOCK_SCOPE_INVALID'; end if;
 v_source:=replace(v_before.prosrc,'pg_catalog.transaction_timestamp()',
  'pg_catalog.statement_timestamp()');
 v_definition:=pg_catalog.pg_get_functiondef(v_before.oid);
 if (length(v_definition)-length(replace(v_definition,v_before.prosrc,'')))<>length(v_before.prosrc) then
  raise exception 'K2_PUBLIC_CLOCK_DEFINITION_AMBIGUOUS';
 end if;
 execute replace(v_definition,v_before.prosrc,v_source);
 select * into v_after from pg_catalog.pg_proc where oid=v_before.oid;
 if v_after.prosrc is distinct from v_source
  or (to_jsonb(v_after)-'prosrc') is distinct from (to_jsonb(v_before)-'prosrc') then
  raise exception 'K2_PUBLIC_CLOCK_METADATA_CHANGED';
 end if;
end $public_clock$;
