\set ON_ERROR_STOP on
do $$
begin
  if has_function_privilege('anon','public.read_admin_channel_readiness_v1()','execute') then
    raise exception 'anon can execute channel readiness read';
  end if;
  if not has_function_privilege('authenticated','public.read_admin_channel_readiness_v1()','execute') then
    raise exception 'authenticated cannot execute channel readiness read';
  end if;
  if has_function_privilege('authenticated','public.verify_internal_channel_event(text,text,text)','execute') then
    raise exception 'legacy browser channel verification remains executable';
  end if;
  if not has_function_privilege('authenticated','public.execute_admin_channel_command_v1(text,bigint,uuid,uuid,text,text)','execute') then
    raise exception 'signed channel command is unavailable';
  end if;
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='k2_private' and c.relname='channel_verification_events'
      and c.relrowsecurity and c.relforcerowsecurity) then
    raise exception 'private channel events are not forced-RLS';
  end if;
end $$;
