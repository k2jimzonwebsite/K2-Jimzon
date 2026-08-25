-- Read-only production postflight for the prepared MAP-020 login/MFA/recovery pre-auth boundary.
-- Run only after an authorized migration application. It prints no secrets or
-- subject hashes and rolls back its read-only transaction.

\set ON_ERROR_STOP on
begin transaction read only;

do $$
declare
  v_function regprocedure := to_regprocedure(
    'public.consume_admin_preauth_rate_v1(text,bigint,uuid,text,text,text)'
  );
begin
  if to_regclass('k2_private.admin_preauth_rate_buckets') is null
     or to_regclass('k2_private.admin_preauth_rate_nonces') is null
     or v_function is null then
    raise exception 'K2_ADMIN_PREAUTH_RATE_POSTFLIGHT_OBJECT_MISSING';
  end if;
  if not has_function_privilege('anon', v_function, 'execute')
     or has_function_privilege('authenticated', v_function, 'execute') then
    raise exception 'K2_ADMIN_PREAUTH_RATE_POSTFLIGHT_FUNCTION_GRANT_INVALID';
  end if;
  if has_table_privilege('anon', 'k2_private.admin_preauth_rate_buckets', 'select')
     or has_table_privilege('anon', 'k2_private.admin_preauth_rate_nonces', 'select')
     or has_table_privilege('authenticated', 'k2_private.admin_preauth_rate_buckets', 'select') then
    raise exception 'K2_ADMIN_PREAUTH_RATE_POSTFLIGHT_TABLE_GRANT_INVALID';
  end if;
  if (
    select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'k2_private'
      and c.relname in ('admin_preauth_rate_buckets', 'admin_preauth_rate_nonces')
      and c.relrowsecurity and c.relforcerowsecurity
  ) <> 2 then
    raise exception 'K2_ADMIN_PREAUTH_RATE_POSTFLIGHT_RLS_INVALID';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where p.oid = v_function and p.prosecdef
      and 'search_path=""' = any(coalesce(p.proconfig, array[]::text[]))
  ) then
    raise exception 'K2_ADMIN_PREAUTH_RATE_POSTFLIGHT_FUNCTION_HARDENING_INVALID';
  end if;
  if not exists (
    select 1 from k2_private.admin_bff_secrets
    where singleton = true and octet_length(request_secret) = 32
  ) then
    raise exception 'K2_ADMIN_PREAUTH_RATE_POSTFLIGHT_SECRET_INVALID';
  end if;
  if (
    select count(*) from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'k2_private'
      and r.relname in ('admin_preauth_rate_buckets', 'admin_preauth_rate_nonces')
      and c.conname like 'admin_preauth_rate_%_action_check'
      and pg_get_constraintdef(c.oid) like '%admin_login%'
      and pg_get_constraintdef(c.oid) like '%admin_mfa%'
      and pg_get_constraintdef(c.oid) like '%password_recovery%'
      and pg_get_constraintdef(c.oid) like '%password_recovery_verify%'
      and pg_get_constraintdef(c.oid) like '%password_recovery_complete%'
  ) <> 2 then
    raise exception 'K2_ADMIN_PREAUTH_RATE_POSTFLIGHT_ACTIONS_INVALID';
  end if;
  if (
    select count(*) from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'k2_private'
      and r.relname = 'admin_preauth_rate_buckets'
      and c.conname = 'admin_preauth_rate_buckets_scope_check'
      and pg_get_constraintdef(c.oid) like '%session%'
  ) <> 1 then
    raise exception 'K2_ADMIN_PREAUTH_RATE_POSTFLIGHT_SCOPES_INVALID';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'k2_private'
      and table_name in ('admin_preauth_rate_buckets', 'admin_preauth_rate_nonces')
      and column_name ~ '(email|ip_address|contact_value|raw)'
  ) or exists (
    select 1 from k2_private.admin_preauth_rate_buckets
    where subject_hash !~ '^[0-9a-f]{64}$'
      or action not in (
        'admin_login', 'admin_mfa', 'password_recovery', 'password_recovery_verify',
        'password_recovery_complete'
      )
  ) then
    raise exception 'K2_ADMIN_PREAUTH_RATE_POSTFLIGHT_PRIVACY_INVALID';
  end if;
end
$$;

select 'K2_ADMIN_PREAUTH_RATE_POSTFLIGHT_OK' as result;
rollback;
