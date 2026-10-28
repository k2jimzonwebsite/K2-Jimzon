-- Runs after the original native hold assertions, in the same owned transaction.
do $$ begin
 if to_regprocedure('public.read_customer_privacy_hold_fact_v1(text,text)') is null then
   raise exception 'NATIVE_HOLD_AUTHORITY_IMPLEMENTATION_MISSING';
 end if;
end $$;
-- This key replaces only an isolated fixture row and is rolled back in the
-- original restore. It is not the owner's actual Admin BFF signing key.
insert into k2_private.admin_bff_secrets(singleton,request_secret)
values(true,extensions.digest('MAP019 synthetic Admin bridge only','sha256'))
on conflict(singleton) do update set request_secret=excluded.request_secret;
create function pg_temp.hold_read_capability(intent uuid, overrides jsonb default '{}'::jsonb) returns jsonb language plpgsql as $$
declare c k2_private.customer_privacy_authority_config; body jsonb; txt text;
begin
 select * into strict c from k2_private.customer_privacy_authority_config where singleton;
 body:=jsonb_build_object('version',2,'projectRef',c.project_ref,'genesisId',c.genesis_id,'databaseId',c.database_id,'generation',c.generation,
   'purpose','read_hold_fact','intentId',intent,'challengeId',gen_random_uuid(),'expiresAt',floor(extract(epoch from clock_timestamp()))::bigint+20)||overrides;
 txt:=k2_private.privacy_authority_canonical(body);
 return jsonb_build_object('body',txt,'mac',encode(extensions.hmac(convert_to(txt,'UTF8'),c.execution_key,'sha256'),'hex'));
end $$;
create function pg_temp.hold_admin_authority(action text, payload text, operation uuid) returns jsonb language plpgsql as $$
declare ts bigint:=extract(epoch from clock_timestamp())::bigint; nonce uuid:=gen_random_uuid(); signature text;
begin
 select encode(extensions.hmac(convert_to(action||E'\n'||ts||E'\n'||nonce||E'\n'||auth.uid()||E'\n'||operation||E'\n'||
   encode(extensions.digest(convert_to(payload,'UTF8'),'sha256'),'hex'),'UTF8'),request_secret,'sha256'),'hex')
 into signature from k2_private.admin_bff_secrets where singleton;
 if action='customer_privacy_hold_prepare' then
   return public.prepare_admin_customer_privacy_hold_v2(action,ts,nonce,operation,payload,signature);
 elsif action='customer_privacy_hold_resolve' then
   return public.resolve_admin_customer_privacy_hold_v2(action,ts,nonce,operation,payload,signature);
 end if;
 raise exception 'SYNTHETIC_ADMIN_ACTION_INVALID';
end $$;
do $cases$
declare i k2_private.customer_privacy_hold_intents; cap jsonb; response jsonb; body jsonb; txt text;
 prepared jsonb; repeated jsonb; refused jsonb; operation uuid:=gen_random_uuid(); resolver uuid:=gen_random_uuid(); c k2_private.customer_privacy_authority_config;
begin
 select * into strict i from k2_private.customer_privacy_hold_intents order by created_at,id limit 1;
 select * into strict c from k2_private.customer_privacy_authority_config where singleton;
 cap:=pg_temp.hold_read_capability(i.id);
 perform set_config('request.jwt.claims','{"role":"authenticated","aal":"aal2"}',true);
 perform pg_temp.hold_expect_failure(format('select public.read_customer_privacy_hold_fact_v1(%L,%L)',cap->>'body',cap->>'mac'),'K2_PRIVACY_SERVICE_REQUIRED');
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 response:=public.read_customer_privacy_hold_fact_v1(cap->>'body',cap->>'mac'); body:=(response->>'body')::jsonb;
 if body->>'challengeId' is distinct from (cap->>'body')::jsonb->>'challengeId' or body->>'state'<>'resolved'
   or body->'releaseExport'->'command'->>'kind'<>'release_protection'
   or encode(extensions.hmac(convert_to(response->>'body','UTF8'),c.native_proof_key,'sha256'),'hex')<>response->>'mac' then raise exception 'NATIVE_NONCE_FACT_BINDING_FAILED'; end if;
 insert into privacy_hold_results values('current record facts bind fresh challenge namespace and exact committed resolution export',null);
 repeated:=pg_temp.hold_read_capability(i.id,jsonb_build_object('purpose','project_hold'));
 perform pg_temp.hold_expect_failure(format('select public.read_customer_privacy_hold_fact_v1(%L,%L)',repeated->>'body',repeated->>'mac'),'K2_PRIVACY_CAPABILITY_INVALID');
 perform pg_temp.hold_expect_failure(format('select public.read_customer_privacy_hold_fact_v1(%L,%L)',cap->>'body',repeat('0',64)),'K2_PRIVACY_CAPABILITY_INVALID');
 -- A current read cannot bless a corrupted cached command, even with recomputed
 -- JSON/checksums supplied by a privileged fixture writer.
 perform pg_temp.hold_expect_failure(format($statement$do $probe$ begin
   update k2_private.customer_privacy_hold_intents set prepared_export=jsonb_set(prepared_export,'{command,payload,kind}','"refund"') where id=%L;
   perform public.read_customer_privacy_hold_fact_v1(%L,%L);
 end $probe$$statement$,i.id,cap->>'body',cap->>'mac'),'K2_PRIVACY_NATIVE_RECORD_INTEGRITY');
 insert into privacy_hold_results values('read RPC rejects wrong service proof purpose and corrupt native cached command',null);
 perform set_config('request.jwt.claim.sub',i.initiator_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',i.initiator_id,'role','authenticated','aal','aal2')::text,true);
 txt:=jsonb_build_object('requestId',i.request_id,'kind','security','reason','Synthetic signed native intent')::text;
 prepared:=pg_temp.hold_admin_authority('customer_privacy_hold_prepare',txt,operation);
 if prepared<>pg_temp.hold_admin_authority('customer_privacy_hold_prepare',txt,operation) then raise exception 'SIGNED_PREPARE_RETRY_CHANGED'; end if;
 perform pg_temp.hold_expect_failure(format('select pg_temp.hold_admin_authority(%L,%L,%L)','customer_privacy_hold_prepare',txt||' ',operation),'K2_PRIVACY_INTENT_CONFLICT');
 cap:=pg_temp.hold_capability(operation);
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 perform public.transition_customer_privacy_hold_v1(cap->>'body',cap->>'mac');
 select * into strict i from k2_private.customer_privacy_hold_intents where id=operation;
 perform set_config('request.jwt.claim.sub',i.initiator_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',i.initiator_id,'role','authenticated','aal','aal2')::text,true);
 txt:=jsonb_build_object('requestId',i.request_id,'holdId',i.hold_id,'reason','Synthetic signed resolution')::text;
 response:=pg_temp.hold_admin_authority('customer_privacy_hold_resolve',txt,resolver);
 if response<>pg_temp.hold_admin_authority('customer_privacy_hold_resolve',txt,resolver) then raise exception 'SIGNED_RESOLVE_RETRY_CHANGED'; end if;
 perform pg_temp.hold_expect_failure(format('select pg_temp.hold_admin_authority(%L,%L,%L)','customer_privacy_hold_resolve',txt||' ',resolver),'K2_ADMIN_IDEMPOTENCY_CONFLICT');
 insert into privacy_hold_results values('signed Admin prepare and resolution preserve signer and both literal retry boundaries',null);
 operation:=gen_random_uuid();
 prepared:=pg_temp.hold_admin_authority('customer_privacy_hold_prepare',jsonb_build_object('requestId',i.request_id,'kind','legal','reason','Synthetic late intent')::text,operation);
 cap:=pg_temp.hold_capability(operation,jsonb_build_object('purpose','refuse_hold','authorizationId',gen_random_uuid(),'authorizationHash',repeat('a',64)));
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 refused:=public.transition_customer_privacy_hold_v1(cap->>'body',cap->>'mac');
 if refused<>public.transition_customer_privacy_hold_v1(cap->>'body',cap->>'mac') or refused->>'currentState'<>'refused'
   or exists(select 1 from k2_private.customer_privacy_holds where id=(select hold_id from k2_private.customer_privacy_hold_intents where id=operation)) then raise exception 'REFUSED_INTENT_CREATED_HOLD'; end if;
 repeated:=pg_temp.hold_capability(operation);
 if refused<>public.transition_customer_privacy_hold_v1(repeated->>'body',repeated->>'mac') then raise exception 'REFUSED_PROJECT_RETRY_CHANGED'; end if;
 cap:=pg_temp.hold_read_capability(operation); response:=public.read_customer_privacy_hold_fact_v1(cap->>'body',cap->>'mac');
 if (response->>'body')::jsonb->>'state'<>'refused' then raise exception 'REFUSAL_NOT_VISIBLE_IN_FRESH_FACT'; end if;
 insert into privacy_hold_results values('witness-capability refusal is immutable and never creates a canonical hold or event',null);
end $cases$;
do $$ begin
 if has_function_privilege('authenticated','public.read_customer_privacy_hold_fact_v1(text,text)','EXECUTE')
   or has_function_privilege('anon','public.transition_customer_privacy_hold_v1(text,text)','EXECUTE')
   or not has_function_privilege('service_role','public.read_customer_privacy_hold_fact_v1(text,text)','EXECUTE')
   or has_function_privilege('service_role','public.prepare_admin_customer_privacy_hold_v2(text,bigint,uuid,uuid,text,text)','EXECUTE')
   or not has_function_privilege('authenticated','public.prepare_admin_customer_privacy_hold_v2(text,bigint,uuid,uuid,text,text)','EXECUTE')
   or has_function_privilege('authenticated','k2_private.refuse_privacy_hold_intent(text,text)','EXECUTE') then raise exception 'NATIVE_AUTHORITY_RPC_GRANTS_INVALID'; end if;
end $$;
insert into privacy_hold_results values('service capabilities and signed staff commands have separate narrow execute grants',null);
do $customer_cases$
declare customer uuid:=gen_random_uuid(); actor uuid; operation uuid:=gen_random_uuid(); resolution uuid:=gen_random_uuid();
 prepared jsonb; resolved jsonb; cap jsonb; fact_cap jsonb; fact jsonb; i k2_private.customer_privacy_hold_intents; original_request k2_private.customer_privacy_requests;
begin
 select initiator_id into strict actor from k2_private.customer_privacy_hold_intents order by created_at,id limit 1;
 select * into strict original_request from k2_private.customer_privacy_requests order by created_at,id limit 1;
 insert into public.customers(id,display_name,created_source) values(customer,'Synthetic pre-request customer','website_guest');
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
 prepared:=pg_temp.hold_admin_authority('customer_privacy_hold_prepare',jsonb_build_object('customerId',customer,'kind','legal','reason','Synthetic customer-only hold')::text,operation);
 if prepared->'command'->'payload'->'actorId' is distinct from 'null'::jsonb or prepared->'command'->'payload'->'requestId' is distinct from 'null'::jsonb then raise exception 'CUSTOMER_HOLD_INVENTED_ORIGIN'; end if;
 select * into strict i from k2_private.customer_privacy_hold_intents where id=operation;
 if i.user_id is not null or i.request_id is not null or exists(select 1 from k2_private.customer_privacy_requests where customer_id=customer) then raise exception 'CUSTOMER_HOLD_INVENTED_REQUEST'; end if;
 begin
   update k2_private.customer_privacy_hold_intents set user_id=actor where id=operation;
   raise exception 'MIXED_NATIVE_SCOPE_ACCEPTED';
 exception when check_violation then null; end;
 cap:=pg_temp.hold_capability(operation);
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 perform public.transition_customer_privacy_hold_v1(cap->>'body',cap->>'mac');
 fact_cap:=pg_temp.hold_read_capability(operation);
 fact:=public.read_customer_privacy_hold_fact_v1(fact_cap->>'body',fact_cap->>'mac');
 if (fact->>'body')::jsonb->'actorId' is distinct from 'null'::jsonb or not exists(select 1 from k2_private.customer_privacy_review_events where id=i.event_id and request_id is null and customer_id=customer and action='add_customer_hold') then raise exception 'CUSTOMER_HOLD_FACT_EVENT_SCOPE'; end if;
 insert into privacy_hold_results values('customer-only signed preparation projection and facts require no Auth or request origin',null);
 perform pg_temp.hold_expect_failure(format($s$do $p$ begin
   update k2_private.customer_privacy_hold_intents set user_id=%L,request_id=%L where id=%L;
   perform public.read_customer_privacy_hold_fact_v1(%L,%L);
 end $p$$s$,original_request.user_id,original_request.id,operation,fact_cap->>'body',fact_cap->>'mac'),'K2_PRIVACY_NATIVE_RECORD_INTEGRITY');
 insert into privacy_hold_results values('native paired-null constraint and signed current facts reject invented or rebound origin',null);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal2')::text,true);
 perform pg_temp.hold_expect_failure(format('select pg_temp.hold_admin_authority(%L,%L,%L)','customer_privacy_hold_resolve',jsonb_build_object('customerId',gen_random_uuid(),'holdId',i.hold_id,'reason','Wrong customer scope')::text,gen_random_uuid()),'K2_PRIVACY_STATE_CONFLICT');
 resolved:=pg_temp.hold_admin_authority('customer_privacy_hold_resolve',jsonb_build_object('customerId',customer,'holdId',i.hold_id,'reason','Synthetic customer resolution')::text,resolution);
 if resolved->'command'->'payload'->'actorId' is distinct from 'null'::jsonb or resolved->'command'->'payload'->'requestId' is distinct from 'null'::jsonb then raise exception 'CUSTOMER_HOLD_RELEASE_REBOUND'; end if;
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 if public.transition_customer_privacy_hold_v1(cap->>'body',cap->>'mac')->>'currentState'<>'resolved'
   or (select count(*) from k2_private.customer_privacy_review_events where hold_id=i.hold_id)<>2
   or not exists(select 1 from k2_private.customer_privacy_review_events where hold_id=i.hold_id and action='resolve_customer_hold' and request_id is null) then raise exception 'CUSTOMER_HOLD_RESOLUTION_NOT_FINAL'; end if;
 insert into privacy_hold_results values('customer-scoped resolution preserves null origin and permanently prevents late projection reinsertion',null);
end $customer_cases$;
select jsonb_build_object('checks',(select jsonb_agg(name order by name) from privacy_hold_results),
 'exports',(select detail from privacy_hold_results where name='native proof export'));
