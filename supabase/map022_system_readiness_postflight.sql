\set ON_ERROR_STOP on
do $$
begin
  if has_function_privilege('anon','public.read_admin_system_readiness_v1()','execute') then
    raise exception 'anon can execute system readiness';
  end if;
  if not has_function_privilege('authenticated','public.read_admin_system_readiness_v1()','execute') then
    raise exception 'authenticated cannot execute protected system readiness';
  end if;
end $$;
