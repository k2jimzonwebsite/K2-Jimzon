-- IDEA-20261002-05 / MAP-018. Prepared recovery only; not a production migration.
-- Supply the previously captured depth and exact signed payload-function body hash.
\if :{?expected_maximum_depth}
\else
\echo expected_maximum_depth is required
\quit 3
\endif
\if :{?expected_execute_body_sha256}
\else
\echo expected_execute_body_sha256 is required
\quit 3
\endif

begin;
set local lock_timeout='2s';
set local statement_timeout='10s';
set local search_path='';
-- Exclude shared-admission writers before inspecting or changing their config.
select pg_catalog.pg_advisory_xact_lock(1261585232,1347374169);
select set_config('k2.category_policy_recovery.expected_depth', :'expected_maximum_depth', true);
select set_config('k2.category_policy_recovery.expected_body_sha256', :'expected_execute_body_sha256', true);

do $deactivate$
declare
 v_depth_text text:=current_setting('k2.category_policy_recovery.expected_depth');
 v_body_sha text:=current_setting('k2.category_policy_recovery.expected_body_sha256');
 v_depth integer;
 v_rows integer;
 v_actual_depth integer;
 v_deleted integer;
begin
 if v_depth_text!~'^[1-9][0-9]{0,8}$' or v_body_sha!~'^[0-9a-f]{64}$' then
  raise exception 'K2_CATEGORY_POLICY_RECOVERY_INPUT_INVALID';
 end if;
 v_depth:=v_depth_text::integer;
 if current_user<>'postgres'
    or not exists(
     select 1 from pg_catalog.pg_proc p
     join pg_catalog.pg_language l on l.oid=p.prolang
     where p.oid=pg_catalog.to_regprocedure('k2_private.execute_category_policy_payload_v1(text,jsonb)')
       and pg_catalog.pg_get_userbyid(p.proowner)='postgres'
       and p.prosecdef and p.proconfig is not distinct from array['search_path=""']
       and p.provolatile='v' and p.prokind='f' and l.lanname='plpgsql'
       and not exists(
        select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
        where (a.grantee=0 or a.grantee in
          (select oid from pg_catalog.pg_roles where rolname in ('anon','authenticated','service_role')))
          and a.privilege_type='EXECUTE')
       and pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p.prosrc,'UTF8'),'sha256'),'hex')=v_body_sha
    )
    or not exists(
     select 1 from pg_catalog.pg_class c
     where c.oid=pg_catalog.to_regclass('k2_private.category_policy_command_config')
       and pg_catalog.pg_get_userbyid(c.relowner)='postgres' and c.relrowsecurity
       and not exists(
        select 1 from pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
        where (a.grantee=0 or a.grantee in
          (select oid from pg_catalog.pg_roles where rolname in ('anon','authenticated','service_role')))
          and a.privilege_type in ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'))
    ) then
  raise exception 'K2_CATEGORY_POLICY_RECOVERY_GUARD_FAILED';
 end if;

 select count(*),max(maximum_depth) into v_rows,v_actual_depth
 from k2_private.category_policy_command_config;
 if v_rows=0 then
  return;
 end if;
 if v_rows<>1 or v_actual_depth is distinct from v_depth then
  raise exception 'K2_CATEGORY_POLICY_RECOVERY_CONFIG_DRIFT';
 end if;
 delete from k2_private.category_policy_command_config
 where singleton and maximum_depth=v_depth;
 get diagnostics v_deleted=row_count;
 if v_deleted<>1 then
  raise exception 'K2_CATEGORY_POLICY_RECOVERY_CONFIG_DRIFT';
 end if;
end $deactivate$;

commit;
