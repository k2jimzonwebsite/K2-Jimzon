-- MAP-019 / IDEA-20261027-02. Prepared only, after hold_intent. No key seed.
-- Service-role RPCs additionally require purpose-bound capabilities; ordinary
-- staff commands additionally require the existing signed/AAL2 Admin boundary.
begin;
do $$
declare source text; changed text; p oid; owner_before oid; config_before text[]; acl_before aclitem[];
 marker text:='''customer_privacy_read'', ''customer_privacy_review'',';
 addition text:=' ''customer_privacy_hold_prepare'', ''customer_privacy_hold_resolve'',';
begin
 p:=to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)');
 if p is null then raise exception 'K2_PRIVACY_ADMIN_SIGNER_MISSING'; end if;
 select pg_get_functiondef(p),proowner,proconfig,proacl into source,owner_before,config_before,acl_before from pg_proc where oid=p;
 if position('''customer_privacy_hold_prepare''' in source)>0 or position('''customer_privacy_hold_resolve''' in source)>0
   or (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'K2_PRIVACY_ADMIN_SIGNER_DRIFT'; end if;
 changed:=replace(source,marker,marker||addition); execute changed;
 if exists(select 1 from pg_proc where oid=p and (proowner is distinct from owner_before or proconfig is distinct from config_before or proacl is distinct from acl_before)) then
   raise exception 'K2_PRIVACY_ADMIN_SIGNER_ATTRIBUTES_CHANGED'; end if;
end $$;

-- Retain the existing assignment/receipt implementation, but close every old
-- direct hold mutation, including authenticated calls outside the BFF adapter.
-- Exact source/attribute checks prevent patching an unknown installed body.
do $$
declare source text; changed text; p oid; owner_before oid; config_before text[]; acl_before aclitem[];
 marker text:='p:=p_payload_text::jsonb; operation:=p->>''action''; reason:=trim(coalesce(p->>''reason'',''''));';
begin
 p:=to_regprocedure('public.review_admin_customer_privacy_v1(text,bigint,uuid,uuid,text,text)');
 if p is null then raise exception 'K2_PRIVACY_ADMIN_REVIEW_MISSING'; end if;
 select pg_get_functiondef(p),proowner,proconfig,proacl into source,owner_before,config_before,acl_before from pg_proc where oid=p;
 if position('K2_PRIVACY_HOLD_AUTHORITY_REQUIRED' in source)>0
   or (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'K2_PRIVACY_ADMIN_REVIEW_DRIFT'; end if;
 changed:=replace(source,marker,marker||E'\n if operation is distinct from ''assign'' then raise exception ''K2_PRIVACY_HOLD_AUTHORITY_REQUIRED''; end if;');
 execute changed;
 if exists(select 1 from pg_proc where oid=p and (proowner is distinct from owner_before or proconfig is distinct from config_before or proacl is distinct from acl_before)) then
   raise exception 'K2_PRIVACY_ADMIN_REVIEW_ATTRIBUTES_CHANGED'; end if;
end $$;

create function k2_private.privacy_hold_capability(capability_text text, signature text, purpose text, fields text[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p jsonb; c k2_private.customer_privacy_authority_config;
begin
 select * into c from k2_private.customer_privacy_authority_config where singleton and mode='active' for share;
 if not found then raise exception 'K2_PRIVACY_AUTHORITY_UNCONFIGURED'; end if;
 if capability_text is null or octet_length(capability_text)>8192 or coalesce(signature,'') !~ '^[0-9a-f]{64}$' then raise exception 'K2_PRIVACY_CAPABILITY_INVALID'; end if;
 p:=capability_text::jsonb;
 if jsonb_typeof(p)<>'object' or not p ?& fields or (select count(*) from jsonb_object_keys(p))<>cardinality(fields)
   or k2_private.privacy_authority_canonical(p)<>capability_text
   or encode(extensions.hmac(convert_to(capability_text,'UTF8'),c.execution_key,'sha256'),'hex')<>signature
   or p->'version' is distinct from '2'::jsonb or p->>'projectRef' is distinct from c.project_ref
   or p->>'genesisId' is distinct from c.genesis_id::text or p->>'databaseId' is distinct from c.database_id::text
   or p->'generation' is distinct from to_jsonb(c.generation) or p->>'purpose' is distinct from purpose
   or jsonb_typeof(p->'expiresAt') is distinct from 'number' then raise exception 'K2_PRIVACY_CAPABILITY_INVALID'; end if;
 return p;
end $$;

create function public.read_customer_privacy_hold_fact_v1(p_capability_text text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare p jsonb; i k2_private.customer_privacy_hold_intents; c k2_private.customer_privacy_authority_config;
 h k2_private.customer_privacy_holds; body jsonb; txt text; now_epoch bigint:=floor(extract(epoch from clock_timestamp()))::bigint;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'K2_PRIVACY_SERVICE_REQUIRED'; end if;
 p:=k2_private.privacy_hold_capability(p_capability_text,p_signature,'read_hold_fact',array[
   'version','projectRef','genesisId','databaseId','generation','purpose','intentId','challengeId','expiresAt']);
 if (p->>'expiresAt')::bigint<now_epoch or (p->>'expiresAt')::bigint>now_epoch+30
   or coalesce(p->>'challengeId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'K2_PRIVACY_CAPABILITY_INVALID'; end if;
 select * into i from k2_private.customer_privacy_hold_intents where id=(p->>'intentId')::uuid;
 if not found then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 perform k2_private.privacy_hold_lock(i.user_id,i.customer_id);
 select * into strict i from k2_private.customer_privacy_hold_intents where id=i.id for share;
 select * into strict c from k2_private.customer_privacy_authority_config where singleton and mode='active';
 if i.database_id<>c.database_id or i.generation<>c.generation or p->>'intentId' is distinct from i.id::text
   or i.prepared_export is distinct from k2_private.privacy_hold_intent_export(i.id,'protect')
   or (i.request_id is null)<>(i.user_id is null)
   or (i.request_id is not null and not exists(select 1 from k2_private.customer_privacy_requests where id=i.request_id and user_id=i.user_id and customer_id=i.customer_id and verified_at is not null))
   or not exists(select 1 from k2_private.customer_privacy_hold_operations where operation_id=i.id and kind='protect' and intent_id=i.id and initiator_id=i.initiator_id and literal_hash=i.literal_hash)
   then raise exception 'K2_PRIVACY_NATIVE_RECORD_INTEGRITY'; end if;
 select * into h from k2_private.customer_privacy_holds where id=i.hold_id;
 if i.state in('pending','refused') then
   if found or exists(select 1 from k2_private.customer_privacy_review_events where id=i.event_id) then raise exception 'K2_PRIVACY_NATIVE_RECORD_INTEGRITY'; end if;
 else
   if not found or h.customer_id<>i.customer_id or h.kind<>i.kind or h.reason<>i.reason or h.created_by<>i.initiator_id
     or not exists(select 1 from k2_private.customer_privacy_review_events where id=i.event_id and request_id is not distinct from i.request_id and customer_id=i.customer_id and actor_id=i.initiator_id and action=case when i.request_id is null then 'add_customer_hold' else 'add_hold' end and hold_id=i.hold_id and reason=i.reason)
     or (i.state='projected' and h.resolved_at is not null) then raise exception 'K2_PRIVACY_NATIVE_RECORD_INTEGRITY'; end if;
 end if;
 if i.state='resolved' then
   if h.resolved_at is null or h.resolved_by is distinct from i.resolved_by
     or i.resolved_export is distinct from k2_private.privacy_hold_intent_export(i.id,'release_protection')
     or not exists(select 1 from k2_private.customer_privacy_hold_operations where operation_id=i.resolve_operation_id and kind='release_protection' and intent_id=i.id and initiator_id=i.resolved_by and literal_hash=i.resolve_literal_hash)
     or not exists(select 1 from k2_private.customer_privacy_review_events where id=i.resolution_event_id and request_id is not distinct from i.request_id and customer_id=i.customer_id and actor_id=i.resolved_by and action=case when i.request_id is null then 'resolve_customer_hold' else 'resolve_hold' end and hold_id=i.hold_id)
     then raise exception 'K2_PRIVACY_NATIVE_RECORD_INTEGRITY'; end if;
 end if;
 body:=jsonb_build_object('version',2,'projectRef',c.project_ref,'genesisId',c.genesis_id,'databaseId',c.database_id,'generation',c.generation,
   'purpose','hold_fact','challengeId',p->>'challengeId','intentId',i.id,'actorId',i.user_id,'customerId',i.customer_id,'requestId',i.request_id,
   'initiatorId',i.initiator_id,'protectionId',i.protection_id,'holdId',i.hold_id,'creationEventId',i.event_id,'nativeIntentHash',i.literal_hash,
   'state',i.state,'protectCommandHash',encode(extensions.digest(convert_to(k2_private.privacy_authority_canonical(i.prepared_export->'command'),'UTF8'),'sha256'),'hex'),
   'resolutionHash',i.resolution_hash,'resolverId',i.resolved_by,'resolutionEventId',i.resolution_event_id,
   'releaseCommandHash',case when i.state='resolved' then encode(extensions.digest(convert_to(k2_private.privacy_authority_canonical(i.resolved_export->'command'),'UTF8'),'sha256'),'hex') else null end,
   'releaseExport',i.resolved_export,
   'creationReceipt',i.creation_receipt,'refusalReceipt',i.refusal_receipt,
   'customerActive',exists(select 1 from public.customers where id=i.customer_id and status='active'));
 txt:=k2_private.privacy_authority_canonical(body);
 return jsonb_build_object('body',txt,'mac',encode(extensions.hmac(convert_to(txt,'UTF8'),c.native_proof_key,'sha256'),'hex'));
end $$;

create function k2_private.refuse_privacy_hold_intent(capability_text text,signature text) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare p jsonb; i k2_private.customer_privacy_hold_intents; receipt jsonb; now_epoch bigint:=floor(extract(epoch from clock_timestamp()))::bigint;
begin
 p:=k2_private.privacy_hold_capability(capability_text,signature,'refuse_hold',array[
   'version','projectRef','genesisId','databaseId','generation','purpose','intentId','protectionId','nativeIntentHash','authorizationId','authorizationHash','expiresAt']);
 if coalesce(p->>'authorizationId','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   or coalesce(p->>'authorizationHash','') !~ '^[0-9a-f]{64}$' then raise exception 'K2_PRIVACY_CAPABILITY_INVALID'; end if;
 select * into i from k2_private.customer_privacy_hold_intents where id=(p->>'intentId')::uuid;
 if not found then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 perform k2_private.privacy_hold_lock(i.user_id,i.customer_id);
 select * into strict i from k2_private.customer_privacy_hold_intents where id=i.id for update;
 if p->>'intentId' is distinct from i.id::text or p->>'protectionId' is distinct from i.protection_id::text
   or p->>'nativeIntentHash' is distinct from i.literal_hash or p->>'databaseId' is distinct from i.database_id::text
   or p->'generation' is distinct from to_jsonb(i.generation) then raise exception 'K2_PRIVACY_CAPABILITY_INVALID'; end if;
 receipt:=jsonb_build_object('intentId',i.id,'protectionId',i.protection_id,'outcome','processing_started',
   'authorizationId',p->>'authorizationId','authorizationHash',p->>'authorizationHash');
 if i.state='refused' then
   if i.refusal_receipt<>receipt then raise exception 'K2_PRIVACY_INTENT_CONFLICT'; end if;
   return jsonb_build_object('receipt',receipt,'currentState','refused');
 end if;
 if i.state<>'pending' then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 now_epoch:=floor(extract(epoch from clock_timestamp()))::bigint;
 if (p->>'expiresAt')::bigint<now_epoch or (p->>'expiresAt')::bigint>now_epoch+30 then raise exception 'K2_PRIVACY_CAPABILITY_INVALID'; end if;
 if exists(select 1 from k2_private.customer_privacy_holds where id=i.hold_id)
   or exists(select 1 from k2_private.customer_privacy_review_events where id=i.event_id) then raise exception 'K2_PRIVACY_NATIVE_RECORD_INTEGRITY'; end if;
 update k2_private.customer_privacy_hold_intents set state='refused',refusal_receipt=receipt where id=i.id;
 return jsonb_build_object('receipt',receipt,'currentState','refused');
end $$;

create function public.transition_customer_privacy_hold_v1(p_capability_text text,p_signature text) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'K2_PRIVACY_SERVICE_REQUIRED'; end if;
 if octet_length(p_capability_text)>8192 then raise exception 'K2_PRIVACY_CAPABILITY_INVALID'; end if;
 if p_capability_text::jsonb->>'purpose'='project_hold' then
   return k2_private.project_privacy_hold_intent(p_capability_text,p_signature);
 elsif p_capability_text::jsonb->>'purpose'='refuse_hold' then
   return k2_private.refuse_privacy_hold_intent(p_capability_text,p_signature);
 end if;
 raise exception 'K2_PRIVACY_CAPABILITY_INVALID';
end $$;

create function public.prepare_admin_customer_privacy_hold_v2(
 p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,p_payload_text text,p_signature text
) returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
begin
 perform k2_private.privacy_hold_admin();
 if p_action is distinct from 'customer_privacy_hold_prepare' or k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature) is distinct from true then raise exception 'K2_ADMIN_REQUEST_REPLAYED'; end if;
 return k2_private.prepare_privacy_hold_intent(p_idempotency_key,p_payload_text);
end $$;

create function public.resolve_admin_customer_privacy_hold_v2(
 p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,p_payload_text text,p_signature text
) returns jsonb language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare actor uuid:=k2_private.privacy_hold_admin(); p jsonb; i k2_private.customer_privacy_hold_intents;
 prior k2_private.admin_command_receipts; v_hash text; v_result jsonb;
begin
 if p_action is distinct from 'customer_privacy_hold_resolve' or k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature) is distinct from true then raise exception 'K2_ADMIN_REQUEST_REPLAYED'; end if;
 p:=p_payload_text::jsonb;
 if jsonb_typeof(p)<>'object' or not p ?& array['holdId','reason'] or (p ? 'requestId')=(p ? 'customerId') or (select count(*) from jsonb_object_keys(p))<>3
   or jsonb_typeof(p->'reason')<>'string' or length(trim(p->>'reason')) not between 3 and 500 then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
 v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
 insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash) values(actor,p_action,p_idempotency_key,v_hash) on conflict do nothing;
 select * into strict prior from k2_private.admin_command_receipts where actor_id=actor and action=p_action and idempotency_key=p_idempotency_key for update;
 if prior.payload_hash<>v_hash then raise exception 'K2_ADMIN_IDEMPOTENCY_CONFLICT'; end if;
 if prior.result is not null then return prior.result; end if;
 select * into i from k2_private.customer_privacy_hold_intents where hold_id=(p->>'holdId')::uuid;
 if not found then raise exception 'K2_PRIVACY_HOLD_RECONCILIATION_REQUIRED'; end if;
 if p ? 'customerId' then
   if p->>'customerId' is distinct from i.customer_id::text then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 elsif not exists(select 1 from k2_private.customer_privacy_requests where id=(p->>'requestId')::uuid and customer_id=i.customer_id and (i.user_id is null or user_id=i.user_id) and verified_at is not null) then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 v_result:=k2_private.resolve_privacy_hold_intent(p_idempotency_key,jsonb_build_object('intentId',i.id,'holdId',i.hold_id,'reason',p->>'reason')::text);
 update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp() where actor_id=actor and action=p_action and idempotency_key=p_idempotency_key;
 return v_result;
end $$;

revoke all on function k2_private.privacy_hold_capability(text,text,text,text[]) from public,anon,authenticated,service_role;
revoke all on function k2_private.refuse_privacy_hold_intent(text,text) from public,anon,authenticated,service_role;
revoke all on function public.read_customer_privacy_hold_fact_v1(text,text) from public,anon,authenticated;
revoke all on function public.transition_customer_privacy_hold_v1(text,text) from public,anon,authenticated;
revoke all on function public.prepare_admin_customer_privacy_hold_v2(text,bigint,uuid,uuid,text,text) from public,anon,service_role;
revoke all on function public.resolve_admin_customer_privacy_hold_v2(text,bigint,uuid,uuid,text,text) from public,anon,service_role;
grant execute on function public.read_customer_privacy_hold_fact_v1(text,text) to service_role;
grant execute on function public.transition_customer_privacy_hold_v1(text,text) to service_role;
grant execute on function public.prepare_admin_customer_privacy_hold_v2(text,bigint,uuid,uuid,text,text) to authenticated;
grant execute on function public.resolve_admin_customer_privacy_hold_v2(text,bigint,uuid,uuid,text,text) to authenticated;
commit;
