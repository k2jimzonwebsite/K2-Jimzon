-- Read-only postflight for the prepared MAP-020 Shopee ingress command.
\set ON_ERROR_STOP on
begin transaction read only;

do $$
declare
  v_function regprocedure := to_regprocedure(
    'public.capture_shopee_event_v1(bigint,text,text,jsonb)'
  );
begin
  if to_regclass('k2_private.shopee_webhook_rate_config') is null
     or to_regclass('k2_private.shopee_webhook_rate_buckets') is null
     or v_function is null then
    raise exception 'K2_SHOPEE_INGRESS_POSTFLIGHT_OBJECT_MISSING';
  end if;
  if not has_function_privilege('service_role', v_function, 'execute')
     or has_function_privilege('anon', v_function, 'execute')
     or has_function_privilege('authenticated', v_function, 'execute') then
    raise exception 'K2_SHOPEE_INGRESS_POSTFLIGHT_FUNCTION_GRANT_INVALID';
  end if;
  if (
    select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'k2_private'
      and c.relname in ('shopee_webhook_rate_config', 'shopee_webhook_rate_buckets')
      and c.relrowsecurity and c.relforcerowsecurity
  ) <> 2 then
    raise exception 'K2_SHOPEE_INGRESS_POSTFLIGHT_RLS_INVALID';
  end if;
  if not exists (
    select 1 from pg_proc p where p.oid = v_function and p.prosecdef
      and 'search_path=""' = any(coalesce(p.proconfig, array[]::text[]))
  ) then
    raise exception 'K2_SHOPEE_INGRESS_POSTFLIGHT_FUNCTION_HARDENING_INVALID';
  end if;
end
$$;

select 'K2_SHOPEE_INGRESS_POSTFLIGHT_OK' as result;
rollback;

