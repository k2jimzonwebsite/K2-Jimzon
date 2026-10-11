-- MAP-018 diagnostic only: deterministic verifier-entry pause in owned RAM.
-- No checks are bypassed. The original definition/metadata is retained/restored.
set search_path='';set statement_timeout='10s';set lock_timeout='2s';
do $owned$
declare d text;anchor text:=E'begin\n';replacement text;
begin
 if session_user<>'postgres' or current_database()<>'postgres'
  or current_setting('data_directory')<>'/tmp/k2-managed-data'
  or inet_server_addr() is not null or current_setting('server_version_num')<>'170006' then
  raise exception 'OWNED_ORDERING_PROBE_REQUIRED';
 end if;
 create table k2_reference_probe.original_verifier(definition text not null,metadata jsonb not null);
 select pg_get_functiondef(p.oid) into d from pg_proc p where p.oid=
  'k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure;
 insert into k2_reference_probe.original_verifier
 select d,to_jsonb(p) from pg_proc p where p.oid=
  'k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure;
 if (length(d)-length(replace(d,anchor,'')))/length(anchor)<>1 then
  raise exception 'ORDERING_VERIFIER_ENTRY_DRIFT';
 end if;
 replacement:=anchor||E'  if p_action=''reference_create'' then\n    perform pg_catalog.pg_advisory_xact_lock(1261585232,987654321);\n  end if;\n';
 execute replace(d,anchor,replacement);
end $owned$;
create function k2_reference_probe.policy_command(p_key uuid) returns jsonb
language plpgsql security invoker set search_path='' as $fixture$
declare payload text;t bigint;n uuid;h text;s text;
begin
 if session_user<>'postgres' or inet_server_addr() is not null then raise exception 'OWNED_SIGNER_REQUIRED';end if;
 payload:=jsonb_build_object('categoryId','88400000-0000-4000-8000-000000000002',
  'minimumDays',91,'expectedVersion','0','reason','Synthetic existing policy ordering qualification')::text;
 t:=extract(epoch from clock_timestamp())::bigint;n:=gen_random_uuid();
 h:=encode(extensions.digest(convert_to(payload,'UTF8'),'sha256'),'hex');
 s:=encode(extensions.hmac(convert_to(concat_ws(E'\n','category_policy_set',t::text,n::text,auth.uid()::text,p_key::text,h),'UTF8'),decode(repeat('19',32),'hex'),'sha256'),'hex');
 return public.execute_admin_product_master_command_v1('category_policy_set',t,n,p_key,payload,s);
end $fixture$;
revoke all on function k2_reference_probe.policy_command(uuid) from public,anon,authenticated,service_role;
grant execute on function k2_reference_probe.policy_command(uuid) to authenticated;
select 'K2_REFERENCE_ORDERING_SETUP_OK';
