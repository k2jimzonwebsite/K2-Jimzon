-- IDEA-20261002-05 / MAP-018. Private preparation only, outside activation migrations.
-- Caller selects the strongest mode at command entry, before operational resources.
-- Caller must configure actual command/request timers before submitting its statement,
-- retain one transaction, then resolve policy in a subsequent fresh statement.
-- Reading GUC values here does not establish when an active statement timer was started.
do $preflight$
begin
 if current_user<>'postgres' or to_regnamespace('k2_private') is null then
  raise exception 'K2_CATEGORY_ENTRY_TARGET_INVALID';
 end if;
 if to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is not null then
  raise exception 'K2_CATEGORY_ENTRY_ALREADY_PRESENT';
 end if;
end $preflight$;

create function k2_private.lock_category_policy_v1(p_exclusive boolean) returns void
language plpgsql volatile security definer set search_path='' as $entry$
declare
 v_namespace integer:=1261585232;
 v_resource integer:=1347374169;
 v_shared boolean;
 v_exclusive boolean;
 v_lock_timeout interval;
 v_statement_timeout interval;
begin
 if p_exclusive is null then
  raise exception using errcode='22023',message='K2_CATEGORY_POLICY_MODE_REQUIRED';
 end if;
 if pg_catalog.current_setting('transaction_isolation')<>'read committed' then
  raise exception using errcode='0A000',message='K2_CATEGORY_POLICY_ISOLATION_UNSUPPORTED';
 end if;
 v_lock_timeout:=pg_catalog.current_setting('lock_timeout')::interval;
 v_statement_timeout:=pg_catalog.current_setting('statement_timeout')::interval;
 if v_lock_timeout<=interval '0' or v_lock_timeout>interval '2 seconds'
    or v_statement_timeout<=interval '0' or v_statement_timeout>interval '10 seconds' then
  raise exception using errcode='55000',message='K2_CATEGORY_POLICY_DEADLINES_REQUIRED';
 end if;
 select coalesce(pg_catalog.bool_or(l.mode='ShareLock'),false),
        coalesce(pg_catalog.bool_or(l.mode='ExclusiveLock'),false)
  into v_shared,v_exclusive from pg_catalog.pg_locks l
  where l.locktype='advisory' and l.pid=pg_catalog.pg_backend_pid()
    and l.classid=v_namespace::oid and l.objid=v_resource::oid
    and l.objsubid=2 and l.granted;
 if v_exclusive then return; end if;
 if v_shared then
  if p_exclusive then
   raise exception using errcode='55000',message='K2_CATEGORY_POLICY_UPGRADE_REFUSED';
  end if;
  return;
 end if;
 if p_exclusive then
  perform pg_catalog.pg_advisory_xact_lock(v_namespace,v_resource);
 else
  perform pg_catalog.pg_advisory_xact_lock_shared(v_namespace,v_resource);
 end if;
end $entry$;
revoke all on function k2_private.lock_category_policy_v1(boolean)
 from public,anon,authenticated,service_role;
