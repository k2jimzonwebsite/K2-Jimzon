begin;

do $$
begin
  if to_regclass('public.error_reports') is null then
    raise exception 'K2_MAP017_ERROR_REPORTS_TABLE_REQUIRED';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'error_reports'
      and c.relkind = 'r'
      and c.relrowsecurity
  ) then
    raise exception 'K2_MAP017_ERROR_REPORTS_RLS_REQUIRED';
  end if;
end
$$;

drop policy if exists "Anyone can log errors" on public.error_reports;
drop policy if exists error_reports_public_insert on public.error_reports;
revoke insert on public.error_reports from anon, authenticated;

do $$
begin
  if has_table_privilege('anon', 'public.error_reports', 'insert')
     or has_table_privilege('authenticated', 'public.error_reports', 'insert') then
    raise exception 'K2_MAP017_ERROR_REPORT_BROWSER_INSERT_REMAINS';
  end if;

  if exists (
    select 1
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'error_reports'
      and p.polcmd in ('a', '*')
      and (
        p.polroles = '{0}'::oid[]
        or exists (
          select 1
          from unnest(p.polroles) role_oid
          join pg_roles r on r.oid = role_oid
          where r.rolname in ('anon', 'authenticated')
        )
      )
  ) then
    raise exception 'K2_MAP017_ERROR_REPORT_BROWSER_POLICY_REMAINS';
  end if;

  if not has_table_privilege('authenticated', 'public.error_reports', 'select')
     or not exists (
       select 1
       from pg_policy p
       join pg_class c on c.oid = p.polrelid
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relname = 'error_reports'
         and p.polcmd in ('r', '*')
         and exists (
           select 1
           from unnest(p.polroles) role_oid
           join pg_roles r on r.oid = role_oid
           where r.rolname = 'authenticated'
         )
     ) then
    raise exception 'K2_MAP017_ERROR_REPORT_STAFF_READ_REQUIRED';
  end if;

  raise notice 'MAP017_ERROR_REPORT_BOUNDARY_VERIFIED';
end
$$;

commit;
