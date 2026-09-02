\set ON_ERROR_STOP on

begin;

do $$
declare
  v_before bigint;
  v_after bigint;
  v_denied integer := 0;
  v_attempt integer;
  v_role text;
  v_probe_id uuid;
  v_visible bigint;
begin
  if has_table_privilege('anon', 'public.error_reports', 'insert')
     or has_table_privilege('authenticated', 'public.error_reports', 'insert') then
    raise exception 'MAP017_ERROR_REPORT_BROWSER_GRANT_REMAINS';
  end if;

  insert into public.error_reports(message, context)
  values ('staff-read-proof', '{"purpose":"authorization-test"}'::jsonb)
  returning id into v_probe_id;

  select count(*) into v_before from public.error_reports;

  for v_role in select * from (values ('anon'), ('authenticated')) as browser_roles(name) loop
    for v_attempt in select generate_series(1, 100) loop
      begin
        execute format('set local role %I', v_role);
        insert into public.error_reports(message, context)
        values ('must-not-persist', jsonb_build_object('role', v_role, 'attempt', v_attempt));
        execute 'reset role';
      exception
        when insufficient_privilege then
          v_denied := v_denied + 1;
      end;
    end loop;
  end loop;

  execute 'reset role';
  select count(*) into v_after from public.error_reports;
  if v_denied <> 200 or v_after <> v_before then
    raise exception 'MAP017_ERROR_REPORT_FLOOD_NOT_DENIED: denied=%, before=%, after=%',
      v_denied, v_before, v_after;
  end if;

  raise notice 'MAP017_ERROR_REPORT_FLOOD_DENIED';

  perform set_config('request.jwt.claims', '{"app_role":"Staff"}', true);
  execute 'set local role authenticated';
  select count(*) into v_visible from public.error_reports where id = v_probe_id;
  execute 'reset role';
  if v_visible <> 1 then
    raise exception 'MAP017_ERROR_REPORT_STAFF_READ_NOT_PRESERVED';
  end if;

  raise notice 'MAP017_ERROR_REPORT_STAFF_READ_PRESERVED';

  perform set_config('request.jwt.claims', '{"app_role":"Customer"}', true);
  execute 'set local role authenticated';
  select count(*) into v_visible from public.error_reports where id = v_probe_id;
  execute 'reset role';
  if v_visible <> 0 then
    raise exception 'MAP017_ERROR_REPORT_NON_STAFF_READ_REMAINS';
  end if;

  raise notice 'MAP017_ERROR_REPORT_NON_STAFF_READ_DENIED';
end
$$;

rollback;
