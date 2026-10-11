-- MAP-018 / IDEA-20261010-06. Prepared only; no provider activation.
-- Caller supplies armed <=10s statement / <=2s lock timers and READ COMMITTED.
do $preflight$
declare p pg_catalog.pg_proc%rowtype; d text;
begin
 if current_user<>'postgres' or current_setting('server_version_num')<>'170006'
  or to_regprocedure('k2_private.reference_name_key_v1(text)') is null
  or to_regclass('k2_private.reference_command_context') is not null
  or to_regclass('k2_private.reference_events') is not null
  or to_regprocedure('public.execute_admin_reference_command_v1(text,bigint,uuid,uuid,text,text)') is not null then
  raise exception 'K2_REFERENCE_CREATION_TARGET_INVALID';
 end if;
 select * into p from pg_catalog.pg_proc
 where oid='k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure;
 d:=pg_catalog.pg_get_functiondef(p.oid);
 if md5(d)<>'7433d40476af9e64e0ae98e0313b2c07'
  or pg_get_userbyid(p.proowner)<>'postgres' or not p.prosecdef
  or p.proconfig is distinct from array['search_path=""']::text[]
  or p.proacl::text[] is distinct from array['postgres=X/postgres']::text[] then
  raise exception 'K2_REFERENCE_VERIFIER_DRIFT';
 end if;
 if (length(d)-length(replace(d,'if p_action not in (','')))/length('if p_action not in (')<>1 then
  raise exception 'K2_REFERENCE_VERIFIER_ANCHOR_INVALID';
 end if;
 execute replace(d,'if p_action not in (','if p_action not in (''reference_create'',');
end $preflight$;

-- Lock and refuse equivalence collisions before adding all-writer identities.
lock table public.brands,public.categories in share row exclusive mode;
do $collisions$
begin
 if exists(select 1 from public.brands
  group by k2_private.reference_name_key_v1(name) collate "C" having count(*)>1)
 or exists(select 1 from public.categories
  group by parent_id,k2_private.reference_name_key_v1(name) collate "C" having count(*)>1) then
  raise exception 'K2_REFERENCE_EXISTING_IDENTITY_COLLISION';
 end if;
end $collisions$;
create unique index brands_reference_name_key_v1 on public.brands
 ((k2_private.reference_name_key_v1(name) collate "C"));
create unique index categories_reference_name_parent_key_v1 on public.categories
 ((k2_private.reference_name_key_v1(name) collate "C"),parent_id) nulls not distinct;

create table k2_private.reference_command_context(
 backend_pid integer not null, transaction_id xid8 not null, actor_id uuid not null,
 action text not null check(action='reference_create'), request_id uuid not null,
 payload_hash text not null check(payload_hash~'^[0-9a-f]{64}$'),
 kind text not null check(kind in ('brand','category')), name text not null,
 parent_id uuid, consumed boolean not null default false,
 primary key(backend_pid,transaction_id)
);
alter table k2_private.reference_command_context enable row level security;
revoke all on k2_private.reference_command_context from public,anon,authenticated,service_role;
create table k2_private.reference_events(
 actor_id uuid not null, action text not null check(action='reference_create'), request_id uuid not null,
 reference_id uuid not null, kind text not null check(kind in ('brand','category')),
 reason text not null, result jsonb not null, created_at timestamptz not null default clock_timestamp(),
 primary key(actor_id,action,request_id)
);
alter table k2_private.reference_events enable row level security;
revoke all on k2_private.reference_events from public,anon,authenticated,service_role;

create function k2_private.guard_reference_context_clear_v1() returns trigger
language plpgsql security definer set search_path='' as $guard$
begin
 if exists(select 1 from k2_private.reference_command_context
  where backend_pid=new.backend_pid and transaction_id=new.transaction_id) then
  raise exception using errcode='55000',message='K2_REFERENCE_CONTEXT_NOT_CLEARED';
 end if;
 return new;
end $guard$;
revoke all on function k2_private.guard_reference_context_clear_v1() from public,anon,authenticated,service_role;
create constraint trigger reference_context_must_clear after insert on k2_private.reference_command_context
deferrable initially deferred for each row execute function k2_private.guard_reference_context_clear_v1();

create function k2_private.guard_reference_event_immutable_v1() returns trigger
language plpgsql set search_path='' as $guard$
begin
 raise exception using errcode='42501',message='K2_REFERENCE_EVENT_IMMUTABLE';
end $guard$;
revoke all on function k2_private.guard_reference_event_immutable_v1() from public,anon,authenticated,service_role;
create trigger reference_events_immutable before update or delete on k2_private.reference_events
for each row execute function k2_private.guard_reference_event_immutable_v1();

create function k2_private.guard_category_reference_entry_v1() returns trigger
language plpgsql security definer set search_path='' as $entry$
begin
 -- Definer identity alone is never an installer exception.
 if session_user='postgres' and current_setting('role') in ('none','postgres')
  and auth.uid() is null and not exists(select 1 from k2_private.reference_command_context
   where backend_pid=pg_backend_pid() and transaction_id=pg_current_xact_id()) then
  return null;
 end if;
 perform k2_private.lock_category_policy_v1(true);
 return null;
end $entry$;
revoke all on function k2_private.guard_category_reference_entry_v1() from public,anon,authenticated,service_role;
create trigger categories_reference_statement_entry before insert or update or delete on public.categories
for each statement execute function k2_private.guard_category_reference_entry_v1();

create function k2_private.guard_reference_insert_v1() returns trigger
language plpgsql security definer set search_path='' as $insert$
declare c k2_private.reference_command_context; v_parent uuid;
begin
 select * into c from k2_private.reference_command_context
 where backend_pid=pg_backend_pid() and transaction_id=pg_current_xact_id();
 if not found and session_user='postgres' and current_setting('role') in ('none','postgres')
  and auth.uid() is null then return new;end if;
 if c.actor_id is distinct from auth.uid() or c.actor_id is null or c.consumed
  or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2'
  or c.kind is distinct from (case when tg_table_name='brands' then 'brand' else 'category' end)
  or c.name is distinct from new.name
  or not exists(select 1 from k2_private.admin_command_receipts r where r.actor_id=c.actor_id
   and r.action=c.action and r.idempotency_key=c.request_id and r.payload_hash=c.payload_hash and r.result is null) then
  raise exception using errcode='42501',message='K2_REFERENCE_SIGNED_CONTEXT_REQUIRED';
 end if;
 if tg_table_name='categories' then v_parent:=new.parent_id;end if;
 if v_parent is distinct from c.parent_id then
  raise exception using errcode='42501',message='K2_REFERENCE_SIGNED_CONTEXT_REQUIRED';
 end if;
 update k2_private.reference_command_context set consumed=true
 where backend_pid=c.backend_pid and transaction_id=c.transaction_id;
 return new;
end $insert$;
revoke all on function k2_private.guard_reference_insert_v1() from public,anon,authenticated,service_role;
create trigger brands_reference_signed_insert before insert on public.brands
for each row execute function k2_private.guard_reference_insert_v1();
create trigger categories_reference_signed_insert before insert on public.categories
for each row execute function k2_private.guard_reference_insert_v1();

create function public.execute_admin_reference_command_v1(
 p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,p_payload_text text,p_signature text)
returns jsonb language plpgsql security definer set search_path='' as $command$
declare
 v_actor uuid:=auth.uid(); v_payload jsonb; v_kind text; v_name text; v_reason text; v_parent uuid;
 v_hash text; v_existing k2_private.admin_command_receipts; v_inserted integer; v_count integer;
 v_id uuid; v_saved_name text; v_saved_parent uuid; v_reused boolean; v_result jsonb; v_depth integer;
begin
 if v_actor is null or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
  raise exception using errcode='42501',message='K2_REFERENCE_ADMIN_REQUIRED';
 end if;
 if current_setting('transaction_isolation')<>'read committed' then
  raise exception using errcode='0A000',message='K2_REFERENCE_ISOLATION_UNSUPPORTED';
 end if;
 if current_setting('lock_timeout')::interval<=interval '0'
  or current_setting('lock_timeout')::interval>interval '2 seconds'
  or current_setting('statement_timeout')::interval<=interval '0'
  or current_setting('statement_timeout')::interval>interval '10 seconds' then
  raise exception using errcode='55000',message='K2_REFERENCE_DEADLINES_REQUIRED';
 end if;
 if p_action is distinct from 'reference_create' or p_payload_text is null
  or octet_length(convert_to(p_payload_text,'UTF8'))>16384 then
  raise exception using errcode='22023',message='K2_REFERENCE_INPUT_INVALID';
 end if;
 v_payload:=p_payload_text::jsonb;v_kind:=v_payload->>'kind';
 -- Select strongest policy entry before verifier nonce/rate/receipt resources.
 if v_kind='category' then perform k2_private.lock_category_policy_v1(true);end if;
 if not k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature) then
  raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
 end if;
 if jsonb_typeof(v_payload) is distinct from 'object'
  or not(v_payload ?& array['kind','name','parentId','reason'])
  or (v_payload-array['kind','name','parentId','reason'])<>'{}'::jsonb
  or jsonb_typeof(v_payload->'kind') is distinct from 'string'
  or v_kind not in ('brand','category')
  or jsonb_typeof(v_payload->'name') is distinct from 'string'
  or jsonb_typeof(v_payload->'reason') is distinct from 'string'
  or jsonb_typeof(v_payload->'parentId') not in ('null','string')
  or (v_kind='brand' and v_payload->'parentId'<>'null'::jsonb) then
  raise exception using errcode='22023',message='K2_REFERENCE_INPUT_INVALID';
 end if;
 if v_payload->'parentId'<>'null'::jsonb then
  if (v_payload->>'parentId')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
   raise exception using errcode='22023',message='K2_REFERENCE_INPUT_INVALID';
  end if;
  v_parent:=(v_payload->>'parentId')::uuid;
 end if;
 v_name:=k2_private.clean_reference_name_v1(v_payload->>'name');
 v_reason:=v_payload->>'reason';
 if v_reason~U&'[\0001-\001F\007F-\009F]' then
  raise exception using errcode='22023',message='K2_REFERENCE_INPUT_INVALID';
 end if;
 v_reason:=btrim(regexp_replace(v_reason,U&'[ \00A0\1680\2000-\200A\2028\2029\202F\205F\3000]+',' ','g'),' ');
 if length(v_reason) not between 8 and 500 then
  raise exception using errcode='22023',message='K2_REFERENCE_INPUT_INVALID';
 end if;
 v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
 select * into v_existing from k2_private.admin_command_receipts
 where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
 if found then
  if v_existing.payload_hash is distinct from v_hash then
   raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
  end if;
  if v_existing.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';end if;
  return v_existing.result;
 end if;
 select count(*) into v_count from k2_private.admin_command_receipts
 where actor_id=v_actor and action=p_action and created_at>clock_timestamp()-interval '1 minute';
 if v_count>=20 then raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED';end if;
 insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
 values(v_actor,p_action,p_idempotency_key,v_hash) on conflict do nothing;
 get diagnostics v_inserted=row_count;
 if v_inserted=0 then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';end if;
 if v_kind='category' then
  select maximum_depth into v_depth from k2_private.category_policy_command_config where singleton;
  if v_depth is null or v_depth<1 then
   raise exception using errcode='55000',message='K2_CATEGORY_POLICY_NOT_CONFIGURED';
  end if;
  if v_parent is not null and (v_depth<2 or k2_private.effective_category_minimum_v1(v_parent,v_depth-1) is null) then
   raise exception using errcode='22023',message='K2_REFERENCE_PARENT_INVALID';
  end if;
 end if;
 insert into k2_private.reference_command_context(backend_pid,transaction_id,actor_id,action,request_id,payload_hash,kind,name,parent_id)
 values(pg_backend_pid(),pg_current_xact_id(),v_actor,p_action,p_idempotency_key,v_hash,v_kind,v_name,v_parent);
 if v_kind='brand' then
  insert into public.brands(name) values(v_name) on conflict do nothing returning id,name into v_id,v_saved_name;
 else
  insert into public.categories(name,parent_id) values(v_name,v_parent) on conflict do nothing returning id,name,parent_id
   into v_id,v_saved_name,v_saved_parent;
 end if;
 v_reused:=v_id is null;
 if v_reused then
  -- A new READ COMMITTED statement sees a committed competing insertion.
  if v_kind='brand' then
   select id,name into v_id,v_saved_name from public.brands
   where k2_private.reference_name_key_v1(name) collate "C"=k2_private.reference_name_key_v1(v_name) collate "C";
  else
   select id,name,parent_id into v_id,v_saved_name,v_saved_parent from public.categories
   where parent_id is not distinct from v_parent
    and k2_private.reference_name_key_v1(name) collate "C"=k2_private.reference_name_key_v1(v_name) collate "C";
  end if;
  if v_id is null then raise exception using errcode='P0001',message='K2_REFERENCE_RETRY_REQUIRED';end if;
 end if;
 v_result:=jsonb_build_object('reference',jsonb_build_object('kind',v_kind,'id',v_id,'name',v_saved_name,'parentId',v_saved_parent),'reused',v_reused);
 insert into k2_private.reference_events(actor_id,action,request_id,reference_id,kind,reason,result)
 values(v_actor,p_action,p_idempotency_key,v_id,v_kind,v_reason,v_result);
 update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
 where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
 delete from k2_private.reference_command_context where backend_pid=pg_backend_pid() and transaction_id=pg_current_xact_id();
 return v_result;
exception when invalid_text_representation or numeric_value_out_of_range then
 raise exception using errcode='22023',message='K2_REFERENCE_INPUT_INVALID';
end $command$;
revoke all on function public.execute_admin_reference_command_v1(text,bigint,uuid,uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function public.execute_admin_reference_command_v1(text,bigint,uuid,uuid,text,text) to authenticated;
