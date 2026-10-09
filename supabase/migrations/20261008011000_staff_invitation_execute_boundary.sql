-- IDEA-20261007-04 / MAP-017/020. Prepared; restores the explicit service-role
-- contract in 20260814_invite_staff_operation_boundary.sql. No actor semantics
-- or invitation records change. Recovery must keep browser execution closed.
begin;
set local lock_timeout='2s';
set local statement_timeout='10s';
do $invitation_execute$
declare
 v_names text[]:=array['public.claim_staff_invitation_operation(uuid,uuid,text)',
  'public.complete_staff_invitation_operation(uuid,uuid,text,jsonb)',
  'public.release_staff_invitation_operation(uuid,uuid,text)'];
 v_hashes text[]:=array['8aded7af29b18ea7fae95c24af673e34','eba91c5d48aebc45327ea429fb67c4b0','46c54e750fafa94298778b88454ca015'];
 v_oid oid; v_before pg_proc%rowtype; v_after pg_proc%rowtype; i integer;
begin
 for i in 1..3 loop
  v_oid:=to_regprocedure(v_names[i]);
  if v_oid is null then raise exception 'PREFLIGHT_FAILED: invitation helper missing'; end if;
  select * into v_before from pg_catalog.pg_proc where oid=v_oid;
  if md5(replace(v_before.prosrc,E'\r\n',E'\n'))<>v_hashes[i]
     or not v_before.prosecdef
     or not coalesce(v_before.proconfig @> array['search_path=""'],false) then
   raise exception 'PREFLIGHT_FAILED: unfamiliar invitation helper';
  end if;
  execute 'revoke all on function '||v_names[i]||' from public,anon,authenticated';
  execute 'grant execute on function '||v_names[i]||' to service_role';
  select * into v_after from pg_catalog.pg_proc where oid=v_oid;
  if (to_jsonb(v_before)-'proacl') is distinct from (to_jsonb(v_after)-'proacl')
     or has_function_privilege('anon',v_oid,'EXECUTE')
     or has_function_privilege('authenticated',v_oid,'EXECUTE')
     or not has_function_privilege('service_role',v_oid,'EXECUTE') then
   raise exception 'POSTFLIGHT_FAILED: invitation execution boundary';
  end if;
 end loop;
end $invitation_execute$;
commit;
