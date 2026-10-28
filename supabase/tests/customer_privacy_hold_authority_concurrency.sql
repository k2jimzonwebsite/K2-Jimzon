-- Same exact owned clone guard as the other committed native races.
do $$ begin
 if current_database() !~ '^k2_native_hold_[0-9a-f]{32}$' or inet_server_addr()<>'127.0.0.1'::inet then raise exception 'OWNED_NATIVE_HOLD_CLONE_REQUIRED'; end if;
end $$;
create function k2_hold_fixture.expiring_refusal(capability text,signature text) returns jsonb language plpgsql as $$ begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 return jsonb_build_object('ok',true,'result',public.transition_customer_privacy_hold_v1(capability,signature));
exception when others then return jsonb_build_object('ok',false,'message',sqlerrm);
end $$;
insert into k2_hold_fixture.context(name,value)
select 'expiry',k2_hold_fixture.run(format('select k2_private.prepare_privacy_hold_intent(%L,%L)',gen_random_uuid(),
 jsonb_build_object('requestId',(select value from k2_hold_fixture.context where name='request1'),'kind','legal','reason','Synthetic expiry race')::text));
select public.dblink_connect('expiry_left',format('host=127.0.0.1 port=%s dbname=%s user=postgres application_name=k2_hold_expiry_left',current_setting('port'),current_database()));
select public.dblink_connect('expiry_right',format('host=127.0.0.1 port=%s dbname=%s user=postgres application_name=k2_hold_expiry_right',current_setting('port'),current_database()));
select public.dblink_exec('expiry_right','set statement_timeout=''5s''');
do $race$
declare i k2_private.customer_privacy_hold_intents; cap jsonb; expiry bigint; outcome jsonb;
 until_time timestamptz; observed boolean:=false;
begin
 select * into strict i from k2_private.customer_privacy_hold_intents where id=(select (value->'result'->'command'->>'operationId')::uuid from k2_hold_fixture.context where name='expiry');
 perform public.dblink_exec('expiry_left','begin');
 perform locked from public.dblink('expiry_left',format('select pg_advisory_xact_lock(hashtextextended(%L,0))','account-claim-user:'||i.user_id::text)) x(locked text);
 -- Start near the beginning of a server second so the capability is valid
 -- on entry and expires during the observed native lock wait.
 until_time:=clock_timestamp()+interval '2 seconds';
 while extract(epoch from clock_timestamp())-floor(extract(epoch from clock_timestamp()))>0.15 loop
   if clock_timestamp()>until_time then raise exception 'EXPIRY_FIXTURE_CLOCK_WINDOW_MISSING'; end if;
   perform pg_sleep(0.005);
 end loop;
 expiry:=floor(extract(epoch from clock_timestamp()))::bigint;
 cap:=k2_hold_fixture.hold_capability(i.id,jsonb_build_object('purpose','refuse_hold','authorizationId',gen_random_uuid(),'authorizationHash',repeat('b',64),'expiresAt',expiry));
 if public.dblink_send_query('expiry_right',format('select k2_hold_fixture.expiring_refusal(%L,%L)',cap->>'body',cap->>'mac'))<>1 then raise exception 'EXPIRY_SEND_FAILED'; end if;
 until_time:=clock_timestamp()+interval '1 second';
 while clock_timestamp()<until_time loop
   perform pg_stat_clear_snapshot();
   if exists(select 1 from pg_stat_activity where datname=current_database() and application_name='k2_hold_expiry_right' and wait_event_type='Lock') then observed:=true; exit; end if;
   perform pg_sleep(0.005);
 end loop;
 if not observed then raise exception 'EXPIRY_NATIVE_LOCK_NOT_OBSERVED'; end if;
 while floor(extract(epoch from clock_timestamp()))::bigint<=expiry loop perform pg_sleep(0.005); end loop;
 perform public.dblink_exec('expiry_left','commit');
 select body into outcome from public.dblink_get_result('expiry_right') x(body jsonb);
 perform body from public.dblink_get_result('expiry_right') x(body jsonb);
 if outcome->>'ok' is distinct from 'false' or outcome->>'message' is distinct from 'K2_PRIVACY_CAPABILITY_INVALID'
   or (select state from k2_private.customer_privacy_hold_intents where id=i.id)<>'pending' then raise exception 'EXPIRED_REFUSAL_MUTATED_PENDING_INTENT'; end if;
end $race$;
select public.dblink_disconnect('expiry_left');
select public.dblink_disconnect('expiry_right');
select jsonb_build_object('checks',jsonb_build_array('refusal expiry is rechecked after an observed native lock wait'),
 'disconnected',public.dblink_get_connections() is null);
