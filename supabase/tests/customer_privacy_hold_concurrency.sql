-- Only a committed disposable clone in the already owned loopback cluster.
-- All fixture signers and dynamic SQL helpers are test-only, never deployable.
do $$ begin
 if current_database() !~ '^k2_native_hold_[0-9a-f]{32}$' or inet_server_addr()<>'127.0.0.1'::inet then
   raise exception 'OWNED_NATIVE_HOLD_CLONE_REQUIRED'; end if;
end $$;
create extension dblink with schema public;
create table k2_hold_fixture.context(name text primary key, value jsonb not null);
create function k2_hold_fixture.run(statement text) returns jsonb language plpgsql as $$
declare actor uuid; result jsonb;
begin
 select initiator_id into strict actor from k2_private.customer_privacy_hold_intents order by created_at,id limit 1;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
 execute statement into result;
 return jsonb_build_object('ok',true,'result',result);
exception when others then return jsonb_build_object('ok',false,'code',sqlstate,'message',sqlerrm);
end $$;
create function k2_hold_fixture.second_request() returns uuid language plpgsql as $$
declare subject uuid:=gen_random_uuid(); customer uuid:=gen_random_uuid(); contact uuid:=gen_random_uuid(); request uuid:=gen_random_uuid(); admin uuid;
begin
 select initiator_id into strict admin from k2_private.customer_privacy_hold_intents order by created_at,id limit 1;
 insert into auth.users(id,email,email_confirmed_at,created_at,updated_at,aud,role,raw_app_meta_data,raw_user_meta_data)
 values(subject,'native-race-'||subject::text||'@example.invalid',clock_timestamp(),clock_timestamp(),clock_timestamp(),'authenticated','authenticated','{}','{}');
 insert into public.customers(id,display_name,created_source) values(customer,'Synthetic concurrent hold','website_account');
 insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,verification_status,verified_at,source)
 values(contact,customer,'email','native-race-'||subject::text||'@example.invalid',extensions.digest(subject::text,'sha256'),'verified',clock_timestamp(),'website_account');
 insert into public.customer_accounts(user_id,customer_id,verified_contact_point_id) values(subject,customer,contact);
 insert into k2_private.customer_privacy_requests(id,user_id,customer_id,channel,receipt_hash,state,verified_at,assigned_to)
 values(request,subject,customer,'email',extensions.digest(request::text,'sha256'),'pending',clock_timestamp(),admin);
 return request;
end $$;
insert into k2_hold_fixture.context values
 ('request1',to_jsonb((select request_id from k2_private.customer_privacy_hold_intents order by created_at,id limit 1))),
 ('request2',to_jsonb(k2_hold_fixture.second_request()));
-- Each setup statement commits before either competing native session starts.
insert into k2_hold_fixture.context
select 'case'||n,k2_hold_fixture.run(format('select k2_private.prepare_privacy_hold_intent(%L,%L)',gen_random_uuid(),
 jsonb_build_object('requestId',(select value from k2_hold_fixture.context where name='request1'),'kind','legal','reason','Synthetic concurrent review')::text))
from generate_series(1,4) n;
do $$ declare row record; outcome jsonb; cap jsonb; begin
 for row in select value from k2_hold_fixture.context where name like 'case%' loop
   if row.value->>'ok' is distinct from 'true' then raise exception 'CONCURRENT_HOLD_SETUP_FAILED'; end if;
 end loop;
 for row in select value from k2_hold_fixture.context where name in('case2','case3','case4') loop
   cap:=k2_hold_fixture.hold_capability((row.value->'result'->'command'->>'operationId')::uuid);
   outcome:=k2_hold_fixture.run(format('select k2_private.project_privacy_hold_intent(%L,%L)',
     cap->>'body',cap->>'mac'));
   if outcome->>'ok' is distinct from 'true' then raise exception 'CONCURRENT_PROJECT_SETUP_FAILED'; end if;
 end loop;
end $$;
select public.dblink_connect('native_left',format('host=127.0.0.1 port=%s dbname=%s user=postgres application_name=k2_native_hold_left',current_setting('port'),current_database()));
select public.dblink_connect('native_right',format('host=127.0.0.1 port=%s dbname=%s user=postgres application_name=k2_native_hold_right',current_setting('port'),current_database()));
select public.dblink_exec('native_left','set statement_timeout=''8s''');
select public.dblink_exec('native_right','set statement_timeout=''8s''');

create function k2_hold_fixture.race(left_statement text,right_statement text,repeatable boolean default false) returns jsonb language plpgsql as $$
declare first jsonb; second jsonb; until_time timestamptz:=clock_timestamp()+interval '1 second'; observed boolean:=false;
begin
 perform public.dblink_exec('native_left','begin');
 select body into first from public.dblink('native_left',format('select k2_hold_fixture.run(%L)',left_statement)) x(body jsonb);
 if first->>'ok' is distinct from 'true' then raise exception 'CONCURRENT_LEFT_NATIVE_OPERATION_FAILED: %',first; end if;
 if repeatable then
   perform public.dblink_exec('native_right','begin isolation level repeatable read');
   perform n from public.dblink('native_right','select count(*) from k2_private.customer_privacy_hold_operations') x(n bigint);
 end if;
 if public.dblink_send_query('native_right',format('select k2_hold_fixture.run(%L)',right_statement))<>1 then raise exception 'CONCURRENT_SEND_FAILED'; end if;
 while clock_timestamp()<until_time loop
   perform pg_stat_clear_snapshot();
   if exists(select 1 from pg_stat_activity where datname=current_database() and application_name='k2_native_hold_right' and wait_event_type='Lock') then observed:=true; exit; end if;
   perform pg_sleep(0.01);
 end loop;
 if not observed then raise exception 'CONCURRENT_NATIVE_LOCK_NOT_OBSERVED'; end if;
 perform public.dblink_exec('native_left','commit');
 select body into second from public.dblink_get_result('native_right') x(body jsonb);
 -- libpq's final empty result must be consumed before reusing this connection.
 perform body from public.dblink_get_result('native_right') x(body jsonb);
 if repeatable then perform public.dblink_exec('native_right','rollback'); end if;
 return second;
end $$;
create temp table native_hold_race_results(name text primary key);
do $cases$
declare intent uuid; payload text; cap jsonb; outcome jsonb; shared_operation uuid; second_request uuid;
begin
 select (value->'result'->'command'->>'operationId')::uuid into intent from k2_hold_fixture.context where name='case1';
 cap:=k2_hold_fixture.hold_capability(intent);
 payload:=jsonb_build_object('intentId',intent,'holdId',(select hold_id from k2_private.customer_privacy_hold_intents where id=intent),'reason','Synthetic race resolved')::text;
 outcome:=k2_hold_fixture.race(format('select k2_private.project_privacy_hold_intent(%L,%L)',cap->>'body',cap->>'mac'),
   format('select k2_private.resolve_privacy_hold_intent(%L,%L)',gen_random_uuid(),payload));
 if outcome->>'ok' is distinct from 'true' or (select state from k2_private.customer_privacy_hold_intents where id=intent)<>'resolved' then raise exception 'PROJECTION_THEN_RESOLUTION_RACE_FAILED'; end if;
 insert into native_hold_race_results values('uncommitted projection serializes before resolution');

 select (value->'result'->'command'->>'operationId')::uuid into intent from k2_hold_fixture.context where name='case2';
 cap:=k2_hold_fixture.hold_capability(intent);
 payload:=jsonb_build_object('intentId',intent,'holdId',(select hold_id from k2_private.customer_privacy_hold_intents where id=intent),'reason','Synthetic race resolved')::text;
 outcome:=k2_hold_fixture.race(format('select k2_private.resolve_privacy_hold_intent(%L,%L)',gen_random_uuid(),payload),
   format('select k2_private.project_privacy_hold_intent(%L,%L)',cap->>'body',cap->>'mac'));
 if outcome->>'ok' is distinct from 'true' or outcome->'result'->>'currentState' is distinct from 'resolved' then raise exception 'RESOLUTION_THEN_PROJECTION_RACE_FAILED'; end if;
 if (select count(*) from k2_private.customer_privacy_review_events where hold_id=(select hold_id from k2_private.customer_privacy_hold_intents where id=intent))<>2 then raise exception 'DELAYED_PROJECT_RACE_DUPLICATED_EVENT'; end if;
 insert into native_hold_race_results values('uncommitted resolution permanently blocks late projection reinsertion');

 select (value#>>'{}')::uuid into second_request from k2_hold_fixture.context where name='request2';
 select (value->'result'->'command'->>'operationId')::uuid into intent from k2_hold_fixture.context where name='case3';
 shared_operation:=gen_random_uuid();
 payload:=jsonb_build_object('intentId',intent,'holdId',(select hold_id from k2_private.customer_privacy_hold_intents where id=intent),'reason','Synthetic race resolved')::text;
 outcome:=k2_hold_fixture.race(format('select k2_private.resolve_privacy_hold_intent(%L,%L)',shared_operation,payload),
   format('select k2_private.prepare_privacy_hold_intent(%L,%L)',shared_operation,jsonb_build_object('requestId',second_request,'kind','legal','reason','Synthetic cross customer')::text),true);
 if outcome->>'ok' is distinct from 'false' or outcome->>'code' not in('40001','P0001') then raise exception 'RESOLUTION_KEY_REUSED_FOR_PREPARE'; end if;
 if exists(select 1 from k2_private.customer_privacy_hold_intents where id=shared_operation)
   or not exists(select 1 from k2_private.customer_privacy_hold_operations where operation_id=shared_operation and kind='release_protection' and intent_id=intent) then raise exception 'RESOLUTION_WINNER_KEY_CHANGED'; end if;
 insert into native_hold_race_results values('release key prevents cross-customer protect reuse under repeatable read');

 select (value->'result'->'command'->>'operationId')::uuid into intent from k2_hold_fixture.context where name='case4';
 shared_operation:=gen_random_uuid();
 payload:=jsonb_build_object('intentId',intent,'holdId',(select hold_id from k2_private.customer_privacy_hold_intents where id=intent),'reason','Synthetic race resolved')::text;
 outcome:=k2_hold_fixture.race(format('select k2_private.prepare_privacy_hold_intent(%L,%L)',shared_operation,jsonb_build_object('requestId',second_request,'kind','legal','reason','Synthetic cross customer')::text),
   format('select k2_private.resolve_privacy_hold_intent(%L,%L)',shared_operation,payload),true);
 if outcome->>'ok' is distinct from 'false' or outcome->>'code' not in('40001','P0001')
   or (select state from k2_private.customer_privacy_hold_intents where id=intent)<>'projected' then raise exception 'PROTECT_KEY_REUSED_FOR_RELEASE'; end if;
 if not exists(select 1 from k2_private.customer_privacy_hold_operations where operation_id=shared_operation and kind='protect' and intent_id=shared_operation) then raise exception 'PROTECT_WINNER_KEY_CHANGED'; end if;
 insert into native_hold_race_results values('protect key prevents cross-customer release reuse under repeatable read');
end $cases$;
select public.dblink_disconnect('native_left');
select public.dblink_disconnect('native_right');
select jsonb_build_object('checks',(select jsonb_agg(name order by name) from native_hold_race_results),
 'disconnected',public.dblink_get_connections() is null);
