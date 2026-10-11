-- MAP-018 / IDEA-20261010-06. Existing owned setup required; rollback-only probes.
set search_path='';set statement_timeout='10s';set lock_timeout='2s';
do $owned$
begin
 if session_user<>'postgres' or current_database()<>'postgres'
  or current_setting('data_directory')<>'/tmp/k2-managed-data' or inet_server_addr() is not null then
  raise exception 'OWNED_REFERENCE_AUTHORITY_REQUIRED';
 end if;
end $owned$;
-- Ordinary DML needs index evaluation, not direct private namespace access.
begin;
set local role authenticated;
set local request.jwt.claims='{"sub":"88300000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}';
update public.categories set name='Staff indexed update' where id='88400000-0000-4000-8000-000000000002';
update public.brands set name='Staff indexed brand' where id='88600000-0000-4000-8000-000000000001';
do $staff_index$
begin
 if not exists(select 1 from public.brands where id='88600000-0000-4000-8000-000000000001' and name='Staff indexed brand')
  or not exists(select 1 from public.categories where id='88400000-0000-4000-8000-000000000002' and name='Staff indexed update') then
  raise exception 'STAFF_INDEXED_UPDATE_NOT_APPLIED';
 end if;
 begin
  update public.brands set name=' INDEX WRITER TWO ' where id='88600000-0000-4000-8000-000000000001';
  raise exception 'STAFF_INDEX_DUPLICATE_ACCEPTED';
 exception when unique_violation then null;
 end;
 begin
  perform k2_private.reference_name_key_v1('Private direct key');
  raise exception 'STAFF_DIRECT_PRIVATE_KEY_ACCEPTED';
 exception when insufficient_privilege then null;
 end;
end $staff_index$;
rollback;
begin;
set local role service_role;
update public.categories set name='Service indexed update' where id='88400000-0000-4000-8000-000000000002';
update public.brands set name='Service indexed brand' where id='88600000-0000-4000-8000-000000000001';
do $service_index$
begin
 if not exists(select 1 from public.brands where id='88600000-0000-4000-8000-000000000001' and name='Service indexed brand')
  or not exists(select 1 from public.categories where id='88400000-0000-4000-8000-000000000002' and name='Service indexed update') then
  raise exception 'SERVICE_INDEXED_UPDATE_NOT_APPLIED';
 end if;
 begin
  update public.brands set name=' INDEX WRITER TWO ' where id='88600000-0000-4000-8000-000000000001';
  raise exception 'SERVICE_INDEX_DUPLICATE_ACCEPTED';
 exception when unique_violation then null;
 end;
 begin
  perform k2_private.reference_name_key_v1('Private direct key');
  raise exception 'SERVICE_DIRECT_PRIVATE_KEY_ACCEPTED';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.brands(name) values('Unsigned service brand');
  raise exception 'UNSIGNED_SERVICE_INSERT_ACCEPTED';
 exception when insufficient_privilege then null;
 end;
 begin
  perform 1 from k2_private.reference_command_context;
  raise exception 'SERVICE_PRIVATE_CONTEXT_ACCESS_ACCEPTED';
 exception when insufficient_privilege then null;
 end;
end $service_index$;
rollback;
do $metadata$
declare p pg_catalog.pg_proc%rowtype;
begin
 select * into p from pg_catalog.pg_proc where oid='k2_private.reference_name_key_v1(text)'::regprocedure;
 if not p.prosecdef or pg_get_userbyid(p.proowner)<>'postgres'
  or p.proconfig is distinct from array['search_path=""']::text[]
  or p.proacl::text[] is distinct from array['postgres=X/postgres','authenticated=X/postgres','service_role=X/postgres']::text[]
  or replace(p.prosrc,chr(13),'') is distinct from E'\n select pg_catalog.lower(k2_private.clean_reference_name_v1(p_value) collate "default");\n'
  or has_schema_privilege('authenticated','k2_private','USAGE')
  or has_schema_privilege('service_role','k2_private','USAGE')
  or has_function_privilege('anon',p.oid,'EXECUTE')
  or has_function_privilege('authenticated','k2_private.clean_reference_name_v1(text)','EXECUTE')
  or has_function_privilege('service_role','k2_private.clean_reference_name_v1(text)','EXECUTE') then
  raise exception 'REFERENCE_INDEX_HELPER_METADATA_OR_NAMESPACE_DRIFT';
 end if;
end $metadata$;
begin;
select k2_private.lock_category_policy_v1(false);
set local role authenticated;
set local request.jwt.claims='{"sub":"88300000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';
do $upgrade$
begin
 begin
  perform k2_reference_probe.command(gen_random_uuid(),'category','Forbidden upgrade',null);
  raise exception 'CATEGORY_UPGRADE_ACCEPTED';
 exception when object_not_in_prerequisite_state then
  if sqlerrm<>'K2_CATEGORY_POLICY_UPGRADE_REFUSED' then raise;end if;
 end;
 begin
  insert into k2_private.reference_command_context(backend_pid,transaction_id,actor_id,action,request_id,payload_hash,kind,name)
  values(pg_backend_pid(),pg_current_xact_id(),auth.uid(),'reference_create',gen_random_uuid(),repeat('a',64),'brand','Forged');
  raise exception 'PRIVATE_REFERENCE_CONTEXT_FORGED';
 exception when insufficient_privilege then null;
 end;
end $upgrade$;
rollback;
begin;
set local role anon;
do $anonymous$
begin
 begin
  perform public.execute_admin_reference_command_v1('reference_create',extract(epoch from clock_timestamp())::bigint,
   gen_random_uuid(),gen_random_uuid(),'{}',repeat('a',64));
  raise exception 'ANONYMOUS_RPC_EXECUTE_ACCEPTED';
 exception when insufficient_privilege then null;
 end;
end $anonymous$;
rollback;
begin isolation level repeatable read;
set local role authenticated;
set local request.jwt.claims='{"sub":"88300000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';
do $isolation$
begin
 begin
  perform k2_reference_probe.command(gen_random_uuid(),'brand','Wrong isolation',null);
  raise exception 'REPEATABLE_READ_ACCEPTED';
 exception when feature_not_supported then
  if sqlerrm<>'K2_REFERENCE_ISOLATION_UNSUPPORTED' then raise;end if;
 end;
end $isolation$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claims='{"sub":"88300000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}';
do $mfa$
begin
 begin
  perform k2_reference_probe.command(gen_random_uuid(),'brand','Missing MFA',null);
  raise exception 'AAL1_CREATION_ACCEPTED';
 exception when insufficient_privilege then
  if sqlerrm<>'K2_REFERENCE_ADMIN_REQUIRED' then raise;end if;
 end;
end $mfa$;
set local request.jwt.claims='{"sub":"88300000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';
do $tamper$
begin
 begin
  perform public.execute_admin_reference_command_v1('reference_create',extract(epoch from clock_timestamp())::bigint,
   gen_random_uuid(),gen_random_uuid(),'{"kind":"brand","name":"Tampered","parentId":null,"reason":"Tampered fixture request"}',repeat('a',64));
  raise exception 'TAMPERED_SIGNATURE_ACCEPTED';
 exception when invalid_authorization_specification then
  if sqlerrm<>'K2_ADMIN_SIGNATURE_INVALID' then raise;end if;
 end;
end $tamper$;
rollback;
begin;
update public.user_profiles set role='SuperAdmin' where id='88300000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claims='{"sub":"88300000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';
do $superadmin$
declare r jsonb;
begin
 r:=k2_reference_probe.command(gen_random_uuid(),'brand','Synthetic SuperAdmin',null);
 if r->>'reused' is distinct from 'false' or r#>>'{reference,id}' is null then
  raise exception 'SUPERADMIN_CREATION_FAILED';
 end if;
end $superadmin$;
rollback;
do $conservation$
begin
 if (select count(*) from k2_private.reference_events where actor_id='88300000-0000-4000-8000-000000000001')<>4
  or (select count(*) from k2_private.admin_command_receipts where actor_id='88300000-0000-4000-8000-000000000001' and action='reference_create')<>4
  or (select count(*) from k2_private.admin_request_nonces where actor_id='88300000-0000-4000-8000-000000000001')<>5
  or (select coalesce(sum(hit_count),0) from k2_private.admin_request_rate_buckets where scope='actor' and subject='88300000-0000-4000-8000-000000000001')<>5
  or exists(select 1 from k2_private.reference_command_context)
  or exists(select 1 from public.brands where name in ('Forbidden upgrade','Wrong isolation','Missing MFA','Tampered','Synthetic SuperAdmin')) then
  raise exception 'REFERENCE_AUTHORITY_PROBE_LEFT_EFFECTS';
 end if;
end $conservation$;
select 'K2_REFERENCE_AUTHORITY_CHECKS_OK';
