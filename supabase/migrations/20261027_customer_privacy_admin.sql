-- MAP-019: prepared only. This must follow the installed Admin signer migration.
begin;
-- Extend the existing signer rather than replacing its other actions, limits,
-- owner, configuration or permissions. Refuse unexpected source drift.
do $$
declare source text; changed text; before_owner oid; before_config text[]; before_acl aclitem[]; p oid;
  marker text:='''wholesale_inquiry_review'',';
begin
 p:=to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)');
 if p is null then raise exception 'K2_PRIVACY_ADMIN_SIGNER_MISSING'; end if;
 select pg_get_functiondef(p),proowner,proconfig,proacl into source,before_owner,before_config,before_acl from pg_proc where oid=p;
 if position('''customer_privacy_read''' in source)>0 or position('''customer_privacy_review''' in source)>0 then
   if position('''customer_privacy_read'', ''customer_privacy_review''' in source)=0 then raise exception 'K2_PRIVACY_ADMIN_SIGNER_DRIFT'; end if;
 else
   if (length(source)-length(replace(source,marker,'')))/length(marker)<>1 then raise exception 'K2_PRIVACY_ADMIN_SIGNER_DRIFT'; end if;
   changed:=replace(source,marker,marker||' ''customer_privacy_read'', ''customer_privacy_review'',');
   execute changed;
 end if;
 if exists(select 1 from pg_proc where oid=p and (proowner is distinct from before_owner or proconfig is distinct from before_config or proacl is distinct from before_acl)) then
   raise exception 'K2_PRIVACY_ADMIN_SIGNER_ATTRIBUTES_CHANGED'; end if;
end $$;

alter table k2_private.customer_privacy_requests add column if not exists assigned_to uuid references auth.users(id) on delete restrict;
create table if not exists k2_private.customer_privacy_review_events (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references k2_private.customer_privacy_requests(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict, action text not null check(action in ('assign','add_hold','resolve_hold')),
 hold_id uuid references k2_private.customer_privacy_holds(id) on delete restrict,
 reason text not null check(length(reason) between 3 and 500), created_at timestamptz not null default clock_timestamp()
);
alter table k2_private.customer_privacy_review_events alter column request_id drop not null;
alter table k2_private.customer_privacy_review_events add column if not exists customer_id uuid references public.customers(id) on delete restrict;
alter table k2_private.customer_privacy_review_events drop constraint if exists customer_privacy_review_events_action_check;
alter table k2_private.customer_privacy_review_events add constraint customer_privacy_review_events_action_check check(action in ('assign','add_hold','resolve_hold','add_customer_hold','resolve_customer_hold'));
revoke all on k2_private.customer_privacy_review_events from public,anon,authenticated;

create or replace function public.read_admin_customer_privacy_v1(
 p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,p_payload_text text,p_signature text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; c jsonb; result jsonb; v_role text;
begin
 select role::text into v_role from public.user_profiles where id=auth.uid();
 if coalesce(v_role,'') not in ('Admin','SuperAdmin') or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception using errcode='42501',message='K2_ADMIN_REQUIRED'; end if;
 if p_action<>'customer_privacy_read' or not k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature) then raise exception 'K2_ADMIN_REQUEST_REPLAYED'; end if;
 p:=p_payload_text::jsonb;
 if jsonb_typeof(p)<>'object' or not p ?& array['cursor','scope'] or coalesce(p->>'scope','') not in ('current','history','customer')
   or (p->>'scope' in ('current','history') and (select count(*) from jsonb_object_keys(p))<>2)
   or (p->>'scope'='customer' and ((select count(*) from jsonb_object_keys(p))<>3 or not p ? 'customerId')) then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
 c:=p->'cursor';
 if c<>'null'::jsonb and (jsonb_typeof(c)<>'object' or (select count(*) from jsonb_object_keys(c))<>2 or not c ?& array['createdAt','id']) then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
 if p->>'scope'='customer' then
   if c<>'null'::jsonb or not exists(select 1 from public.customers where id=(p->>'customerId')::uuid and status='active') then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
   return jsonb_build_object('requests','[]'::jsonb,'nextCursor',null,'customerHolds',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'reason',reason,'createdAt',created_at) order by created_at desc) from k2_private.customer_privacy_holds where customer_id=(p->>'customerId')::uuid and resolved_at is null),'[]'::jsonb));
 end if;
 with page as materialized (
   select r.id,r.customer_id,r.state,r.created_at,r.updated_at,r.verified_at,r.closed_at,r.provider_state,r.reasons,r.assigned_to,cu.display_name
   from k2_private.customer_privacy_requests r left join public.customers cu on cu.id=r.customer_id
   where ((p->>'scope'='current' and r.state in ('pending','held')) or (p->>'scope'='history' and r.state in ('closed','cancelled'))) and r.verified_at is not null
     and (c='null'::jsonb or (r.created_at,r.id)<((c->>'createdAt')::timestamptz,(c->>'id')::uuid))
   order by r.created_at desc,r.id desc limit 51
 ), visible as (select * from page order by created_at desc,id desc limit 50)
 select jsonb_build_object('requests',coalesce(jsonb_agg(jsonb_build_object(
   'id',v.id,'customerId',v.customer_id,'customerName',coalesce(v.display_name,'Unlinked account'),
   'state',v.state,'createdAt',v.created_at,'updatedAt',v.updated_at,'verifiedAt',v.verified_at,'closedAt',v.closed_at,'providerState',v.provider_state,
   'reasons',v.reasons,'assignedTo',v.assigned_to,
   'holds',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'kind',h.kind,'reason',h.reason,'createdAt',h.created_at) order by h.created_at)
     from k2_private.customer_privacy_holds h where h.customer_id=v.customer_id and h.resolved_at is null),'[]'::jsonb),
   'recentActions',coalesce((select jsonb_agg(jsonb_build_object('action',e.action,'actorId',e.actor_id,'holdId',e.hold_id,'reason',e.reason,'createdAt',e.created_at) order by e.created_at desc)
     from (select * from k2_private.customer_privacy_review_events where request_id=v.id order by created_at desc,id desc limit 5) e),'[]'::jsonb)
 ) order by v.created_at desc,v.id desc),'[]'::jsonb),
 'nextCursor',case when (select count(*) from page)>50 then (select jsonb_build_object('createdAt',created_at,'id',id) from visible order by created_at,id limit 1) else null end)
 into result from visible v;
 return result;
end $$;

create or replace function public.review_admin_customer_privacy_v1(
 p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,p_payload_text text,p_signature text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; r k2_private.customer_privacy_requests; prior k2_private.admin_command_receipts;
 actor uuid:=auth.uid(); v_role text; payload_hash text; operation text; reason text; hold_id uuid; v_customer_id uuid; v_result jsonb;
begin
 select role::text into v_role from public.user_profiles where id=actor;
 if coalesce(v_role,'') not in ('Admin','SuperAdmin') or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception using errcode='42501',message='K2_ADMIN_REQUIRED'; end if;
 if p_action<>'customer_privacy_review' or not k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature) then raise exception 'K2_ADMIN_REQUEST_REPLAYED'; end if;
 p:=p_payload_text::jsonb; operation:=p->>'action'; reason:=trim(coalesce(p->>'reason',''));
 if jsonb_typeof(p)<>'object' or coalesce(operation,'') not in ('assign','add_hold','resolve_hold','add_customer_hold','resolve_customer_hold') or length(reason) not between 3 and 500
   or not p ?& array['action','reason'] or
   (operation in ('assign','add_hold','resolve_hold') and not p ? 'requestId') or
   (operation in ('add_customer_hold','resolve_customer_hold') and not p ? 'customerId') or
   (operation='assign' and (select count(*) from jsonb_object_keys(p))<>3) or
   (operation in ('add_hold','add_customer_hold') and ((select count(*) from jsonb_object_keys(p))<>4 or not p ? 'kind' or coalesce(p->>'kind','') not in ('legal','refund','dispute','security'))) or
   (operation in ('resolve_hold','resolve_customer_hold') and ((select count(*) from jsonb_object_keys(p))<>4 or not p ? 'holdId')) then raise exception 'K2_ADMIN_PAYLOAD_INVALID'; end if;
 payload_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
 -- The original receipt remains replayable even if ownership or request state changed.
 insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
 values(actor,p_action,p_idempotency_key,payload_hash) on conflict do nothing;
 select * into prior from k2_private.admin_command_receipts where actor_id=actor and action=p_action and idempotency_key=p_idempotency_key for update;
 if prior.payload_hash<>payload_hash then raise exception 'K2_ADMIN_IDEMPOTENCY_CONFLICT'; end if;
 if prior.result is not null then return prior.result; end if;
 if operation in ('add_customer_hold','resolve_customer_hold') then
   v_customer_id:=(p->>'customerId')::uuid;
   perform 1 from public.customers where id=v_customer_id and status='active' for update;
   if not found then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
   if exists(select 1 from k2_private.customer_privacy_requests where customer_privacy_requests.customer_id=v_customer_id and state in ('pending','held') and verified_at is not null) then raise exception 'K2_PRIVACY_ASSIGNMENT_REQUIRED'; end if;
   if operation='add_customer_hold' then
     insert into k2_private.customer_privacy_holds(customer_id,kind,reason,created_by) values(v_customer_id,p->>'kind',reason,actor) returning id into hold_id;
   else
     update k2_private.customer_privacy_holds h set resolved_at=clock_timestamp(),resolved_by=actor where h.id=(p->>'holdId')::uuid and h.customer_id=v_customer_id and h.resolved_at is null returning h.id into hold_id;
     if hold_id is null then raise exception 'K2_PRIVACY_HOLD_NOT_FOUND'; end if;
   end if;
   insert into k2_private.customer_privacy_review_events(customer_id,actor_id,action,hold_id,reason) values(v_customer_id,actor,operation,hold_id,reason);
   v_result:=jsonb_build_object('customerId',v_customer_id,'action',operation,'holdId',hold_id,'updatedAt',clock_timestamp());
   update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp() where actor_id=actor and action=p_action and idempotency_key=p_idempotency_key;
   return v_result;
 end if;
 select * into r from k2_private.customer_privacy_requests where id=(p->>'requestId')::uuid;
 if not found then raise exception 'K2_PRIVACY_REQUEST_NOT_FOUND'; end if;
 perform pg_advisory_xact_lock(hashtextextended('account-claim-user:'||r.user_id::text,0));
 if r.customer_id is not null then perform 1 from public.customers where id=r.customer_id for update; end if;
 select * into r from k2_private.customer_privacy_requests where id=r.id for update;
 if r.state not in ('pending','held') or r.verified_at is null then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
 if operation='assign' then
   update k2_private.customer_privacy_requests set assigned_to=actor,updated_at=clock_timestamp() where id=r.id;
 else
   if r.assigned_to is distinct from actor then raise exception 'K2_PRIVACY_ASSIGNMENT_REQUIRED'; end if;
   if r.customer_id is null then raise exception 'K2_PRIVACY_STATE_CONFLICT'; end if;
   if operation='add_hold' then
     insert into k2_private.customer_privacy_holds(customer_id,kind,reason,created_by) values(r.customer_id,p->>'kind',reason,actor) returning id into hold_id;
   else
     update k2_private.customer_privacy_holds set resolved_at=clock_timestamp(),resolved_by=actor
       where id=(p->>'holdId')::uuid and customer_id=r.customer_id and resolved_at is null returning id into hold_id;
     if hold_id is null then raise exception 'K2_PRIVACY_HOLD_NOT_FOUND'; end if;
   end if;
 end if;
 insert into k2_private.customer_privacy_review_events(request_id,customer_id,actor_id,action,hold_id,reason) values(r.id,r.customer_id,actor,operation,hold_id,reason);
 v_result:=jsonb_build_object('requestId',r.id,'action',operation,'assignedTo',case when operation='assign' then actor else r.assigned_to end,'holdId',hold_id,'updatedAt',clock_timestamp());
 update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
   where actor_id=actor and action=p_action and idempotency_key=p_idempotency_key;
 return v_result;
end $$;
revoke all on function public.read_admin_customer_privacy_v1(text,bigint,uuid,uuid,text,text) from public,anon,authenticated;
revoke all on function public.review_admin_customer_privacy_v1(text,bigint,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.read_admin_customer_privacy_v1(text,bigint,uuid,uuid,text,text) to authenticated;
grant execute on function public.review_admin_customer_privacy_v1(text,bigint,uuid,uuid,text,text) to authenticated;
commit;
