-- Read-only applicability and post-apply checks for MAP-017's separate follow-up.
-- Zero function bodies, credentials, customer rows or error contents are returned.
with targets(signature, expected_return, receiving) as (values
  ('public.prevent_conversation_event_mutation()', 'trigger', false),
  ('public.reject_event_mutation()', 'trigger', false),
  ('public.sync_product_batch_compat_columns()', 'trigger', false),
  ('public.sync_product_compat_columns()', 'trigger', false),
  ('public.touch_staff_allocations()', 'trigger', false),
  ('public.receive_po(uuid)', 'boolean', true),
  ('public.receive_po_scanned(uuid,jsonb)', 'boolean', true)
), functions as (
  select t.*, p.oid, p.proowner, p.proacl, p.prorettype
  from targets t left join pg_proc p on p.oid=to_regprocedure(t.signature)
), error_relation as (
  select c.oid, c.relrowsecurity from pg_class c
  where c.oid=to_regclass('public.error_reports') and c.relkind='r'
)
select jsonb_build_object(
  'seven_signatures_present', (select count(oid)=7 from functions),
  'expected_function_types', (select bool_and(coalesce(prorettype=to_regtype(expected_return),false)) from functions),
  'functions_owned_by_postgres', (select bool_and(coalesce(proowner=(select oid from pg_roles where rolname='postgres'),false)) from functions),
  'browser_function_execute_removed', (select bool_and(
    coalesce(not has_function_privilege('anon',oid,'EXECUTE'),false)
    and coalesce(not has_function_privilege('authenticated',oid,'EXECUTE'),false)) from functions),
  'public_function_execute_removed', (select count(oid)=7 and not exists(
    select 1 from functions f, lateral aclexplode(coalesce(f.proacl,acldefault('f',f.proowner))) a
    where a.grantee=0 and a.privilege_type='EXECUTE') from functions),
  'receiving_service_execute_preserved', (select bool_and(coalesce(has_function_privilege('service_role',oid,'EXECUTE'),false)) from functions where receiving),
  'error_reports_rls_enabled', coalesce((select relrowsecurity from error_relation),false),
  'error_reports_browser_insert_removed', coalesce((select
    not has_table_privilege('anon',oid,'INSERT') and not has_table_privilege('authenticated',oid,'INSERT')
    from error_relation),false),
  'error_reports_browser_insert_policies_removed', exists(select 1 from error_relation) and not exists(
    select 1 from pg_policy p where p.polrelid=to_regclass('public.error_reports')
    and p.polcmd in ('a','*') and (0=any(p.polroles) or p.polroles &&
      array(select oid from pg_roles where rolname in ('anon','authenticated')))),
  'error_reports_staff_read_preserved', coalesce((select has_table_privilege('authenticated',oid,'SELECT') from error_relation),false)
    and exists(select 1 from pg_policy p where p.polrelid=to_regclass('public.error_reports')
      and p.polname='error_reports_staff_read' and p.polcmd='r'
      and (select oid from pg_roles where rolname='authenticated')=any(p.polroles)
      and pg_get_expr(p.polqual,p.polrelid) in ('is_staff()','public.is_staff()')),
  'public_stock_view_select_preserved', coalesce(has_table_privilege('anon',to_regclass('public.v_product_stock_from_batches'),'SELECT'),false)
) as verification;
