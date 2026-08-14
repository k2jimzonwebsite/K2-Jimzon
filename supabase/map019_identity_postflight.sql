do $$
declare v_table text;
begin
  foreach v_table in array array[
    'customers', 'customer_contact_points', 'customer_accounts',
    'channel_identities', 'guest_access_grants', 'guest_access_grant_scopes',
    'customer_claim_requests'
  ] loop
    if to_regclass('public.' || v_table) is null then raise exception 'Missing table %', v_table; end if;
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=v_table and c.relrowsecurity and c.relforcerowsecurity
    ) then raise exception 'RLS is not enabled and forced on %', v_table; end if;
    if has_table_privilege('anon', 'public.' || v_table, 'SELECT')
       or has_table_privilege('anon', 'public.' || v_table, 'INSERT')
       or has_table_privilege('anon', 'public.' || v_table, 'UPDATE')
       or has_table_privilege('anon', 'public.' || v_table, 'DELETE') then
      raise exception 'anon privilege remains on %', v_table;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.customers', 'INSERT')
     or has_table_privilege('authenticated', 'public.customer_contact_points', 'INSERT')
     or has_table_privilege('authenticated', 'public.customer_accounts', 'INSERT')
     or has_table_privilege('authenticated', 'public.channel_identities', 'UPDATE')
     or has_table_privilege('authenticated', 'public.guest_access_grants', 'UPDATE') then
    raise exception 'browser roles retain direct hybrid-identity mutation';
  end if;
  if (select count(*) from pg_policies where schemaname='public'
      and tablename in ('customers','customer_contact_points','customer_accounts',
        'channel_identities','guest_access_grants','guest_access_grant_scopes',
        'customer_claim_requests')) <> 7 then
    raise exception 'Unexpected hybrid-identity policy count';
  end if;
  if has_function_privilege('anon', 'public.customer_record_owned_by_current_user(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.customer_record_owned_by_current_user(uuid)', 'EXECUTE') then
    raise exception 'Customer ownership helper grants are incorrect';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='customer_record_owned_by_current_user'
      and p.prosecdef and exists (
        select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) setting
        where setting like 'search_path=%'
      )
  ) then raise exception 'Customer ownership helper is not hardened'; end if;
  if (select count(*) from pg_trigger
      where not tgisinternal and tgname in (
        'trg_validate_customer_account_link', 'trg_validate_guest_access_grant',
        'trg_validate_guest_access_scope', 'trg_validate_customer_claim_request'
      )) <> 4 then raise exception 'Hybrid identity validation triggers are incomplete'; end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in (
      'validate_customer_account_link', 'validate_guest_access_grant',
      'validate_guest_access_scope', 'validate_customer_claim_request'
    ) and (
      not p.prosecdef or not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) setting
        where setting like 'search_path=%'
      )
    )
  ) then raise exception 'A hybrid identity trigger function is not hardened'; end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.conversations'::regclass
      and conname='conversations_customer_id_fkey'
      and pg_get_constraintdef(oid) like '%REFERENCES customers%'
  ) then raise exception 'Conversation customer FK was not canonicalized'; end if;
  if not exists (
    select 1 from information_schema.columns where table_schema='public'
      and table_name='order_requests' and column_name='customer_id'
  ) or not exists (
    select 1 from information_schema.columns where table_schema='public'
      and table_name='pasabuy_requests' and column_name='idempotency_key'
  ) or not exists (
    select 1 from information_schema.columns where table_schema='public'
      and table_name='conversations' and column_name='channel_identity_id'
  ) then raise exception 'Operational identity links are incomplete'; end if;
  raise notice 'MAP-019 identity postflight passed';
end $$;
