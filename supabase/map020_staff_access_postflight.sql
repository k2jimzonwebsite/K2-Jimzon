\set ON_ERROR_STOP on
do $$
begin
  if has_function_privilege('authenticated','public.set_user_role(uuid,text)','execute')
     or has_function_privilege('authenticated','public.set_delete_pin(text)','execute')
     or has_function_privilege('authenticated','public.has_delete_pin()','execute') then
    raise exception 'legacy browser staff-access functions remain executable';
  end if;
  if has_function_privilege('anon','public.read_admin_staff_access_v1()','execute') then
    raise exception 'anon can execute staff-access read';
  end if;
  if not has_function_privilege('authenticated','public.read_admin_staff_access_v1()','execute')
     or not has_function_privilege('authenticated','public.execute_admin_staff_access_command_v1(text,bigint,uuid,uuid,text,text)','execute') then
    raise exception 'prepared staff-access boundary is unavailable';
  end if;
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='k2_private' and c.relname='staff_access_events'
      and c.relrowsecurity and c.relforcerowsecurity) then
    raise exception 'private staff access events are not forced-RLS';
  end if;
end $$;
