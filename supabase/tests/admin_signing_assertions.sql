-- Fixture helpers are transaction-local. No provider credential or real command.
select set_config('request.jwt.claim.sub','42000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal2"}',true);
set local role authenticated;
do $$
declare v_ts bigint:=floor(extract(epoch from clock_timestamp()))::bigint;
 v_nonce uuid:=gen_random_uuid(); v_key uuid:=gen_random_uuid(); v_signature text;
begin
 -- This signature is produced by the actual Node BFF signer for this variant.
 if pg_temp.admin_verify(__NODE_ARGUMENTS__) is distinct from true then
  raise exception 'NODE_SIGNED_CONTROL_REJECTED'; end if;
 v_signature:=pg_temp.admin_signature('confirm_order',v_ts,v_nonce,v_key,'{}');
 if pg_temp.admin_verify('confirm_order',v_ts,v_nonce,v_key,'{}',v_signature) is distinct from true
 or pg_temp.admin_verify('confirm_order',v_ts,v_nonce,v_key,'{}',v_signature) is distinct from false
 then raise exception 'ADMIN_NONCE_REPLAY_INVALID'; end if;
 perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,%s,%L,%L,%L,null)',
  'confirm_order',v_ts,gen_random_uuid(),v_key,'{}'),'K2_ADMIN_REQUEST_INVALID');
 perform pg_temp.admin_expect_error(format('select public.execute_admin_globe_review_command_v1(%L,%s,%L,%L,%L,null)',
  'globe_config_update',v_ts,gen_random_uuid(),v_key,'{}'),'K2_ADMIN_REQUEST_INVALID');
 perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,null,%L,%L,%L,%L)',
  'confirm_order',gen_random_uuid(),v_key,'{}',repeat('0',64)),'K2_ADMIN_REQUEST_INVALID');
 perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(null,%s,%L,%L,%L,%L)',
  v_ts,gen_random_uuid(),v_key,'{}',repeat('0',64)),'K2_ADMIN_REQUEST_INVALID');
 perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,%s,null,%L,%L,%L)',
  'confirm_order',v_ts,v_key,'{}',repeat('0',64)),'K2_ADMIN_REQUEST_INVALID');
 perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,%s,%L,null,%L,%L)',
  'confirm_order',v_ts,gen_random_uuid(),'{}',repeat('0',64)),'K2_ADMIN_REQUEST_INVALID');
 perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,%s,%L,%L,null,%L)',
  'confirm_order',v_ts,gen_random_uuid(),v_key,repeat('0',64)),'K2_ADMIN_REQUEST_INVALID');
 perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,%s,%L,%L,%L,%L)',
  'confirm_order',v_ts,gen_random_uuid(),v_key,'{}','malformed'),'K2_ADMIN_REQUEST_INVALID');
 perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,%s,%L,%L,%L,%L)',
  'confirm_order',v_ts,gen_random_uuid(),v_key,'{}',repeat('0',64)),'K2_ADMIN_SIGNATURE_INVALID');
 perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,%s,%L,%L,%L,%L)',
  'confirm_order',v_ts-600,gen_random_uuid(),v_key,'{}',repeat('0',64)),'K2_ADMIN_SIGNATURE_EXPIRED');
 perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,%s,%L,%L,%L,%L)',
  'confirm_order',v_ts+600,gen_random_uuid(),v_key,'{}',repeat('0',64)),'K2_ADMIN_SIGNATURE_EXPIRED');
 perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,%s,%L,%L,%L,%L)',
  'unrecognized_fixture_action',v_ts,gen_random_uuid(),v_key,'{}',repeat('0',64)),'K2_ADMIN_ACTION_INVALID');
 -- Exercise an existing public caller, not just the private helper.
 perform pg_temp.admin_expect_error(format('select public.execute_admin_fulfillment_command_v1(%L,%s,%L,%L,%L,null)',
  'confirm_order',v_ts,gen_random_uuid(),v_key,'{}'),'K2_ADMIN_REQUEST_INVALID');
end $$;
reset role;

-- The private verifier remains inaccessible to browser roles.
do $$ begin
 if (has_schema_privilege('anon','k2_private','USAGE') and has_function_privilege('anon','k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)','EXECUTE'))
 or (has_schema_privilege('authenticated','k2_private','USAGE') and has_function_privilege('authenticated','k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)','EXECUTE'))
 then raise exception 'PRIVATE_SIGNER_BROWSER_GRANT'; end if;
end $$;
set local role anon;
select pg_temp.admin_expect_error($q$select k2_private.verify_admin_bff_request('confirm_order',0,null,null,'{}',null)$q$,
 'permission denied for schema k2_private');
select pg_temp.admin_expect_error($q$select public.execute_admin_fulfillment_command_v1('confirm_order',0,null,null,'{}',null)$q$,
 'permission denied for function execute_admin_fulfillment_command_v1');
reset role;
select set_config('request.jwt.claim.sub','42000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select pg_temp.admin_expect_error($q$select k2_private.verify_admin_bff_request('confirm_order',0,null,null,'{}',null)$q$,
 'permission denied for schema k2_private');
select pg_temp.admin_expect_error($q$select pg_temp.admin_verify('confirm_order',0,null,null,'{}',null)$q$,'K2_ADMIN_ACCESS_REQUIRED');
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role authenticated;
select pg_temp.admin_expect_error($q$select pg_temp.admin_verify('confirm_order',0,null,null,'{}',null)$q$,'K2_ADMIN_ACCESS_REQUIRED');
reset role;
select set_config('request.jwt.claim.sub','42000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"aal":"aal1"}',true);
set local role authenticated;
select pg_temp.admin_expect_error($q$select pg_temp.admin_verify('confirm_order',0,null,null,'{}',null)$q$,'K2_ADMIN_AAL2_REQUIRED');
reset role;
select set_config('request.jwt.claims','{"aal":"aal2"}',true);

-- Every existing allowlisted action and exact byte cap still works. No command executes.
do $$
declare v_action text; v_payload text; v_ts bigint:=floor(extract(epoch from clock_timestamp()))::bigint;
 v_nonce uuid; v_key uuid; v_limit integer; v_source text; v_actions text;
begin
 select prosrc into v_source from pg_proc where oid='k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure;
 v_actions:=substring(v_source from 'if p_action not in \(([\s\S]*?)\) then');
 if v_actions is null then raise exception 'SIGNER_ACTION_FIXTURE_SCOPE_INVALID'; end if;
 for v_action in select m[1] from regexp_matches(v_actions,'''([^'']+)''','g') m loop
  v_nonce:=gen_random_uuid(); v_key:=gen_random_uuid();
  if pg_temp.admin_verify(v_action,v_ts,v_nonce,v_key,'{}',pg_temp.admin_signature(v_action,v_ts,v_nonce,v_key,'{}')) is distinct from true
  then raise exception 'EXISTING_ACTION_REJECTED: %',v_action; end if;
 end loop;
 for v_action in select unnest(array['confirm_order','catalog_import_chunk']||
  case when position('''marketplace_snapshot_stage''' in v_actions)>0 then array['marketplace_snapshot_stage','marketplace_order_fact_stage'] else array[]::text[] end) loop
  v_limit:=case when v_action='catalog_import_chunk' then 1048576
   when v_action in ('marketplace_snapshot_stage','marketplace_order_fact_stage') then 4194304
   else current_setting('k2.fixture.normal_payload_limit')::integer end;
  v_payload:=repeat('x',v_limit); v_nonce:=gen_random_uuid(); v_key:=gen_random_uuid();
  if pg_temp.admin_verify(v_action,v_ts,v_nonce,v_key,v_payload,pg_temp.admin_signature(v_action,v_ts,v_nonce,v_key,v_payload)) is distinct from true
  then raise exception 'EXISTING_BYTE_CAP_REJECTED: %',v_action; end if;
  perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,%s,%L,%L,%L,%L)',
   v_action,v_ts,gen_random_uuid(),v_key,v_payload||'x',repeat('0',64)),'K2_ADMIN_REQUEST_INVALID');
 end loop;
 if position('K2_ADMIN_RATE_LIMITED' in v_source)>0 then
  insert into k2_private.admin_request_rate_buckets(scope,subject,bucket_start,hit_count)
  values('actor',auth.uid()::text,date_trunc('minute',clock_timestamp()),360)
  on conflict(scope,subject,bucket_start) do update set hit_count=360;
  v_nonce:=gen_random_uuid(); v_key:=gen_random_uuid();
  perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,%s,%L,%L,%L,%L)',
   'confirm_order',v_ts,v_nonce,v_key,'{}',pg_temp.admin_signature('confirm_order',v_ts,v_nonce,v_key,'{}')),'K2_ADMIN_RATE_LIMITED');
  update k2_private.admin_request_rate_buckets set hit_count=1 where scope='actor' and subject=auth.uid()::text;
  insert into k2_private.admin_request_rate_buckets(scope,subject,bucket_start,hit_count)
  values('global','all_admin_requests',date_trunc('minute',clock_timestamp()),6000)
  on conflict(scope,subject,bucket_start) do update set hit_count=6000;
  v_nonce:=gen_random_uuid(); v_key:=gen_random_uuid();
  perform pg_temp.admin_expect_error(format('select pg_temp.admin_verify(%L,%s,%L,%L,%L,%L)',
   'confirm_order',v_ts,v_nonce,v_key,'{}',pg_temp.admin_signature('confirm_order',v_ts,v_nonce,v_key,'{}')),'K2_ADMIN_RATE_LIMITED');
 end if;
end $$;
select 'ADMIN_SIGNING_VARIANT_PASS';
