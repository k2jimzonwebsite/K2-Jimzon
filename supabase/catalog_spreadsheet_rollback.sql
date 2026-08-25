-- Emergency rollback for the prepared MAP-023 catalog spreadsheet cutover.
-- First disable VITE_ADMIN_BFF_ENABLED and redeploy the Admin artifact. Then run
-- this transaction as the database owner. Audit/operation tables and product
-- identity/version columns are deliberately preserved for investigation.

begin;

revoke execute on function public.execute_admin_catalog_import_v1(
  text,bigint,uuid,uuid,text,text
) from authenticated;
revoke execute on function public.read_admin_catalog_import_status_v1(uuid)
  from authenticated;

-- Restore only the legacy grants that existed before coordinated cutover.
-- Product deletion remains behind its dedicated protected command.
grant insert,update on table public.products to authenticated;

notify pgrst,'reload schema';
commit;
