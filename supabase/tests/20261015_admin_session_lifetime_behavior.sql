\set ON_ERROR_STOP on
begin;
do $local_guard$ begin if current_database() <> 'k2_current_restore_admin_session_20261015' then raise exception 'ISOLATED_SESSION_REHEARSAL_ONLY'; end if; end $local_guard$;
select set_config('test.expected', :'expected', true);
do $test$
declare
 actor uuid; provider uuid; sid uuid := extensions.gen_random_uuid(); nonce uuid := extensions.gen_random_uuid(); idem uuid := extensions.gen_random_uuid();
 stamp bigint := extract(epoch from clock_timestamp())::bigint;
 created bigint := floor(extract(epoch from clock_timestamp())*1000)::bigint;
 payload text; sig text; result jsonb; secret bytea;
begin
 select s.user_id,s.id into actor,provider from auth.sessions s join public.user_profiles p on p.id=s.user_id where p.role in ('Admin','SuperAdmin','Staff') order by s.created_at desc limit 1;
 if actor is null then raise exception 'NO_RESTORED_STAFF_PROVIDER_SESSION'; end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'session_id',provider,'aal','aal2','role','authenticated')::text,true);
 select request_secret into secret from k2_private.admin_bff_secrets where singleton;
 payload:=json_build_object('sessionId',sid,'createdAt',created,'expiresAt',created+604800000)::text;
 sig:=encode(extensions.hmac(convert_to(concat_ws(E'\n','admin_session_register',stamp,nonce,actor,idem,encode(extensions.digest(convert_to(payload,'UTF8'),'sha256'),'hex')),'UTF8'),secret,'sha256'),'hex');
 begin
  result:=public.execute_admin_session_command_v1('admin_session_register',stamp,nonce,idem,payload,sig);
  if current_setting('test.expected')<>'success' or result->>'registered'<>'true' then raise exception 'EXPECTED_REGISTER_RESULT_MISMATCH'; end if;
 exception when sqlstate '22023' then
  if current_setting('test.expected')<>'lifetime_rejected' or sqlerrm<>'K2_ADMIN_SESSION_LIFETIME_INVALID' then raise; end if;
 end;
 if current_setting('test.expected')='success' then
  if not exists(select 1 from k2_private.admin_sessions where session_id=sid and expires_at=created_at+interval '7 days') then raise exception 'REGISTER_NOT_PERSISTED'; end if;
  begin
   perform public.execute_admin_session_command_v1('admin_session_register',stamp,extensions.gen_random_uuid(),idem,payload,repeat('0',64));
   raise exception 'INVALID_SIGNATURE_ACCEPTED';
  exception when sqlstate '28000' then if sqlerrm<>'K2_ADMIN_SIGNATURE_INVALID' then raise; end if; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'session_id',provider,'aal','aal1','role','authenticated')::text,true);
  begin
   perform public.execute_admin_session_command_v1('admin_session_register',stamp,extensions.gen_random_uuid(),idem,payload,sig);
   raise exception 'AAL1_ACCEPTED';
  exception when sqlstate '42501' then if sqlerrm<>'K2_ADMIN_AAL2_REQUIRED' then raise; end if; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'session_id',provider,'aal','aal2','role','authenticated')::text,true);
  if not has_function_privilege('authenticated','public.execute_admin_session_command_v1(text,bigint,uuid,uuid,text,text)','execute')
   or has_function_privilege('anon','public.execute_admin_session_command_v1(text,bigint,uuid,uuid,text,text)','execute') then raise exception 'REGISTRY_GRANT_DRIFT'; end if;
  nonce:=extensions.gen_random_uuid();idem:=extensions.gen_random_uuid();sid:=extensions.gen_random_uuid();
  payload:=json_build_object('sessionId',sid,'createdAt',created,'expiresAt',created+28800000)::text;
  sig:=encode(extensions.hmac(convert_to(concat_ws(E'\n','admin_session_register',stamp,nonce,actor,idem,encode(extensions.digest(convert_to(payload,'UTF8'),'sha256'),'hex')),'UTF8'),secret,'sha256'),'hex');
  begin
   perform public.execute_admin_session_command_v1('admin_session_register',stamp,nonce,idem,payload,sig);
   raise exception 'INVALID_EIGHT_HOUR_ACCEPTED';
  exception when sqlstate '22023' then if sqlerrm<>'K2_ADMIN_SESSION_LIFETIME_INVALID' then raise; end if; end;
 end if;
end
$test$;
rollback;
