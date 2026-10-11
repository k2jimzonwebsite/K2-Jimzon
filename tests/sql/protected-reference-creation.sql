-- MAP-018 / IDEA-20261010-06. Owned native SQL contract; synthetic actor/signing.
-- This does not establish genuine Auth/PostgREST/BFF or browser acceptance.
set search_path='';
set statement_timeout='10s';
set lock_timeout='2s';
do $owned$
begin
 if current_database()<>'postgres' or session_user<>'postgres'
   or current_setting('data_directory')<>'/tmp/k2-managed-data'
   or inet_server_addr() is not null or current_setting('server_version_num')<>'170006' then
  raise exception 'OWNED_REFERENCE_PROBE_REQUIRED';
 end if;
 if to_regprocedure('public.execute_admin_reference_command_v1(text,bigint,uuid,uuid,text,text)') is null then
  raise exception 'K2_REFERENCE_CREATION_MISSING';
 end if;
end $owned$;

begin;
-- All actors, receipt/nonces, rate counters, taxonomy and events roll back.
insert into auth.users(id,email,raw_user_meta_data)
values('88100000-0000-4000-8000-000000000001','reference-admin@dummy.example.test','{}'),
 ('88100000-0000-4000-8000-000000000002','reference-staff@dummy.example.test','{}');
update public.user_profiles set role='Admin' where id='88100000-0000-4000-8000-000000000001';
update public.user_profiles set role='Staff' where id='88100000-0000-4000-8000-000000000002';
insert into k2_private.admin_bff_secrets(singleton,request_secret)
values(true,decode(repeat('17',32),'hex')) on conflict(singleton) do update set request_secret=excluded.request_secret;
-- Synthetic bound for this rollback fixture, never a production default.
insert into k2_private.category_policy_command_config(singleton,maximum_depth)
values(true,8) on conflict(singleton) do update set maximum_depth=excluded.maximum_depth;

create function pg_temp.reference_fixture_command(p_key uuid,p_kind text,p_name text,p_parent uuid)
returns jsonb language plpgsql security invoker set search_path='' as $fixture$
declare v_payload text;v_timestamp bigint;v_nonce uuid;v_hash text;v_message text;v_signature text;
begin
 -- The owner guard above checked datadir before SET ROLE. The signer remains
 -- invoker and never needs privileged settings or private schema privileges.
 if session_user<>'postgres' or inet_server_addr() is not null then
  raise exception 'OWNED_FIXTURE_SIGNER_REQUIRED';
 end if;
 v_payload:=jsonb_build_object('kind',p_kind,'name',p_name,'parentId',p_parent,'reason','Synthetic native reference qualification')::text;
 v_timestamp:=extract(epoch from clock_timestamp())::bigint;v_nonce:=gen_random_uuid();
 v_hash:=encode(extensions.digest(convert_to(v_payload,'UTF8'),'sha256'),'hex');
 v_message:=concat_ws(E'\n','reference_create',v_timestamp::text,v_nonce::text,auth.uid()::text,p_key::text,v_hash);
 v_signature:=encode(extensions.hmac(convert_to(v_message,'UTF8'),decode(repeat('17',32),'hex'),'sha256'),'hex');
 return public.execute_admin_reference_command_v1('reference_create',v_timestamp,v_nonce,p_key,v_payload,v_signature);
end $fixture$;
do $temporary_schema$
begin
 execute format('grant usage on schema %I to authenticated',
  (select nspname from pg_catalog.pg_namespace where oid=pg_my_temp_schema()));
end $temporary_schema$;
grant execute on function pg_temp.reference_fixture_command(uuid,text,text,uuid) to authenticated;

set local role authenticated;
set local request.jwt.claims='{"sub":"88100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}';
set local lock_timeout='0';
do $deadline$
begin
 begin
  perform pg_temp.reference_fixture_command('88200000-0000-4000-8000-000000000008','brand','Unbounded brand',null);
  raise exception 'UNBOUNDED_BRAND_COMMAND_ACCEPTED';
 exception when object_not_in_prerequisite_state then
  if sqlerrm<>'K2_REFERENCE_DEADLINES_REQUIRED' then raise;end if;
 end;
end $deadline$;
set local lock_timeout='2s';
do $commands$
declare v jsonb;r jsonb;b uuid;root uuid;child uuid;
begin
 v:=pg_temp.reference_fixture_command('88200000-0000-4000-8000-000000000001','brand',U&' Native\00A0Brand ',null);
 if v->>'reused' is distinct from 'false' or v#>>'{reference,name}' is distinct from 'Native Brand'
   or v#>>'{reference,kind}' is distinct from 'brand' or v#>>'{reference,id}' is null then
  raise exception 'BRAND_CREATE_RESULT_INVALID';
 end if;
 b:=(v#>>'{reference,id}')::uuid;
 r:=pg_temp.reference_fixture_command('88200000-0000-4000-8000-000000000001','brand',U&' Native\00A0Brand ',null);
 if r is distinct from v then raise exception 'SAME_KEY_RECEIPT_CHANGED';end if;
 r:=pg_temp.reference_fixture_command('88200000-0000-4000-8000-000000000002','brand','NATIVE BRAND',null);
 if r->>'reused' is distinct from 'true' or (r#>>'{reference,id}')::uuid is distinct from b then raise exception 'DUPLICATE_NOT_REUSED';end if;
 begin
  perform pg_temp.reference_fixture_command('88200000-0000-4000-8000-000000000001','brand','Changed Body',null);
  raise exception 'CHANGED_KEY_BODY_ACCEPTED';
 exception when invalid_parameter_value then
  if sqlerrm<>'K2_ADMIN_IDEMPOTENCY_CONFLICT' then raise;end if;
 end;
 v:=pg_temp.reference_fixture_command('88200000-0000-4000-8000-000000000003','category','Native root',null);
 root:=(v#>>'{reference,id}')::uuid;
 if root is null or v#>>'{reference,kind}' is distinct from 'category' then raise exception 'CATEGORY_ROOT_RESULT_INVALID';end if;
 v:=pg_temp.reference_fixture_command('88200000-0000-4000-8000-000000000004','category','Native child',root);
 child:=(v#>>'{reference,id}')::uuid;
 if child is null or (v#>>'{reference,parentId}')::uuid is distinct from root then raise exception 'CATEGORY_PARENT_LOST';end if;
 r:=pg_temp.reference_fixture_command('88200000-0000-4000-8000-000000000005','category','NATIVE CHILD',root);
 if r->>'reused' is distinct from 'true' or (r#>>'{reference,id}')::uuid is distinct from child then raise exception 'SIBLING_DUPLICATE_NOT_REUSED';end if;
 v:=pg_temp.reference_fixture_command('88200000-0000-4000-8000-000000000006','category','Native child',null);
 if v#>>'{reference,id}' is null or (v#>>'{reference,id}')::uuid=child then raise exception 'DISTINCT_PARENT_COLLAPSED';end if;
 begin
  insert into public.brands(name) values('Unsigned Admin brand');
  raise exception 'UNSIGNED_ADMIN_INSERT_ACCEPTED';
 exception when insufficient_privilege then null;
 end;
end $commands$;

set local request.jwt.claims='{"sub":"88100000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}';
do $staff$
begin
 begin
  perform pg_temp.reference_fixture_command('88200000-0000-4000-8000-000000000007','brand','Staff brand',null);
  raise exception 'SIGNED_STAFF_CREATION_ACCEPTED';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.categories(name) values('Unsigned Staff category');
  raise exception 'UNSIGNED_STAFF_INSERT_ACCEPTED';
 exception when insufficient_privilege then null;
 end;
end $staff$;

reset role;
set local request.jwt.claims='{}';
do $effects$
begin
 if (select count(*) from k2_private.reference_events where actor_id='88100000-0000-4000-8000-000000000001')<>6 then
  raise exception 'REFERENCE_EVENT_COUNT_INVALID';
 end if;
 if (select count(*) from k2_private.admin_command_receipts where actor_id='88100000-0000-4000-8000-000000000001' and action='reference_create')<>6 then
  raise exception 'REFERENCE_RECEIPT_COUNT_INVALID';
 end if;
 if exists(select 1 from k2_private.reference_command_context) then raise exception 'REFERENCE_CONTEXT_NOT_CLEARED';end if;
 begin
  insert into public.brands(name) values(' native   BRAND ');
  raise exception 'INDEPENDENT_DUPLICATE_INSERT_ACCEPTED';
 exception when unique_violation then null;
 end;
 insert into public.brands(name) values('Independent brand');
 begin
  update public.brands set name='NATIVE BRAND' where name='Independent brand';
  raise exception 'INDEPENDENT_DUPLICATE_UPDATE_ACCEPTED';
 exception when unique_violation then null;
 end;
end $effects$;
rollback;
select 'K2_REFERENCE_CREATION_CHECKS_OK';
