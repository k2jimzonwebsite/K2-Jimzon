-- MAP-019 / IDEA-20261027-02. Inactive native protocol primitives; apply after
-- privacy_admin only with exact owner approval. No keys/configuration are seeded.
-- Not an all-writer freeze, journal verifier, erasure permit or active RPC.
begin;
create table k2_private.customer_privacy_authority_config (
 singleton boolean primary key default true check(singleton),
 project_ref text not null check(project_ref='pixplcjqivlfflickobf'),
 genesis_id uuid not null, database_id uuid not null, generation bigint not null check(generation between 1 and 9007199254740991),
 mode text not null default 'active' check(mode in('active','recovering')),
 native_proof_key bytea not null check(octet_length(native_proof_key)=32),
 execution_key bytea not null check(octet_length(execution_key)=32 and execution_key<>native_proof_key)
);
create table k2_private.customer_privacy_hold_intents (
 id uuid primary key, database_id uuid not null, generation bigint not null,
 request_id uuid references k2_private.customer_privacy_requests(id) on delete restrict,
 user_id uuid references auth.users(id) on delete restrict,
 customer_id uuid not null references public.customers(id) on delete restrict,
 initiator_id uuid not null references auth.users(id) on delete restrict,
 literal_hash text not null check(literal_hash ~ '^[0-9a-f]{64}$'),
 kind text not null check(kind in('legal','refund','dispute','security')), reason text not null check(length(trim(reason)) between 3 and 500),
 protection_id uuid not null unique, hold_id uuid not null unique, event_id uuid not null unique,
 state text not null default 'pending' check(state in('pending','projected','resolved','refused')),
 creation_receipt jsonb, refusal_receipt jsonb, prepared_export jsonb not null default '{}'::jsonb,
 resolve_operation_id uuid unique, resolve_literal_hash text, resolution_hash text,
 resolution_event_id uuid unique, resolved_by uuid references auth.users(id) on delete restrict, resolved_export jsonb,
 created_at timestamptz not null default clock_timestamp(), resolved_at timestamptz,
 check((state in('pending','refused') and creation_receipt is null) or (state in('projected','resolved') and creation_receipt is not null)),
 check((state='refused')=(refusal_receipt is not null)),
 check((state='resolved')=(resolved_at is not null)),
 constraint customer_privacy_hold_origin_pair check((request_id is null)=(user_id is null))
);
create index customer_privacy_hold_intents_pending on k2_private.customer_privacy_hold_intents(customer_id,user_id) where state='pending';
-- One unique domain for native protect/release commands, including concurrent
-- cross-customer calls and transactions with an older repeatable-read snapshot.
create table k2_private.customer_privacy_hold_operations (
 operation_id uuid primary key, kind text not null check(kind in('protect','release_protection')),
 intent_id uuid not null references k2_private.customer_privacy_hold_intents(id) deferrable initially deferred,
 initiator_id uuid not null references auth.users(id) on delete restrict,
 literal_hash text not null check(literal_hash ~ '^[0-9a-f]{64}$')
);
revoke all on k2_private.customer_privacy_authority_config,k2_private.customer_privacy_hold_intents,
 k2_private.customer_privacy_hold_operations from public,anon,authenticated,service_role;

-- Closed protocol values use printable ASCII strings and safe integers. Reasons
-- stay in native literal storage and enter the wire only through their hash.
create function k2_private.privacy_authority_canonical(value jsonb) returns text
language plpgsql immutable set search_path='' as $$
declare result text; kind text:=jsonb_typeof(value);
begin
 if value is null or octet_length(value::text)>32768 then raise exception 'K2_PRIVACY_WIRE_INVALID'; end if;
 if kind='string' then
   if (value#>>'{}') ~ '[^ -~]' collate "C" then raise exception 'K2_PRIVACY_WIRE_INVALID'; end if;
   return value::text;
 elsif kind='number' then
   if (value::text)::numeric<>trunc((value::text)::numeric) or abs((value::text)::numeric)>9007199254740991 then raise exception 'K2_PRIVACY_WIRE_INVALID'; end if;
   return trunc((value::text)::numeric)::text;
 elsif kind in('boolean','null') then return value::text;
 elsif kind='object' then
   select '{'||coalesce(string_agg(k2_private.privacy_authority_canonical(to_jsonb(key))||':'||
     k2_private.privacy_authority_canonical(val),',' order by key collate "C"),'')||'}' into result from jsonb_each(value) x(key,val);
 elsif kind='array' then
   select '['||coalesce(string_agg(k2_private.privacy_authority_canonical(val),',' order by ord),'')||']'
     into result from jsonb_array_elements(value) with ordinality x(val,ord);
 else raise exception 'K2_PRIVACY_WIRE_INVALID'; end if;
 return result;
end $$;

create function k2_private.privacy_hold_admin() returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or coalesce(auth.jwt()->>'aal','')<>'aal2' or not exists(
   select 1 from public.user_profiles where id=actor and role::text in('Admin','SuperAdmin')) then raise exception 'K2_ADMIN_REQUIRED'; end if;
 return actor;
end $$;

-- Matches the existing claim/processor lock order: subject advisory, customer,
-- request rows. The broader OLD/NEW writer/freeze boundary is still separate.
create function k2_private.privacy_hold_lock(subject uuid, customer uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if subject is not null then perform pg_advisory_xact_lock(hashtextextended('account-claim-user:'||subject::text,0)); end if;
 perform 1 from public.customers where id=customer for update;
 if not found then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 perform 1 from k2_private.customer_privacy_requests where customer_id=customer order by id for update;
end $$;

create function k2_private.privacy_hold_claim_operation(operation uuid, purpose text, intent uuid, actor uuid, digest text) returns void
language plpgsql security definer set search_path='' as $$
declare prior k2_private.customer_privacy_hold_operations;
begin
 insert into k2_private.customer_privacy_hold_operations(operation_id,kind,intent_id,initiator_id,literal_hash)
 values(operation,purpose,intent,actor,digest) on conflict(operation_id) do nothing;
 select * into strict prior from k2_private.customer_privacy_hold_operations where operation_id=operation for update;
 if prior.kind<>purpose or prior.intent_id<>intent or prior.initiator_id<>actor or prior.literal_hash<>digest then
   raise exception 'K2_PRIVACY_INTENT_CONFLICT';
 end if;
end $$;

-- Only stored native facts are exportable; no generic caller-selected signer.
create function k2_private.privacy_hold_intent_export(intent uuid, purpose text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare i k2_private.customer_privacy_hold_intents; c k2_private.customer_privacy_authority_config;
 command jsonb; payload jsonb; body jsonb; txt text;
begin
 select * into strict i from k2_private.customer_privacy_hold_intents where id=intent;
 select * into c from k2_private.customer_privacy_authority_config where singleton and mode='active' for share;
 if not found or i.database_id<>c.database_id or i.generation<>c.generation then raise exception 'K2_PRIVACY_AUTHORITY_UNCONFIGURED'; end if;
 if purpose='protect' then
   payload:=jsonb_build_object('actorId',i.user_id,'requestId',i.request_id,'customerId',i.customer_id,'protectionId',i.protection_id,
     'kind',i.kind,'nativeIntentHash',i.literal_hash,'initiatorId',i.initiator_id,'initiatorRole','admin');
 elsif purpose='release_protection' and i.state='resolved' then
   payload:=jsonb_build_object('actorId',i.user_id,'requestId',i.request_id,'customerId',i.customer_id,'protectionId',i.protection_id,
     'nativeResolutionHash',i.resolution_hash,'initiatorId',i.resolved_by,'initiatorRole','admin');
 else raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 command:=jsonb_build_object('version',2,'projectRef',c.project_ref,'genesisId',c.genesis_id,'generation',c.generation,
   'operationId',case when purpose='protect' then i.id else i.resolve_operation_id end,'kind',purpose,'payload',payload);
 body:=jsonb_build_object('version',2,'projectRef',c.project_ref,'genesisId',c.genesis_id,'databaseId',c.database_id,
   'generation',c.generation,'purpose',purpose,'intentId',i.id,'protectionId',i.protection_id,'holdId',i.hold_id,
   'eventId',case when purpose='protect' then i.event_id else i.resolution_event_id end,
   'initiatorId',case when purpose='protect' then i.initiator_id else i.resolved_by end,
   'nativeIntentHash',i.literal_hash,'commandHash',encode(extensions.digest(convert_to(k2_private.privacy_authority_canonical(command),'UTF8'),'sha256'),'hex'));
 txt:=k2_private.privacy_authority_canonical(body);
 return jsonb_build_object('command',command,'proof',jsonb_build_object('body',txt,
   'mac',encode(extensions.hmac(convert_to(txt,'UTF8'),c.native_proof_key,'sha256'),'hex')));
end $$;

create function k2_private.prepare_privacy_hold_intent(operation uuid, payload_text text) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare actor uuid:=k2_private.privacy_hold_admin(); p jsonb; r k2_private.customer_privacy_requests;
 i k2_private.customer_privacy_hold_intents; c k2_private.customer_privacy_authority_config; literal_hash text; exported jsonb; v_customer uuid;
begin
 if operation is null or payload_text is null or octet_length(payload_text)>8192 then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
 p:=payload_text::jsonb;
 if jsonb_typeof(p)<>'object' or not p ?& array['kind','reason'] or (p ? 'requestId')=(p ? 'customerId') or (select count(*) from jsonb_object_keys(p))<>3
   or jsonb_typeof(p->'reason')<>'string' or length(trim(p->>'reason')) not between 3 and 500
   or coalesce(p->>'kind','') not in('legal','refund','dispute','security') then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
 select * into c from k2_private.customer_privacy_authority_config where singleton and mode='active' for share;
 if not found then raise exception 'K2_PRIVACY_AUTHORITY_UNCONFIGURED'; end if;
 literal_hash:=encode(extensions.digest(convert_to(actor::text||E'\n'||operation::text||E'\n'||payload_text,'UTF8'),'sha256'),'hex');
 if p ? 'requestId' then
   select * into r from k2_private.customer_privacy_requests where id=(p->>'requestId')::uuid;
   if not found or r.customer_id is null or r.verified_at is null then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
   v_customer:=r.customer_id;
 else
   v_customer:=(p->>'customerId')::uuid;
 end if;
 perform k2_private.privacy_hold_lock(r.user_id,v_customer);
 perform k2_private.privacy_hold_claim_operation(operation,'protect',operation,actor,literal_hash);
 select * into i from k2_private.customer_privacy_hold_intents where id=operation for update;
 if found then
   if i.literal_hash<>literal_hash then raise exception 'K2_PRIVACY_INTENT_CONFLICT'; end if;
   if i.database_id<>c.database_id or i.generation<>c.generation then raise exception 'K2_PRIVACY_AUTHORITY_UNCONFIGURED'; end if;
   return i.prepared_export;
 end if;
 if not exists(select 1 from public.customers where id=v_customer and status='active') then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 if exists(select 1 from k2_private.customer_privacy_requests where customer_id=v_customer and verified_at is not null
   and state in('pending','held') and assigned_to is distinct from actor) then raise exception 'K2_PRIVACY_ASSIGNMENT_REQUIRED'; end if;
 insert into k2_private.customer_privacy_hold_intents(id,database_id,generation,request_id,user_id,customer_id,initiator_id,
   literal_hash,kind,reason,protection_id,hold_id,event_id)
 values(operation,c.database_id,c.generation,r.id,r.user_id,v_customer,actor,literal_hash,p->>'kind',trim(p->>'reason'),
   gen_random_uuid(),gen_random_uuid(),gen_random_uuid());
 exported:=k2_private.privacy_hold_intent_export(operation,'protect');
 update k2_private.customer_privacy_hold_intents set prepared_export=exported where id=operation;
 return exported;
end $$;

create function k2_private.project_privacy_hold_intent(capability_text text, mac text) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare p jsonb; c k2_private.customer_privacy_authority_config; i k2_private.customer_privacy_hold_intents; receipt jsonb; now_epoch bigint;
begin
 select * into c from k2_private.customer_privacy_authority_config where singleton and mode='active' for share;
 if not found then raise exception 'K2_PRIVACY_AUTHORITY_UNCONFIGURED'; end if;
 if capability_text is null or octet_length(capability_text)>8192 or coalesce(mac,'') !~ '^[0-9a-f]{64}$' then raise exception 'K2_PRIVACY_CAPABILITY_INVALID'; end if;
 p:=capability_text::jsonb;
 if jsonb_typeof(p)<>'object' or not p ?& array['version','projectRef','genesisId','databaseId','generation','purpose','intentId','protectionId','nativeIntentHash','expiresAt']
   or (select count(*) from jsonb_object_keys(p))<>10 or k2_private.privacy_authority_canonical(p)<>capability_text
   or encode(extensions.hmac(convert_to(capability_text,'UTF8'),c.execution_key,'sha256'),'hex')<>mac
   or p->>'purpose' is distinct from 'project_hold' or p->'version' is distinct from '2'::jsonb or p->>'projectRef' is distinct from c.project_ref
   or p->>'genesisId' is distinct from c.genesis_id::text or p->>'databaseId' is distinct from c.database_id::text or p->'generation' is distinct from to_jsonb(c.generation)
   or jsonb_typeof(p->'expiresAt') is distinct from 'number' then raise exception 'K2_PRIVACY_CAPABILITY_INVALID'; end if;
 select * into i from k2_private.customer_privacy_hold_intents where id=(p->>'intentId')::uuid;
 if not found then raise exception 'K2_PRIVACY_CAPABILITY_INVALID'; end if;
 -- Lock the same native scope before the intent row; no remote I/O in this transaction.
 perform k2_private.privacy_hold_lock(i.user_id,i.customer_id);
 select * into strict i from k2_private.customer_privacy_hold_intents where id=i.id for update;
 if i.database_id<>c.database_id or i.generation<>c.generation or p->>'intentId' is distinct from i.id::text
   or p->>'protectionId' is distinct from i.protection_id::text
   or p->>'nativeIntentHash' is distinct from i.literal_hash then raise exception 'K2_PRIVACY_CAPABILITY_INVALID'; end if;
 if i.state<>'pending' then return jsonb_build_object('receipt',coalesce(i.creation_receipt,i.refusal_receipt),'currentState',i.state); end if;
 now_epoch:=floor(extract(epoch from clock_timestamp()))::bigint;
 if (p->>'expiresAt')::bigint<now_epoch or (p->>'expiresAt')::bigint>now_epoch+30 then raise exception 'K2_PRIVACY_CAPABILITY_INVALID'; end if;
 if not exists(select 1 from public.customers where id=i.customer_id and status='active') then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 insert into k2_private.customer_privacy_holds(id,customer_id,kind,reason,created_by)
 values(i.hold_id,i.customer_id,i.kind,i.reason,i.initiator_id);
 insert into k2_private.customer_privacy_review_events(id,request_id,customer_id,actor_id,action,hold_id,reason)
 values(i.event_id,i.request_id,i.customer_id,i.initiator_id,case when i.request_id is null then 'add_customer_hold' else 'add_hold' end,i.hold_id,i.reason);
 receipt:=jsonb_build_object('intentId',i.id,'protectionId',i.protection_id,'holdId',i.hold_id,'eventId',i.event_id,'outcome','projected');
 update k2_private.customer_privacy_hold_intents set state='projected',creation_receipt=receipt where id=i.id;
 return jsonb_build_object('receipt',receipt,'currentState','projected');
end $$;

create function k2_private.resolve_privacy_hold_intent(operation uuid, payload_text text) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare actor uuid:=k2_private.privacy_hold_admin(); p jsonb; i k2_private.customer_privacy_hold_intents;
 c k2_private.customer_privacy_authority_config; v_literal_hash text; v_resolution_event uuid:=gen_random_uuid(); exported jsonb; v_resolution_hash text;
begin
 if operation is null or payload_text is null or octet_length(payload_text)>8192 then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
 p:=payload_text::jsonb;
 if jsonb_typeof(p)<>'object' or not p ?& array['intentId','holdId','reason'] or (select count(*) from jsonb_object_keys(p))<>3
   or jsonb_typeof(p->'reason')<>'string' or length(trim(p->>'reason')) not between 3 and 500 then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
 select * into c from k2_private.customer_privacy_authority_config where singleton and mode='active' for share;
 if not found then raise exception 'K2_PRIVACY_AUTHORITY_UNCONFIGURED'; end if;
 select * into i from k2_private.customer_privacy_hold_intents where id=(p->>'intentId')::uuid;
 if not found then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 perform k2_private.privacy_hold_lock(i.user_id,i.customer_id);
 select * into strict i from k2_private.customer_privacy_hold_intents where id=i.id for update;
 if i.database_id<>c.database_id or i.generation<>c.generation or p->>'holdId' is distinct from i.hold_id::text then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 v_literal_hash:=encode(extensions.digest(convert_to(actor::text||E'\n'||operation::text||E'\n'||payload_text,'UTF8'),'sha256'),'hex');
 perform k2_private.privacy_hold_claim_operation(operation,'release_protection',i.id,actor,v_literal_hash);
 if i.state='resolved' then
   if i.resolve_operation_id<>operation or i.resolve_literal_hash<>v_literal_hash then raise exception 'K2_PRIVACY_INTENT_CONFLICT'; end if;
   return i.resolved_export;
 end if;
 if i.state<>'projected' then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 if not exists(select 1 from public.customers where id=i.customer_id and status='active') then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 if exists(select 1 from k2_private.customer_privacy_requests where customer_id=i.customer_id and verified_at is not null
   and state in('pending','held') and assigned_to is distinct from actor) then raise exception 'K2_PRIVACY_ASSIGNMENT_REQUIRED'; end if;
 update k2_private.customer_privacy_holds set resolved_at=clock_timestamp(),resolved_by=actor
 where id=i.hold_id and customer_id=i.customer_id and resolved_at is null;
 if not found then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 insert into k2_private.customer_privacy_review_events(id,request_id,customer_id,actor_id,action,hold_id,reason)
 values(v_resolution_event,i.request_id,i.customer_id,actor,case when i.request_id is null then 'resolve_customer_hold' else 'resolve_hold' end,i.hold_id,trim(p->>'reason'));
 v_resolution_hash:=encode(extensions.digest(convert_to(k2_private.privacy_authority_canonical(jsonb_build_object(
   'intentId',i.id,'protectionId',i.protection_id,'holdId',i.hold_id,'eventId',v_resolution_event,'initiatorId',actor,
   'operationId',operation,'literalHash',v_literal_hash)),'UTF8'),'sha256'),'hex');
 update k2_private.customer_privacy_hold_intents set state='resolved',resolved_at=clock_timestamp(),resolved_by=actor,
   resolve_operation_id=operation,resolve_literal_hash=v_literal_hash,resolution_event_id=v_resolution_event,resolution_hash=v_resolution_hash where id=i.id;
 exported:=k2_private.privacy_hold_intent_export(i.id,'release_protection');
 update k2_private.customer_privacy_hold_intents set resolved_export=exported where id=i.id;
 return exported;
end $$;
revoke all on function k2_private.privacy_authority_canonical(jsonb) from public,anon,authenticated,service_role;
revoke all on function k2_private.privacy_hold_admin() from public,anon,authenticated,service_role;
revoke all on function k2_private.privacy_hold_lock(uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function k2_private.privacy_hold_intent_export(uuid,text) from public,anon,authenticated,service_role;
revoke all on function k2_private.privacy_hold_claim_operation(uuid,text,uuid,uuid,text) from public,anon,authenticated,service_role;
revoke all on function k2_private.prepare_privacy_hold_intent(uuid,text) from public,anon,authenticated,service_role;
revoke all on function k2_private.project_privacy_hold_intent(text,text) from public,anon,authenticated,service_role;
revoke all on function k2_private.resolve_privacy_hold_intent(uuid,text) from public,anon,authenticated,service_role;
commit;
