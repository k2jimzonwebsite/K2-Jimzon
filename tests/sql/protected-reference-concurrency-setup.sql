-- MAP-018 / IDEA-20261010-06. Synthetic owned RAM setup, discarded by cold recovery.
set search_path='';
set statement_timeout='10s';set lock_timeout='2s';
do $owned$
begin
 if current_database()<>'postgres' or session_user<>'postgres'
  or current_setting('data_directory')<>'/tmp/k2-managed-data' or inet_server_addr() is not null
  or current_setting('server_version_num')<>'170006'
  or to_regprocedure('public.execute_admin_reference_command_v1(text,bigint,uuid,uuid,text,text)') is null then
  raise exception 'OWNED_REFERENCE_CONCURRENCY_REQUIRED';
 end if;
end $owned$;
begin;
insert into auth.users(id,email,raw_user_meta_data)
values('88300000-0000-4000-8000-000000000001','reference-race-admin@dummy.example.test','{}'),
 ('88300000-0000-4000-8000-000000000002','reference-race-staff@dummy.example.test','{}');
update public.user_profiles set role='Admin' where id='88300000-0000-4000-8000-000000000001';
update public.user_profiles set role='Staff' where id='88300000-0000-4000-8000-000000000002';
insert into k2_private.admin_bff_secrets(singleton,request_secret) values(true,decode(repeat('19',32),'hex'))
on conflict(singleton) do update set request_secret=excluded.request_secret;
insert into k2_private.category_policy_command_config(singleton,maximum_depth) values(true,8)
on conflict(singleton) do update set maximum_depth=excluded.maximum_depth;
create schema k2_reference_probe;
revoke all on schema k2_reference_probe from public,anon,authenticated,service_role;
grant usage on schema k2_reference_probe to authenticated;
create function k2_reference_probe.command(p_key uuid,p_kind text,p_name text,p_parent uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fixture$
declare payload text;t bigint;n uuid;h text;s text;
begin
 if session_user<>'postgres' or inet_server_addr() is not null then raise exception 'OWNED_SIGNER_REQUIRED';end if;
 payload:=jsonb_build_object('kind',p_kind,'name',p_name,'parentId',p_parent,'reason','Synthetic concurrent reference qualification')::text;
 t:=extract(epoch from clock_timestamp())::bigint;n:=gen_random_uuid();
 h:=encode(extensions.digest(convert_to(payload,'UTF8'),'sha256'),'hex');
 s:=encode(extensions.hmac(convert_to(concat_ws(E'\n','reference_create',t::text,n::text,auth.uid()::text,p_key::text,h),'UTF8'),decode(repeat('19',32),'hex'),'sha256'),'hex');
 return public.execute_admin_reference_command_v1('reference_create',t,n,p_key,payload,s);
end $fixture$;
revoke all on function k2_reference_probe.command(uuid,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function k2_reference_probe.command(uuid,text,text,uuid) to authenticated;
insert into public.categories(id,name) values
 ('88400000-0000-4000-8000-000000000001','Race parent commit'),
 ('88400000-0000-4000-8000-000000000002','Race parent rollback');
commit;
select 'K2_REFERENCE_CONCURRENCY_SETUP_OK';
