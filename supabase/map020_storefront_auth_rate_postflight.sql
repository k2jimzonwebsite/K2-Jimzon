\set ON_ERROR_STOP on
begin transaction read only;

do $$
declare
  v_function regprocedure := to_regprocedure(
    'public.consume_storefront_customer_auth_rate_v1(text,bigint,uuid,text,text,text)'
  );
begin
  if to_regclass('k2_private.storefront_auth_rate_buckets') is null
     or to_regclass('k2_private.storefront_auth_rate_nonces') is null
     or v_function is null then
    raise exception 'K2_STOREFRONT_AUTH_RATE_POSTFLIGHT_OBJECT_MISSING';
  end if;
  if not has_function_privilege('anon', v_function, 'execute')
     or has_function_privilege('authenticated', v_function, 'execute') then
    raise exception 'K2_STOREFRONT_AUTH_RATE_POSTFLIGHT_GRANT_INVALID';
  end if;
  if (
    select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'k2_private'
      and c.relname in ('storefront_auth_rate_buckets', 'storefront_auth_rate_nonces')
      and c.relrowsecurity and c.relforcerowsecurity
  ) <> 2 then
    raise exception 'K2_STOREFRONT_AUTH_RATE_POSTFLIGHT_RLS_INVALID';
  end if;
  if not exists (
    select 1 from pg_proc p where p.oid = v_function and p.prosecdef
      and 'search_path=""' = any(coalesce(p.proconfig, array[]::text[]))
  ) then
    raise exception 'K2_STOREFRONT_AUTH_RATE_POSTFLIGHT_HARDENING_INVALID';
  end if;
  if (
    select count(*) from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'k2_private'
      and r.relname in ('storefront_auth_rate_buckets', 'storefront_auth_rate_nonces')
      and c.conname like 'storefront_auth_rate_%_action_check'
      and pg_get_constraintdef(c.oid) like '%customer_auth_email_request%'
      and pg_get_constraintdef(c.oid) like '%customer_auth_sms_request%'
      and pg_get_constraintdef(c.oid) like '%customer_auth_sms_verify%'
  ) <> 2 then
    raise exception 'K2_STOREFRONT_AUTH_RATE_POSTFLIGHT_ACTIONS_INVALID';
  end if;
end
$$;

select 'K2_STOREFRONT_AUTH_RATE_POSTFLIGHT_OK' as result;
rollback;
