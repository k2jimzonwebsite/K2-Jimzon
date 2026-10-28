-- Schema/private-boundary assertions only. Behavior is exercised by real
-- committed sessions in customer_privacy_writer_concurrency.sql.
do $$ begin
 if to_regprocedure('k2_private.privacy_freeze_enter()') is null
   or to_regprocedure('k2_private.privacy_writer_enter()') is null
   or to_regclass('k2_private.customer_privacy_freezes') is null then
   raise exception 'NATIVE_PRIVACY_WRITER_BARRIER_MISSING';
 end if;
 if exists(select 1 from pg_constraint where conrelid='k2_private.customer_privacy_freezes'::regclass and contype='f') then
   raise exception 'FREEZE_RECORD_MUST_NOT_LOCK_SCOPE_THROUGH_FK';
 end if;
 if has_table_privilege('anon','k2_private.customer_privacy_freezes','INSERT')
   or has_table_privilege('authenticated','k2_private.customer_privacy_freezes','UPDATE')
   or has_table_privilege('service_role','k2_private.customer_privacy_freezes','DELETE')
   or has_function_privilege('anon','k2_private.privacy_freeze_enter()','EXECUTE')
   or has_function_privilege('authenticated','k2_private.privacy_freeze_enter()','EXECUTE')
   or has_function_privilege('service_role','k2_private.privacy_freeze_enter()','EXECUTE') then
   raise exception 'PRIVATE_FREEZE_BOUNDARY_EXPOSED';
 end if;
end $$;
select 'NATIVE_PRIVACY_WRITER_PRIVATE_BOUNDARY_PASSED';
