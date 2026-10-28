-- Synthetic-only protocol assertions in the owned restore's rollback transaction.
do $$ begin
 if to_regprocedure('k2_private.prepare_privacy_hold_intent(uuid,text)') is null then
   raise exception 'NATIVE_HOLD_INTENT_IMPLEMENTATION_MISSING';
 end if;
end $$;
create temp table privacy_hold_results(name text primary key, detail jsonb);
create function pg_temp.hold_expect_failure(statement text, expected text) returns void language plpgsql as $$ begin
 begin execute statement; exception when others then
   if sqlerrm=expected then return; end if; raise;
 end;
 raise exception 'EXPECTED_NATIVE_HOLD_REFUSAL_MISSING: %',expected;
end $$;
create function pg_temp.hold_capability(intent uuid, overrides jsonb default '{}'::jsonb) returns jsonb language plpgsql as $$
declare i k2_private.customer_privacy_hold_intents; c k2_private.customer_privacy_authority_config; body jsonb; txt text;
begin
 select * into strict i from k2_private.customer_privacy_hold_intents where id=intent;
 select * into strict c from k2_private.customer_privacy_authority_config where singleton;
 body:=jsonb_build_object('version',2,'projectRef',c.project_ref,'genesisId',c.genesis_id,'databaseId',c.database_id,
   'generation',c.generation,'purpose','project_hold','intentId',i.id,'protectionId',i.protection_id,
   'nativeIntentHash',i.literal_hash,'expiresAt',floor(extract(epoch from clock_timestamp()))::bigint+20)||overrides;
 txt:=k2_private.privacy_authority_canonical(body);
 return jsonb_build_object('body',txt,'mac',encode(extensions.hmac(convert_to(txt,'UTF8'),c.execution_key,'sha256'),'hex'));
end $$;
create function pg_temp.hold_fail_event() returns trigger language plpgsql as $$ begin
 raise exception 'SYNTHETIC_HOLD_EVENT_FAILURE';
end $$;
do $cases$
declare subject uuid:=gen_random_uuid(); admin uuid:=gen_random_uuid(); other_admin uuid:=gen_random_uuid();
 customer uuid:=gen_random_uuid(); contact uuid:=gen_random_uuid(); request uuid:=gen_random_uuid();
 operation uuid:=gen_random_uuid(); resolution uuid:=gen_random_uuid(); txt text; prepared jsonb; projected jsonb;
 cap jsonb; repeated jsonb; resolved jsonb; intent uuid; original_hold uuid; original_event uuid; count_before bigint;
 creation_literal text; regression_failures text[]:='{}'; bad jsonb; second_operation uuid:=gen_random_uuid(); second_cap jsonb;
begin
 insert into auth.users(id,email,email_confirmed_at,created_at,updated_at,aud,role,raw_app_meta_data,raw_user_meta_data)
 select x.id,'native-hold-'||x.id::text||'@example.invalid',clock_timestamp(),clock_timestamp(),clock_timestamp(),
   'authenticated','authenticated','{}','{}' from unnest(array[subject,admin,other_admin]) x(id);
 update public.user_profiles set role='Admin' where id in(admin,other_admin);
 insert into public.customers(id,display_name,created_source) values(customer,'Synthetic hold protocol','website_account');
 insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,verification_status,verified_at,source)
 values(contact,customer,'email','native-hold-'||subject::text||'@example.invalid',extensions.digest(subject::text,'sha256'),'verified',clock_timestamp(),'website_account');
 insert into public.customer_accounts(user_id,customer_id,verified_contact_point_id) values(subject,customer,contact);
 insert into k2_private.customer_privacy_requests(id,user_id,customer_id,channel,receipt_hash,state,verified_at,assigned_to)
 values(request,subject,customer,'email',extensions.digest(request::text,'sha256'),'pending',clock_timestamp(),admin);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','aal','aal2')::text,true);
 perform set_config('request.jwt.claim.sub',admin::text,true);
 txt:=jsonb_build_object('requestId',request,'kind','legal','reason','Synthetic pending review')::text;
 creation_literal:=txt;
 perform pg_temp.hold_expect_failure(format('select k2_private.prepare_privacy_hold_intent(%L,%L)',operation,txt),'K2_PRIVACY_AUTHORITY_UNCONFIGURED');
 insert into k2_private.customer_privacy_authority_config(singleton,project_ref,genesis_id,database_id,generation,native_proof_key,execution_key)
 values(true,'pixplcjqivlfflickobf','90000000-0000-4000-8000-000000000002',gen_random_uuid(),1,
   extensions.digest('MAP019 synthetic native proof only','sha256'),extensions.digest('MAP019 synthetic execution only','sha256'));
 prepared:=k2_private.prepare_privacy_hold_intent(operation,txt); intent:=operation;
 if exists(select 1 from k2_private.customer_privacy_holds where customer_id=customer) then raise exception 'INTENT_REPORTED_AS_CANONICAL_HOLD'; end if;
 repeated:=k2_private.prepare_privacy_hold_intent(operation,txt);
 if prepared<>repeated then raise exception 'PREPARED_INTENT_BYTES_CHANGED'; end if;
 perform pg_temp.hold_expect_failure(format('select k2_private.prepare_privacy_hold_intent(%L,%L)',operation,txt||' '),'K2_PRIVACY_INTENT_CONFLICT');
 insert into privacy_hold_results values('literal-bound intent is stable and not a saved hold',null);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','aal','aal1')::text,true);
 perform pg_temp.hold_expect_failure(format('select k2_private.prepare_privacy_hold_intent(%L,%L)',gen_random_uuid(),txt),'K2_ADMIN_REQUIRED');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_admin,'role','authenticated','aal','aal2')::text,true);
 perform set_config('request.jwt.claim.sub',other_admin::text,true);
 perform pg_temp.hold_expect_failure(format('select k2_private.prepare_privacy_hold_intent(%L,%L)',gen_random_uuid(),txt),'K2_PRIVACY_ASSIGNMENT_REQUIRED');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','aal','aal2')::text,true);
 perform set_config('request.jwt.claim.sub',admin::text,true);
 insert into privacy_hold_results values('AAL and current assignment checks refuse wrong initiators',null);
 cap:=pg_temp.hold_capability(intent);
 perform pg_temp.hold_expect_failure(format('select k2_private.project_privacy_hold_intent(%L,%L)',cap->>'body',repeat('0',64)),'K2_PRIVACY_CAPABILITY_INVALID');
 select encode(extensions.hmac(convert_to(cap->>'body','UTF8'),native_proof_key,'sha256'),'hex') into txt from k2_private.customer_privacy_authority_config where singleton;
 perform pg_temp.hold_expect_failure(format('select k2_private.project_privacy_hold_intent(%L,%L)',cap->>'body',txt),'K2_PRIVACY_CAPABILITY_INVALID');
 repeated:=pg_temp.hold_capability(intent,jsonb_build_object('purpose','erase'));
 perform pg_temp.hold_expect_failure(format('select k2_private.project_privacy_hold_intent(%L,%L)',repeated->>'body',repeated->>'mac'),'K2_PRIVACY_CAPABILITY_INVALID');
 repeated:=pg_temp.hold_capability(intent,jsonb_build_object('generation',2));
 perform pg_temp.hold_expect_failure(format('select k2_private.project_privacy_hold_intent(%L,%L)',repeated->>'body',repeated->>'mac'),'K2_PRIVACY_CAPABILITY_INVALID');
 repeated:=pg_temp.hold_capability(intent,jsonb_build_object('nativeIntentHash',repeat('a',64)));
 perform pg_temp.hold_expect_failure(format('select k2_private.project_privacy_hold_intent(%L,%L)',repeated->>'body',repeated->>'mac'),'K2_PRIVACY_CAPABILITY_INVALID');
 repeated:=pg_temp.hold_capability(intent,jsonb_build_object('protectionId',null));
 perform pg_temp.hold_expect_failure(format('select k2_private.project_privacy_hold_intent(%L,%L)',repeated->>'body',repeated->>'mac'),'K2_PRIVACY_CAPABILITY_INVALID');
 for bad in select value from jsonb_array_elements(jsonb_build_array(
   jsonb_build_object('purpose',null),jsonb_build_object('projectRef','unrelated-project'),
   jsonb_build_object('genesisId',gen_random_uuid()),jsonb_build_object('databaseId',gen_random_uuid()),
   jsonb_build_object('expiresAt',0),jsonb_build_object('expiresAt',floor(extract(epoch from clock_timestamp()))::bigint+300))) loop
   repeated:=pg_temp.hold_capability(intent,bad);
   perform pg_temp.hold_expect_failure(format('select k2_private.project_privacy_hold_intent(%L,%L)',repeated->>'body',repeated->>'mac'),'K2_PRIVACY_CAPABILITY_INVALID');
 end loop;
 insert into privacy_hold_results values('capability MAC purpose generation and literal binding refuse',null);
 projected:=k2_private.project_privacy_hold_intent(cap->>'body',cap->>'mac');
 original_hold:=(projected->'receipt'->>'holdId')::uuid; original_event:=(projected->'receipt'->>'eventId')::uuid;
 repeated:=k2_private.project_privacy_hold_intent(cap->>'body',cap->>'mac');
 if repeated<>projected or (select count(*) from k2_private.customer_privacy_holds where customer_id=customer)<>1
   or (select count(*) from k2_private.customer_privacy_review_events where customer_id=customer)<>1 then raise exception 'PROJECTED_HOLD_RETRY_DUPLICATED'; end if;
 insert into privacy_hold_results values('projection creates exactly one fixed hold and review event',null);
 txt:=jsonb_build_object('intentId',intent,'holdId',original_hold,'reason','Synthetic review resolved')::text;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','aal','aal1')::text,true);
 perform pg_temp.hold_expect_failure(format('select k2_private.resolve_privacy_hold_intent(%L,%L)',resolution,txt),'K2_ADMIN_REQUIRED');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',subject,'role','authenticated','aal','aal2','is_admin',true)::text,true);
 perform set_config('request.jwt.claim.sub',subject::text,true);
 perform pg_temp.hold_expect_failure(format('select k2_private.resolve_privacy_hold_intent(%L,%L)',resolution,txt),'K2_ADMIN_REQUIRED');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',other_admin,'role','authenticated','aal','aal2')::text,true);
 perform set_config('request.jwt.claim.sub',other_admin::text,true);
 perform pg_temp.hold_expect_failure(format('select k2_private.resolve_privacy_hold_intent(%L,%L)',resolution,txt),'K2_PRIVACY_ASSIGNMENT_REQUIRED');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin,'role','authenticated','aal','aal2')::text,true);
 perform set_config('request.jwt.claim.sub',admin::text,true);
 insert into privacy_hold_results values('resolution checks current database role AAL and assignment before mutation',null);
 -- Roll back the unexpected success inside this subtransaction so both review
 -- regressions are reported together without corrupting the following cases.
 begin
   perform k2_private.resolve_privacy_hold_intent(operation,txt);
   raise exception 'SYNTHETIC_CREATION_OPERATION_REUSED';
 exception when raise_exception then
   if sqlerrm='SYNTHETIC_CREATION_OPERATION_REUSED' then regression_failures:=array_append(regression_failures,'creation operation reused for resolution');
   elsif sqlerrm<>'K2_PRIVACY_INTENT_CONFLICT' then raise; end if;
 end;
 resolved:=k2_private.resolve_privacy_hold_intent(resolution,txt);
 if resolved<>k2_private.resolve_privacy_hold_intent(resolution,txt) then raise exception 'RESOLUTION_RETRY_CHANGED'; end if;
 perform pg_temp.hold_expect_failure(format('select k2_private.resolve_privacy_hold_intent(%L,%L)',resolution,txt||' '),'K2_PRIVACY_INTENT_CONFLICT');
 perform pg_temp.hold_expect_failure(format('select k2_private.prepare_privacy_hold_intent(%L,%L)',resolution,creation_literal),'K2_PRIVACY_INTENT_CONFLICT');
 select count(*) into count_before from k2_private.customer_privacy_review_events where customer_id=customer;
 -- Valid delayed projection capability after permanent native resolution.
 repeated:=k2_private.project_privacy_hold_intent(cap->>'body',cap->>'mac');
 if repeated->'receipt'<>projected->'receipt' or repeated->>'currentState'<>'resolved'
   or exists(select 1 from k2_private.customer_privacy_holds where customer_id=customer and resolved_at is null)
   or (select count(*) from k2_private.customer_privacy_review_events where customer_id=customer)<>count_before
   or count_before<>2 or not exists(select 1 from k2_private.customer_privacy_review_events where id=original_event) then
   raise exception 'DELAYED_PROJECTION_RECREATED_RESOLVED_HOLD'; end if;
 insert into privacy_hold_results values('lost projection reply resolve delayed retry never reinserts a hold/event',null);
 update public.customers set status='deleted' where id=customer;
 begin
   if prepared<>k2_private.prepare_privacy_hold_intent(operation,creation_literal)
     or resolved<>k2_private.resolve_privacy_hold_intent(resolution,txt) then raise exception 'HISTORICAL_EXPORT_CHANGED'; end if;
 exception when raise_exception then
   if sqlerrm='K2_PRIVACY_STATE_CONFLICT' then regression_failures:=array_append(regression_failures,'historical exports inaccessible after customer closure'); else raise; end if;
 end;
 perform pg_temp.hold_expect_failure(format('select k2_private.prepare_privacy_hold_intent(%L,%L)',gen_random_uuid(),creation_literal),'K2_PRIVACY_STATE_CONFLICT');
 repeated:=k2_private.project_privacy_hold_intent(cap->>'body',cap->>'mac');
 if repeated->'receipt'<>projected->'receipt' or repeated->>'currentState'<>'resolved' then raise exception 'CLOSED_CUSTOMER_PROJECTION_RETRY_CHANGED'; end if;
 update public.customers set status='active' where id=customer;
 insert into privacy_hold_results values('historical exports survive closed customer while fresh mutation refuses',null);
 perform k2_private.prepare_privacy_hold_intent(second_operation,creation_literal);
 second_cap:=pg_temp.hold_capability(second_operation);
 execute format('create trigger synthetic_hold_event_failure before insert on k2_private.customer_privacy_review_events for each row when (new.customer_id=%L::uuid) execute function pg_temp.hold_fail_event()',customer);
 perform pg_temp.hold_expect_failure(format('select k2_private.project_privacy_hold_intent(%L,%L)',second_cap->>'body',second_cap->>'mac'),'SYNTHETIC_HOLD_EVENT_FAILURE');
 if (select state from k2_private.customer_privacy_hold_intents where id=second_operation)<>'pending'
   or (select count(*) from k2_private.customer_privacy_holds where customer_id=customer)<>1
   or (select count(*) from k2_private.customer_privacy_review_events where customer_id=customer)<>2 then raise exception 'FAILED_PROJECTION_PARTIALLY_COMMITTED'; end if;
 drop trigger synthetic_hold_event_failure on k2_private.customer_privacy_review_events;
 perform k2_private.project_privacy_hold_intent(second_cap->>'body',second_cap->>'mac');
 insert into privacy_hold_results values('event failure rolls back hold and intent with retryable original capability',null);
 if cardinality(regression_failures)>0 then raise exception 'NATIVE_HOLD_REVIEW_REGRESSIONS: %',array_to_string(regression_failures,'; '); end if;
 insert into privacy_hold_results values('native proof export',jsonb_build_object('prepared',prepared,'resolved',resolved));
end $cases$;
do $$ begin
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
   where n.nspname='k2_private' and c.relname in('customer_privacy_authority_config','customer_privacy_hold_intents','customer_privacy_hold_operations')
     and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole)) then raise exception 'NATIVE_HOLD_PROTOCOL_TABLE_CAPABILITY'; end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
   where n.nspname='k2_private' and p.proname in ('prepare_privacy_hold_intent','project_privacy_hold_intent',
     'resolve_privacy_hold_intent','privacy_authority_canonical','privacy_hold_intent_export','privacy_hold_admin','privacy_hold_lock','privacy_hold_claim_operation')
     and a.grantee in(0,'anon'::regrole,'authenticated'::regrole,'service_role'::regrole) and a.privilege_type='EXECUTE') then
   raise exception 'NATIVE_HOLD_PROTOCOL_PUBLIC_CAPABILITY'; end if;
end $$;
insert into privacy_hold_results values('private protocol has no PUBLIC anon authenticated or service-role grants',null);
insert into privacy_hold_results values('native config keys and hold ledgers have no application-role table privileges',null);
do $$ begin
 if k2_private.privacy_authority_canonical('{"z":1.00,"a":{"v":true}}'::jsonb)<>'{"a":{"v":true},"z":1}' then raise exception 'NATIVE_CANONICAL_ORDER_OR_INTEGER_FORMAT'; end if;
 perform pg_temp.hold_expect_failure('select k2_private.privacy_authority_canonical(''1.5''::jsonb)','K2_PRIVACY_WIRE_INVALID');
 perform pg_temp.hold_expect_failure('select k2_private.privacy_authority_canonical(''9007199254740992''::jsonb)','K2_PRIVACY_WIRE_INVALID');
 perform pg_temp.hold_expect_failure('select k2_private.privacy_authority_canonical(to_jsonb(chr(233)))','K2_PRIVACY_WIRE_INVALID');
end $$;
insert into privacy_hold_results values('canonical order integer bounds and closed ASCII values qualify',null);
select jsonb_build_object('checks',(select jsonb_agg(name order by name) from privacy_hold_results),
 'exports',(select detail from privacy_hold_results where name='native proof export'));
