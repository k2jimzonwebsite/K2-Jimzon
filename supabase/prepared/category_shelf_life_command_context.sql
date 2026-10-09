-- IDEA-20261002-05 / MAP-018. PREPARED ONLY, execute only in owned rollback rehearsal.
-- No activation until ALL batch writers acquire policy/resources and supply context.
-- Success clears the context; root transaction failure rolls it back. Never commit
-- an orphan context. Backend + full xid + actor binding prevents cross-command reuse.
do $preflight$
declare t pg_catalog.pg_proc%rowtype;r pg_catalog.pg_proc%rowtype;
begin
 if current_user<>'postgres' or to_regclass('k2_private.category_lot_command_context') is not null
  or to_regprocedure('k2_private.start_category_lot_context_v1(integer)') is not null
  or to_regprocedure('k2_private.current_category_lot_context_v1()') is not null
  or to_regprocedure('k2_private.guard_category_context_clear_v1()') is not null
  or to_regprocedure('k2_private.clear_category_lot_context_v1()') is not null then
  raise exception 'K2_CATEGORY_CONTEXT_TARGET_INVALID';
 end if;
 select * into t from pg_catalog.pg_proc where oid=to_regprocedure('public.sync_product_batch_compat_columns()');
 select * into r from pg_catalog.pg_proc where oid=to_regprocedure('k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)');
 if t.oid is null or r.oid is null or pg_get_userbyid(t.proowner)<>'postgres'
  or t.prosecdef or t.prorettype<>'trigger'::regtype or t.proacl is not null
  or t.proconfig is distinct from array['search_path=public, pg_temp']::text[]
  or md5(replace(t.prosrc,chr(13),''))<>'7b85feb02792af76d287ba1c2114324f'
  or pg_get_userbyid(r.proowner)<>'postgres' or not r.prosecdef
  or r.proacl::text[] is distinct from array['postgres=X/postgres']::text[]
  or r.proconfig is distinct from array['search_path=""']::text[]
  or md5(replace(r.prosrc,chr(13),''))<>'8362156a5cc192591930ab2d15cfa7a1' then
  raise exception 'K2_CATEGORY_CONTEXT_FUNCTION_DRIFT';
 end if;
end $preflight$;
create table k2_private.category_lot_command_context (
 backend_pid integer not null,
 transaction_id xid8 not null,
 actor_id uuid not null,
 maximum_depth integer not null check(maximum_depth>0),
 evaluation_instant timestamptz not null check(pg_catalog.isfinite(evaluation_instant)),
 primary key(backend_pid,transaction_id)
);
alter table k2_private.category_lot_command_context enable row level security;
revoke all on k2_private.category_lot_command_context from public,anon,authenticated,service_role;

create function k2_private.guard_category_context_clear_v1()
returns trigger language plpgsql security definer set search_path='' as $guard$
begin
 if exists(select 1 from k2_private.category_lot_command_context
  where backend_pid=new.backend_pid and transaction_id=new.transaction_id) then
  raise exception using errcode='55000',message='K2_CATEGORY_CONTEXT_NOT_CLEARED';
 end if;
 return new;
end $guard$;
revoke all on function k2_private.guard_category_context_clear_v1()
 from public,anon,authenticated,service_role;
create constraint trigger category_lot_context_must_clear
 after insert on k2_private.category_lot_command_context
 deferrable initially deferred for each row
 execute function k2_private.guard_category_context_clear_v1();

create function k2_private.start_category_lot_context_v1(p_maximum_depth integer)
returns timestamptz language plpgsql volatile security definer set search_path='' as $start$
declare v_instant timestamptz;
begin
 if p_maximum_depth is null or p_maximum_depth<1 then
  raise exception using errcode='22023',message='K2_CATEGORY_CONTEXT_INPUT_INVALID';
 end if;
 if auth.uid() is null or not public.is_staff() then
  raise exception using errcode='42501',message='K2_STAFF_REQUIRED';
 end if;
 if coalesce(auth.jwt()->>'aal','')<>'aal2' then
  raise exception using errcode='42501',message='K2_AAL2_REQUIRED';
 end if;
 -- Verify an existing boundary; never acquire a late policy lock here.
 if not exists(select 1 from pg_catalog.pg_locks l where l.pid=pg_catalog.pg_backend_pid()
  and l.locktype='advisory' and l.classid=1261585232::oid and l.objid=1347374169::oid
  and l.objsubid=2 and l.granted and l.mode in ('ShareLock','ExclusiveLock')) then
  raise exception using errcode='55000',message='K2_CATEGORY_CONTEXT_ENTRY_REQUIRED';
 end if;
 if exists(select 1 from k2_private.category_lot_command_context
  where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id()) then
  raise exception using errcode='55000',message='K2_CATEGORY_CONTEXT_ALREADY_SET';
 end if;
 v_instant:=pg_catalog.clock_timestamp();
 insert into k2_private.category_lot_command_context
 values(pg_catalog.pg_backend_pid(),pg_catalog.pg_current_xact_id(),auth.uid(),p_maximum_depth,v_instant);
 return v_instant;
end $start$;
create function k2_private.current_category_lot_context_v1()
returns k2_private.category_lot_command_context language plpgsql stable security definer set search_path='' as $read$
declare v_context k2_private.category_lot_command_context;
begin
 select * into v_context from k2_private.category_lot_command_context
  where backend_pid=pg_catalog.pg_backend_pid() and transaction_id=pg_catalog.pg_current_xact_id();
 if not found then raise exception using errcode='55000',message='K2_CATEGORY_CONTEXT_REQUIRED';end if;
 if v_context.actor_id is distinct from auth.uid() then
  raise exception using errcode='42501',message='K2_CATEGORY_CONTEXT_ACTOR_MISMATCH';
 end if;
 if not public.is_staff() then raise exception using errcode='42501',message='K2_STAFF_REQUIRED';end if;
 if coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception using errcode='42501',message='K2_AAL2_REQUIRED';end if;
 return v_context;
end $read$;
create function k2_private.clear_category_lot_context_v1()
returns void language plpgsql volatile security definer set search_path='' as $clear$
begin
 perform k2_private.current_category_lot_context_v1();
 delete from k2_private.category_lot_command_context where backend_pid=pg_catalog.pg_backend_pid()
  and transaction_id=pg_catalog.pg_current_xact_id() and actor_id=auth.uid();
end $clear$;
revoke all on function k2_private.start_category_lot_context_v1(integer),
 k2_private.current_category_lot_context_v1(),k2_private.clear_category_lot_context_v1()
 from public,anon,authenticated,service_role;

create or replace function public.sync_product_batch_compat_columns()
returns trigger language plpgsql set search_path='' as $trigger$
declare v_context k2_private.category_lot_command_context;v_expiry date;v_today date;v_days numeric;
begin
 v_context:=k2_private.current_category_lot_context_v1();
 v_today:=(v_context.evaluation_instant at time zone 'Asia/Manila')::date;
 new.box_code:=coalesce(nullif(new.box_code,''),nullif(new.batch_code,''));
 new.batch_code:=coalesce(nullif(new.batch_code,''),new.box_code);
 new.expiry_date:=coalesce(new.expiry_date,new.best_before_date);
 new.best_before_date:=coalesce(new.best_before_date,new.expiry_date);
 new.quantity:=greatest(coalesce(new.quantity,0),0);
 new.reserved_quantity:=greatest(coalesce(new.reserved_quantity,0),0);
 if new.reserved_quantity>new.quantity then
  raise exception using errcode='23514',message='K2_LOT_RESERVED_CONFLICT';
 end if;
 v_expiry:=coalesce(new.expiry_date,new.best_before_date);
 if v_expiry is not null and pg_catalog.isfinite(v_expiry) then
  v_days:=(v_expiry-date '2000-01-01')::numeric-(v_today-date '2000-01-01')::numeric;
 end if;
 if new.quantity=0 then new.inventory_status:='depleted';
 elsif v_days<0 then new.inventory_status:='expired';
 elsif coalesce(new.inventory_status,'quarantine')='available' and (v_days is null or v_days<=30) then
  new.inventory_status:='quarantine';
 end if;
 new.quantity_available:=case when k2_private.lot_is_eligible_for_category_v1(
  new,v_context.maximum_depth,v_context.evaluation_instant)
  then greatest(new.quantity-new.reserved_quantity,0) else 0 end;
 return new;
end $trigger$;
do $compose$
declare v_definition text;
begin
 v_definition:=pg_catalog.pg_get_functiondef('k2_private.finalize_consignment_receipt_v1(uuid,text,text,text)'::regprocedure);
 v_definition:=replace(v_definition,'v_instant:=pg_catalog.clock_timestamp();',
  'v_instant:=k2_private.start_category_lot_context_v1(v_depth);');
 v_definition:=replace(v_definition,'return v_manifest;',
  'perform k2_private.clear_category_lot_context_v1();
  return v_manifest;');
 execute v_definition;
end $compose$;
