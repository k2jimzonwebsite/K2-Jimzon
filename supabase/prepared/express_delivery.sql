-- MAP-023 J. Prepared only, fresh coordinated transaction after canonical E.
-- No real courier facts, stock, staff identities or accepted orders are seeded.
do $$begin
 if to_regclass('k2_private.order_delivery_snapshots') is null
  or to_regclass('k2_private.express_delivery_quotes') is not null
  or to_regclass('k2_private.express_delivery_acceptances') is not null
  or to_regclass('k2_private.express_delivery_context') is not null then
  raise exception using errcode='55000',message='K2_EXPRESS_FRESH_CONTRACT_REQUIRED';
 end if;
end $$;

alter table k2_private.admin_request_nonces add column verified_backend_pid integer;
alter table k2_private.admin_request_nonces add column verified_transaction_id xid8;

create table k2_private.express_delivery_context(
 transaction_id xid8 primary key,backend_pid integer not null,
 action text not null check(action in ('delivery_express_quote','guest_delivery_accept','account_delivery_accept')),
 nonce uuid not null,order_id uuid not null references public.order_requests(id),
 actor_id uuid,grant_id uuid,command_key uuid not null,quote_version integer not null,
 check((action='guest_delivery_accept' and actor_id is null and grant_id is not null)
   or (action<>'guest_delivery_accept' and actor_id is not null and grant_id is null))
);
create table k2_private.express_delivery_quotes(
 order_id uuid not null references public.order_requests(id),version integer not null check(version>0),
 actor_id uuid not null references public.user_profiles(id),command_key uuid not null,
 courier text not null check(courier in ('Lalamove','Grab')),fee_minor integer not null check(fee_minor between 0 and 10000000),
 quoted_at timestamptz not null,expires_at timestamptz not null check(expires_at>quoted_at),
 route text not null check(length(btrim(route)) between 1 and 500),
 package_description text not null check(length(btrim(package_description)) between 1 and 500),
 availability_note text not null check(length(btrim(availability_note)) between 1 and 500),
 evidence_ref text not null check(length(btrim(evidence_ref)) between 1 and 500),
 note text not null check(length(btrim(note)) between 1 and 500),
 created_at timestamptz not null default clock_timestamp(),primary key(order_id,version)
);
create table k2_private.express_delivery_acceptances(
 order_id uuid primary key references public.order_requests(id),quote_version integer not null,
 actor_kind text not null check(actor_kind in ('guest','account')),actor_id uuid references auth.users(id),
 grant_id uuid references public.guest_access_grants(id),command_key uuid not null,
 payload_hash text not null check(payload_hash~'^[0-9a-f]{64}$'),
 fee_minor integer not null,total_amount numeric not null check(total_amount>=0),
 accepted_at timestamptz not null default clock_timestamp(),result jsonb not null,
 foreign key(order_id,quote_version) references k2_private.express_delivery_quotes(order_id,version),
 check((actor_kind='guest' and grant_id is not null and actor_id is null)
   or (actor_kind='account' and actor_id is not null and grant_id is null))
);
create unique index express_account_command_key on k2_private.express_delivery_acceptances(actor_id,command_key) where actor_kind='account';
create unique index express_guest_command_key on k2_private.express_delivery_acceptances(grant_id,command_key) where actor_kind='guest';
alter table k2_private.express_delivery_context enable row level security;
alter table k2_private.express_delivery_context force row level security;
alter table k2_private.express_delivery_quotes enable row level security;
alter table k2_private.express_delivery_quotes force row level security;
alter table k2_private.express_delivery_acceptances enable row level security;
alter table k2_private.express_delivery_acceptances force row level security;
revoke all on k2_private.express_delivery_context,k2_private.express_delivery_quotes,k2_private.express_delivery_acceptances from public,anon,authenticated,service_role;

create function k2_private.guard_express_context_v1() returns trigger
language plpgsql security definer set search_path='' as $$begin
 if tg_op='TRUNCATE' or tg_op='UPDATE' then raise exception using errcode='42501',message='K2_EXPRESS_CONTEXT_REQUIRED';end if;
 if tg_op='DELETE' then
  if old.transaction_id<>pg_current_xact_id() or old.backend_pid<>pg_backend_pid() then raise exception using errcode='42501',message='K2_EXPRESS_CONTEXT_REQUIRED';end if;
  return old;
 end if;
 if new.transaction_id<>pg_current_xact_id() or new.backend_pid<>pg_backend_pid() then raise exception using errcode='42501',message='K2_EXPRESS_CONTEXT_REQUIRED';end if;
 if new.action='delivery_express_quote' then
  if new.actor_id is distinct from auth.uid() or not public.is_staff() or coalesce(auth.jwt()->>'aal','')<>'aal2'
   or not exists(select 1 from k2_private.admin_request_nonces n where n.actor_id=new.actor_id and n.action=new.action and n.nonce=new.nonce
    and n.verified_backend_pid=new.backend_pid and n.verified_transaction_id=new.transaction_id) then
   raise exception using errcode='42501',message='K2_EXPRESS_CONTEXT_REQUIRED';end if;
 else
  if (new.action='account_delivery_accept' and new.actor_id is distinct from auth.uid())
   or not exists(select 1 from k2_private.guest_request_nonces n where n.action=new.action and n.nonce=new.nonce
    and n.verified_backend_pid=new.backend_pid and n.verified_transaction_id=new.transaction_id) then
   raise exception using errcode='42501',message='K2_EXPRESS_CONTEXT_REQUIRED';end if;
 end if;
 return new;
end $$;
create function k2_private.guard_express_orphan_v1() returns trigger
language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from k2_private.express_delivery_context where transaction_id=new.transaction_id) then
  raise exception using errcode='55000',message='K2_EXPRESS_CONTEXT_NOT_CLEARED';end if;
 return null;
end $$;
create trigger express_context_guard before insert or update or delete on k2_private.express_delivery_context for each row execute function k2_private.guard_express_context_v1();
create trigger express_context_no_truncate before truncate on k2_private.express_delivery_context for each statement execute function k2_private.guard_express_context_v1();
create constraint trigger express_context_orphan after insert on k2_private.express_delivery_context deferrable initially deferred for each row execute function k2_private.guard_express_orphan_v1();

create function k2_private.guard_express_history_v1() returns trigger
language plpgsql security definer set search_path='' as $$
declare c k2_private.express_delivery_context;q k2_private.express_delivery_quotes;s k2_private.order_delivery_snapshots;
begin
 if tg_op<>'INSERT' then raise exception using errcode='55000',message='K2_EXPRESS_HISTORY_IMMUTABLE';end if;
 select * into c from k2_private.express_delivery_context where transaction_id=pg_current_xact_id() and backend_pid=pg_backend_pid();
 if not found or c.order_id<>new.order_id or c.command_key<>new.command_key then raise exception using errcode='42501',message='K2_EXPRESS_CONTEXT_REQUIRED';end if;
 if tg_table_name='express_delivery_quotes' then
  if c.action<>'delivery_express_quote' or c.actor_id<>new.actor_id or c.quote_version<>new.version then raise exception using errcode='42501',message='K2_EXPRESS_CONTEXT_REQUIRED';end if;
 else
  if c.action not in ('guest_delivery_accept','account_delivery_accept') or c.quote_version<>new.quote_version
   or c.actor_id is distinct from new.actor_id or c.grant_id is distinct from new.grant_id then raise exception using errcode='42501',message='K2_EXPRESS_CONTEXT_REQUIRED';end if;
  select * into q from k2_private.express_delivery_quotes where order_id=new.order_id and version=new.quote_version;
  select * into s from k2_private.order_delivery_snapshots where order_id=new.order_id;
  if q.order_id is null or s.order_id is null or new.fee_minor is distinct from q.fee_minor
   or new.total_amount is distinct from s.total_amount+q.fee_minor::numeric/100
   or new.result is distinct from jsonb_build_object('ok',true,'orderReference',(select public_reference from public.order_requests where id=new.order_id),
    'quoteVersion',q.version,'shippingQuoteStatus','customer_confirmed','totalAmount',new.total_amount,'acceptedAt',new.accepted_at) then
   raise exception using errcode='22023',message='K2_ORDER_CHARGE_IMMUTABLE';end if;
  if new.accepted_at>=q.expires_at then raise exception using errcode='22023',message='K2_EXPRESS_QUOTE_EXPIRED';end if;
 end if;
 return new;
end $$;
create trigger express_quote_history before insert or update or delete on k2_private.express_delivery_quotes for each row execute function k2_private.guard_express_history_v1();
create trigger express_quote_no_truncate before truncate on k2_private.express_delivery_quotes for each statement execute function k2_private.guard_express_history_v1();
create trigger express_acceptance_history before insert or update or delete on k2_private.express_delivery_acceptances for each row execute function k2_private.guard_express_history_v1();
create trigger express_acceptance_no_truncate before truncate on k2_private.express_delivery_acceptances for each statement execute function k2_private.guard_express_history_v1();

create function k2_private.assert_express_order_v1(p_order_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare o public.order_requests;s k2_private.order_delivery_snapshots;
begin
 select * into o from public.order_requests where id=p_order_id;
 select * into s from k2_private.order_delivery_snapshots where order_id=p_order_id;
 if o.id is null or s.order_id is null or o.channel_source<>'website' or s.quote->>'service' is distinct from 'express'
  or o.status not in ('submitted','confirmed') or o.payment_status not in ('not_requested','unpaid','failed')
  or exists(select 1 from k2_private.express_delivery_acceptances where order_id=p_order_id) then
  raise exception using errcode='22023',message='K2_EXPRESS_ORDER_INELIGIBLE';end if;
end $$;

create function public.execute_express_delivery_quote_v1(p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,p_payload_text text,p_signature text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();p jsonb;h text;r k2_private.admin_command_receipts;o uuid;v integer;n numeric;t timestamptz;expiry timestamptz;result jsonb;k text;
begin
 if p_action is distinct from 'delivery_express_quote' then raise exception using errcode='22023',message='K2_ADMIN_ACTION_INVALID';end if;
 if not k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature) then raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';end if;
 perform 1 from public.user_profiles where id=v_actor and role::text in ('Admin','Staff') for share;
 if not found then raise exception using errcode='42501',message='K2_STAFF_REQUIRED';end if;
 h:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('express-quote:'||v_actor::text||':'||p_idempotency_key::text,0));
 select * into r from k2_private.admin_command_receipts where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
 if found then
  if r.payload_hash is distinct from h then raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';end if;
  if r.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';end if;return r.result;
 end if;
 p:=p_payload_text::jsonb;
 if jsonb_typeof(p) is distinct from 'object' or not(p ?& array['orderRequestId','expectedVersion','courier','feeMinor','quotedAt','expiresAt','route','packageDescription','availabilityNote','evidenceRef','note'])
  or p-array['orderRequestId','expectedVersion','courier','feeMinor','quotedAt','expiresAt','route','packageDescription','availabilityNote','evidenceRef','note']<>'{}'::jsonb then raise exception using errcode='22023',message='K2_EXPRESS_INPUT_INVALID';end if;
 foreach k in array array['orderRequestId','courier','quotedAt','expiresAt','route','packageDescription','availabilityNote','evidenceRef','note'] loop
  if jsonb_typeof(p->k) is distinct from 'string' or length(btrim(p->>k)) not between 1 and 500 then raise exception using errcode='22023',message='K2_EXPRESS_INPUT_INVALID';end if;
 end loop;
 foreach k in array array['expectedVersion','feeMinor'] loop
  if jsonb_typeof(p->k) is distinct from 'number' then raise exception using errcode='22023',message='K2_EXPRESS_INPUT_INVALID';end if;
  n:=(p->>k)::numeric;if n<>trunc(n) or n<0 or n>(case when k='feeMinor' then 10000000 else 2147483646 end) then raise exception using errcode='22023',message='K2_EXPRESS_INPUT_INVALID';end if;
 end loop;
 if p->>'courier' not in ('Lalamove','Grab') then raise exception using errcode='22023',message='K2_EXPRESS_INPUT_INVALID';end if;
 if p->>'orderRequestId' !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  or p->>'quotedAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$'
  or p->>'expiresAt' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$' then raise exception using errcode='22023',message='K2_EXPRESS_INPUT_INVALID';end if;
 o:=(p->>'orderRequestId')::uuid;
 perform 1 from public.order_requests where id=o for update;
 if not found then raise exception using errcode='42501',message='K2_ORDER_ACCESS_REQUIRED';end if;
 select * into r from k2_private.admin_command_receipts where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
 if found then
  if r.payload_hash is distinct from h then raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';end if;
  if r.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';end if;return r.result;
 end if;
 perform k2_private.assert_express_order_v1(o);
 select coalesce(max(version),0) into v from k2_private.express_delivery_quotes where order_id=o;
 if v is distinct from (p->>'expectedVersion')::integer then raise exception using errcode='40001',message='K2_EXPRESS_QUOTE_STALE';end if;
 begin t:=(p->>'quotedAt')::timestamptz;expiry:=(p->>'expiresAt')::timestamptz;
 exception when invalid_datetime_format or datetime_field_overflow then raise exception using errcode='22023',message='K2_EXPRESS_INPUT_INVALID';end;
 if t>clock_timestamp() or t<clock_timestamp()-interval '24 hours' or expiry<=clock_timestamp() or expiry<=t or expiry>clock_timestamp()+interval '24 hours' then raise exception using errcode='22023',message='K2_EXPRESS_QUOTE_EXPIRED';end if;
 insert into k2_private.express_delivery_context values(pg_current_xact_id(),pg_backend_pid(),p_action,p_nonce,o,v_actor,null,p_idempotency_key,v+1);
 insert into k2_private.express_delivery_quotes(order_id,version,actor_id,command_key,courier,fee_minor,quoted_at,expires_at,route,package_description,availability_note,evidence_ref,note)
 values(o,v+1,v_actor,p_idempotency_key,p->>'courier',(p->>'feeMinor')::integer,t,expiry,btrim(p->>'route'),btrim(p->>'packageDescription'),btrim(p->>'availabilityNote'),btrim(p->>'evidenceRef'),btrim(p->>'note'));
 result:=jsonb_build_object('ok',true,'orderRequestId',o,'quoteVersion',v+1);
 insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash,result) values(v_actor,p_action,p_idempotency_key,h,result);
 insert into public.order_request_events(order_request_id,to_status,metadata) select id,status,jsonb_build_object('event','express_quote_recorded','quoteVersion',v+1,'actorId',v_actor) from public.order_requests where id=o;
 delete from k2_private.express_delivery_context where transaction_id=pg_current_xact_id();return result;
end $$;

create function k2_private.accept_express_delivery_v1(p_account boolean,p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text,p_guest_grant_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;h text;v_key uuid;v_version numeric;v_actor uuid:=auth.uid();v_action text;v_customer uuid;g public.guest_access_grants;
 o public.order_requests;r k2_private.express_delivery_acceptances;q k2_private.express_delivery_quotes;s k2_private.order_delivery_snapshots;
 v_kind text;v_identity uuid;v_total numeric;v_time timestamptz;v_result jsonb;budget record;
begin
 if p_account is null then raise exception using errcode='22023',message='K2_EXPRESS_INPUT_INVALID';end if;
 v_action:=case when p_account then 'account_delivery_accept' else 'guest_delivery_accept' end;
 if not k2_private.verify_guest_bff_request(v_action,p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature) then raise exception using errcode='28000',message='K2_GUEST_REQUEST_REPLAYED';end if;
 p:=p_payload_text::jsonb;
 if jsonb_typeof(p) is distinct from 'object' or not(p ?& array['orderReference','quoteVersion','idempotencyKey'])
  or p-array['orderReference','quoteVersion','idempotencyKey']<>'{}'::jsonb
  or jsonb_typeof(p->'orderReference') is distinct from 'string' or p->>'orderReference' !~ '^WEB-[A-Z0-9]{8,32}$'
  or jsonb_typeof(p->'idempotencyKey') is distinct from 'string' or p->>'idempotencyKey' !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
  or jsonb_typeof(p->'quoteVersion') is distinct from 'number' then raise exception using errcode='22023',message='K2_EXPRESS_INPUT_INVALID';end if;
 v_version:=(p->>'quoteVersion')::numeric;
 if v_version<>trunc(v_version) or v_version not between 1 and 2147483647 then raise exception using errcode='22023',message='K2_EXPRESS_INPUT_INVALID';end if;
 v_key:=(p->>'idempotencyKey')::uuid;h:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
 -- Current identity authorization precedes receipt disclosure. Hold the authority
 -- row before the order, matching guest revocation/account-link writers.
 if p_account then
  if v_actor is null then raise exception using errcode='42501',message='K2_ORDER_ACCESS_REQUIRED';end if;
  select customer_id into v_customer from public.customer_accounts where user_id=v_actor and status='active' for share;
  if not found then raise exception using errcode='42501',message='K2_ORDER_ACCESS_REQUIRED';end if;
  v_kind:='account';v_identity:=v_actor;
 else
  if p_guest_grant_hash is null or p_guest_grant_hash !~ '^[0-9a-f]{64}$' then raise exception using errcode='42501',message='K2_ORDER_ACCESS_REQUIRED';end if;
  select * into g from public.guest_access_grants where token_hash=decode(p_guest_grant_hash,'hex') and status='active'
   and expires_at>clock_timestamp() and (max_uses is null or use_count<max_uses) for update;
  if not found then raise exception using errcode='42501',message='K2_ORDER_ACCESS_REQUIRED';end if;
  v_actor:=null;v_kind:='guest';v_identity:=g.id;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('express-accept:'||v_kind||':'||v_identity::text||':'||v_key::text,0));
 select * into o from public.order_requests where public_reference=p->>'orderReference' for update;
 if not found or (p_account and o.customer_id is distinct from v_customer) then
  raise exception using errcode='42501',message='K2_ORDER_ACCESS_REQUIRED';end if;
 if not p_account then
  -- Grant validity can change with the clock while the order lock is awaited.
  if g.expires_at<=clock_timestamp() or (g.max_uses is not null and g.use_count>=g.max_uses) then raise exception using errcode='42501',message='K2_ORDER_ACCESS_REQUIRED';end if;
  perform 1 from public.guest_access_grant_scopes where grant_id=g.id and scope_kind='order_request' and scope_id=o.id and 'read'=any(permissions) for share;
  if not found then raise exception using errcode='42501',message='K2_ORDER_ACCESS_REQUIRED';end if;
 end if;
 select * into budget from k2_private.consume_guest_rate(v_action,v_kind,extensions.digest(convert_to(v_identity::text,'UTF8'),'sha256'),300,60);
 if not budget.allowed then raise exception using errcode='54000',message='K2_EXPRESS_RATE_LIMITED';end if;
 select * into r from k2_private.express_delivery_acceptances where actor_kind=v_kind and command_key=v_key
  and ((p_account and actor_id=v_actor) or (not p_account and grant_id=g.id));
 if found then
  if r.payload_hash is distinct from h or r.order_id<>o.id then raise exception using errcode='22023',message='K2_DELIVERY_IDEMPOTENCY_CONFLICT';end if;
  return r.result;
 end if;
 perform k2_private.assert_express_order_v1(o.id);
 select * into q from k2_private.express_delivery_quotes where order_id=o.id order by version desc limit 1;
 if not found or q.version<>v_version then raise exception using errcode='40001',message='K2_EXPRESS_QUOTE_STALE';end if;
 v_time:=clock_timestamp();
 if q.expires_at<=v_time then raise exception using errcode='22023',message='K2_EXPRESS_QUOTE_EXPIRED';end if;
 select * into s from k2_private.order_delivery_snapshots where order_id=o.id;
 v_total:=s.total_amount+q.fee_minor::numeric/100;
 v_result:=jsonb_build_object('ok',true,'orderReference',o.public_reference,'quoteVersion',q.version,
  'shippingQuoteStatus','customer_confirmed','totalAmount',v_total,'acceptedAt',v_time);
 insert into k2_private.express_delivery_context values(pg_current_xact_id(),pg_backend_pid(),v_action,p_nonce,o.id,v_actor,case when p_account then null else g.id end,v_key,q.version);
 insert into k2_private.express_delivery_acceptances(order_id,quote_version,actor_kind,actor_id,grant_id,command_key,payload_hash,fee_minor,total_amount,accepted_at,result)
 values(o.id,q.version,v_kind,v_actor,case when p_account then null else g.id end,v_key,h,q.fee_minor,v_total,v_time,v_result);
 update public.order_requests set shipping_amount=q.fee_minor::numeric/100,shipping_quote_status='customer_confirmed',total_amount=v_total,
  customer_delivery_confirmed_at=v_time,delivery_status='ready_to_pack',updated_at=v_time where id=o.id;
 insert into public.order_request_events(order_request_id,to_status,metadata) values(o.id,o.status,jsonb_build_object('event','express_delivery_accepted','quoteVersion',q.version,'actorKind',v_kind));
 if not p_account then update public.guest_access_grants set use_count=use_count+1,last_used_at=v_time where id=g.id;end if;
 delete from k2_private.express_delivery_context where transaction_id=pg_current_xact_id();return v_result;
end $$;

create function public.accept_guest_express_delivery_v1(p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text,p_guest_grant_hash text)
returns jsonb language sql security definer set search_path='' as $$select k2_private.accept_express_delivery_v1(false,p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature,p_guest_grant_hash);$$;
create function public.accept_account_express_delivery_v1(p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text)
returns jsonb language sql security definer set search_path='' as $$select k2_private.accept_express_delivery_v1(true,p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature,null);$$;

create function k2_private.guard_express_acceptance_applied_v1() returns trigger
language plpgsql security definer set search_path='' as $$begin
 if not exists(select 1 from public.order_requests where id=new.order_id and shipping_quote_status='customer_confirmed'
  and shipping_amount=new.fee_minor::numeric/100 and total_amount=new.total_amount and customer_delivery_confirmed_at=new.accepted_at) then
  raise exception using errcode='55000',message='K2_EXPRESS_ACCEPTANCE_NOT_APPLIED';end if;return null;
end $$;
create constraint trigger express_acceptance_applied after insert on k2_private.express_delivery_acceptances deferrable initially deferred for each row execute function k2_private.guard_express_acceptance_applied_v1();

create function k2_private.project_express_quote_v1(p_order_id uuid) returns jsonb
language sql security definer stable set search_path='' as $$
 select jsonb_build_object('quoteVersion',q.version,'courier',q.courier,'feeMinor',q.fee_minor,
  'subtotal',s.subtotal,'discountAmount',s.discount_amount,'proposedTotal',s.total_amount+q.fee_minor::numeric/100,
  'quotedAt',q.quoted_at,'expiresAt',q.expires_at,'availabilityNote',q.availability_note,
  'accepted',exists(select 1 from k2_private.express_delivery_acceptances where order_id=q.order_id))
 from k2_private.express_delivery_quotes q join k2_private.order_delivery_snapshots s on s.order_id=q.order_id
 where q.order_id=p_order_id order by q.version desc limit 1;
$$;

create function public.read_staff_express_delivery_v1(p_order_id uuid) returns jsonb
language plpgsql security definer stable set search_path='' as $$
declare o public.order_requests;q k2_private.express_delivery_quotes;s k2_private.order_delivery_snapshots;
begin
 if auth.uid() is null or coalesce(auth.jwt()->>'aal','')<>'aal2'
  or not exists(select 1 from public.user_profiles where id=auth.uid() and role::text in ('Admin','Staff')) then
  raise exception using errcode='42501',message='K2_STAFF_REQUIRED';end if;
 select * into o from public.order_requests where id=p_order_id;
 select * into s from k2_private.order_delivery_snapshots where order_id=p_order_id;
 if o.id is null or s.order_id is null or o.channel_source is distinct from 'website' or s.quote->>'service' is distinct from 'express' then
  raise exception using errcode='42501',message='K2_ORDER_ACCESS_REQUIRED';end if;
 select * into q from k2_private.express_delivery_quotes where order_id=p_order_id order by version desc limit 1;
 return jsonb_build_object('ok',true,'orderRequestId',o.id,'currentVersion',coalesce(q.version,0),
  'eligible',o.status in ('submitted','confirmed') and o.payment_status in ('not_requested','unpaid','failed')
   and not exists(select 1 from k2_private.express_delivery_acceptances where order_id=o.id),
  'quote',case when q.order_id is null then null::jsonb else k2_private.project_express_quote_v1(o.id)||jsonb_build_object(
   'route',q.route,'packageDescription',q.package_description,'evidenceRef',q.evidence_ref,'note',q.note) end);
end $$;

revoke all on function k2_private.guard_express_context_v1(),k2_private.guard_express_orphan_v1(),k2_private.guard_express_history_v1(),k2_private.assert_express_order_v1(uuid),
 k2_private.accept_express_delivery_v1(boolean,bigint,uuid,text,text,text,text),k2_private.guard_express_acceptance_applied_v1(),k2_private.project_express_quote_v1(uuid)
 from public,anon,authenticated,service_role;
revoke all on function public.execute_express_delivery_quote_v1(text,bigint,uuid,uuid,text,text),public.accept_guest_express_delivery_v1(bigint,uuid,text,text,text,text),public.accept_account_express_delivery_v1(bigint,uuid,text,text,text),public.read_staff_express_delivery_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.execute_express_delivery_quote_v1(text,bigint,uuid,uuid,text,text),public.accept_account_express_delivery_v1(bigint,uuid,text,text,text),public.read_staff_express_delivery_v1(uuid) to authenticated;
grant execute on function public.accept_guest_express_delivery_v1(bigint,uuid,text,text,text,text) to anon;

do $correction$ declare t record;b record;a record;v_definition text;begin
 for t in select * from jsonb_to_recordset('[{"identity":"k2_private.verify_admin_bff_request(text, bigint, uuid, uuid, text, text)","before":"7fbf2efca8dc5b501ffae068b4d9e3a947713f7c3015c5306bc3e54325985d9e","after":"86e42e2d41650855907ab6a0dcecbd1e9002996e1e9f25347b6d195c494e42be","body":"\ndeclare\n  v_actor uuid := auth.uid();\n  v_secret bytea;\n  v_payload_hash text;\n  v_expected text;\n  v_message text;\n  v_bucket_start timestamptz;\n  v_actor_hits integer;\n  v_global_hits integer;\nbegin\n  if v_actor is null or not public.is_staff() then\n    raise exception using errcode=''42501'',message=''K2_ADMIN_ACCESS_REQUIRED'';\n  end if;\n  if coalesce(auth.jwt()->>''aal'','''')<>''aal2'' then\n    raise exception using errcode=''42501'',message=''K2_ADMIN_AAL2_REQUIRED'';\n  end if;\n  if p_action is null or p_timestamp is null or p_nonce is null\n     or p_idempotency_key is null or p_payload_text is null or p_signature is null then\n    raise exception using errcode=''22023'',message=''K2_ADMIN_REQUEST_INVALID'';\n  end if;\n  if p_action not in (''delivery_express_quote'',''delivery_customer_rates_publish'',\n    ''confirm_order'', ''packing_scan'', ''payment_status'', ''delivery_details'',\n    ''fulfill_order'', ''transfer_lot'', ''assign_box'',\n    ''inbox_internal_note'', ''inbox_mark_read'', ''inbox_workflow'',\n    ''pasabuy_transition'', ''pasabuy_quote'',\n    ''intake_session_create'', ''intake_session_step'', ''intake_draft'',\n    ''intake_inventory'', ''intake_publication'', ''intake_evidence_register'',\n    ''consignment_create'', ''consignment_add_line'', ''consignment_scan'',\n    ''consignment_advance'', ''consignment_finalize'',\n    ''lots_reconcile'', ''lot_clearance'',\n    ''coupon_create'', ''coupon_state'', ''coupon_archive'',\n    ''admin_session_register'', ''admin_session_validate'',\n    ''admin_session_revoke_current'', ''admin_session_revoke_one'', ''admin_session_revoke_all'',\n    ''admin_session_list'',\n    ''catalog_import_chunk'',\n    ''wholesale_inquiry_review'',\n    ''admin_mfa_replacement_requested'', ''admin_mfa_replacement_completed'',\n    ''product_media_upload'', ''product_media_assign'', ''product_media_cleanup_complete'',\n    ''product_media_orphan_cleanup'', ''product_media_orphan_cleanup_complete'',\n    ''globe_config_update'', ''review_create'', ''review_update'', ''review_publish'', ''review_withdraw'',\n    ''supplier_create'',\n    ''channel_internal_event_verify'', ''website_listing_set'',\n    ''staff_role_change'', ''admin_delete_pin_set'',\n    ''product_master_update'', ''product_master_status'', ''product_master_delete'',\n    ''category_policy_set'', ''category_policy_clear'',\n    ''inbox_send_reply'', ''product_knowledge_save'',\n    ''ai_spend_controls_update''\n  ) then\n    raise exception using errcode=''22023'',message=''K2_ADMIN_ACTION_INVALID'';\n  end if;\n  if p_payload_text is null or octet_length(convert_to(p_payload_text, ''UTF8'')) >\n       (case when p_action=''catalog_import_chunk'' then 1048576 else 16384 end)\n     or p_signature !~ ''^[0-9a-f]{64}$'' then\n    raise exception using errcode=''22023'',message=''K2_ADMIN_REQUEST_INVALID'';\n  end if;\n  if abs(extract(epoch from clock_timestamp())::bigint - p_timestamp)>300 then\n    raise exception using errcode=''28000'',message=''K2_ADMIN_SIGNATURE_EXPIRED'';\n  end if;\n  select request_secret into v_secret\n  from k2_private.admin_bff_secrets where singleton = true;\n  if v_secret is null then\n    raise exception using errcode=''55000'', message=''K2_ADMIN_BOUNDARY_NOT_CONFIGURED'';\n  end if;\n\n  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text, ''UTF8''), ''sha256''), ''hex'');\n  v_message := p_action || E''\\n'' || p_timestamp::text || E''\\n'' || p_nonce::text\n    || E''\\n'' || v_actor::text || E''\\n'' || p_idempotency_key::text || E''\\n'' || v_payload_hash;\n  v_expected := encode(extensions.hmac(convert_to(v_message, ''UTF8''), v_secret, ''sha256''), ''hex'');\n  if extensions.digest(convert_to(v_expected, ''UTF8''), ''sha256'')\n     <> extensions.digest(convert_to(p_signature, ''UTF8''), ''sha256'') then\n    raise exception using errcode=''28000'', message=''K2_ADMIN_SIGNATURE_INVALID'';\n  end if;\n\n  v_bucket_start := date_trunc(''minute'', clock_timestamp());\n  delete from k2_private.admin_request_rate_buckets\n  where bucket_start < v_bucket_start - interval ''1 day'';\n  insert into k2_private.admin_request_rate_buckets(scope, subject, bucket_start, hit_count)\n  values (''actor'', v_actor::text, v_bucket_start, 1)\n  on conflict (scope, subject, bucket_start) do update\n    set hit_count = k2_private.admin_request_rate_buckets.hit_count + 1\n  returning hit_count into v_actor_hits;\n  if v_actor_hits > 360 then\n    raise exception using errcode=''54000'', message=''K2_ADMIN_RATE_LIMITED'';\n  end if;\n  insert into k2_private.admin_request_rate_buckets(scope, subject, bucket_start, hit_count)\n  values (''global'', ''all_admin_requests'', v_bucket_start, 1)\n  on conflict (scope, subject, bucket_start) do update\n    set hit_count = k2_private.admin_request_rate_buckets.hit_count + 1\n  returning hit_count into v_global_hits;\n  if v_global_hits > 6000 then\n    raise exception using errcode=''54000'', message=''K2_ADMIN_RATE_LIMITED'';\n  end if;\n\n  delete from k2_private.admin_request_nonces where expires_at<=now();\n  insert into k2_private.admin_request_nonces(actor_id,action,nonce,expires_at,verified_backend_pid,verified_transaction_id)\n  values(v_actor,p_action,p_nonce,now()+interval ''10 minutes'',pg_backend_pid(),pg_current_xact_id()) on conflict do nothing;\n  return found;\nend;\n","acl":["postgres=X/postgres"],"config":["search_path=\"\""],"definer":true},{"identity":"k2_private.verify_guest_bff_request(text, bigint, uuid, text, text, text)","before":"c8a49e74f516c5deb162cad41217014df9f50c030c832ca163df01dd09772d9f","after":"547c197cc979c54c1f1292b2ecdf5b63154a3f3dac0fd045a5cee1611bdb6d80","body":"\ndeclare\n  v_secret bytea;\n  v_payload_hash text;\n  v_expected text;\n  v_message text;\nbegin\n  if p_timestamp is null or p_nonce is null or p_ip_hash is null or p_signature is null then\n    raise exception using errcode=''28000'', message=''K2_GUEST_SIGNATURE_INVALID'';\n  end if;\n  if p_action is null or p_action not in (''guest_delivery_accept'',''account_delivery_accept'',''delivery_quote'',\n    ''order'',''pasabuy'',''coupon'',''guest_start'',''guest_read'',''guest_reply'',\n    ''account_claim'',''account_read'',''account_reply'',''wholesale_inquiry'',\n    ''account_settings_read'',''account_settings_write'',''account_notification_read''\n  ) then\n    raise exception using errcode=''22023'', message=''K2_GUEST_ACTION_INVALID'';\n  end if;\n  if p_payload_text is null or octet_length(convert_to(p_payload_text,''UTF8'')) > 24576 then\n    raise exception using errcode=''22023'', message=''K2_GUEST_PAYLOAD_INVALID'';\n  end if;\n  if p_ip_hash !~ ''^[0-9a-f]{64}$'' or p_signature !~ ''^[0-9a-f]{64}$'' then\n    raise exception using errcode=''28000'', message=''K2_GUEST_SIGNATURE_INVALID'';\n  end if;\n  if abs(extract(epoch from clock_timestamp())::bigint - p_timestamp) > 300 then\n    raise exception using errcode=''28000'', message=''K2_GUEST_SIGNATURE_EXPIRED'';\n  end if;\n  select request_secret into v_secret from k2_private.guest_bff_secrets where singleton=true;\n  if v_secret is null then\n    raise exception using errcode=''55000'', message=''K2_GUEST_BOUNDARY_NOT_CONFIGURED'';\n  end if;\n  v_payload_hash:=encode(extensions.digest(convert_to(p_payload_text,''UTF8''),''sha256''),''hex'');\n  v_message:=p_action||E''\\n''||p_timestamp::text||E''\\n''||p_nonce::text||E''\\n''||v_payload_hash||E''\\n''||p_ip_hash;\n  v_expected:=encode(extensions.hmac(convert_to(v_message,''UTF8''),v_secret,''sha256''),''hex'');\n  if extensions.digest(convert_to(v_expected,''UTF8''),''sha256'')\n     is distinct from extensions.digest(convert_to(p_signature,''UTF8''),''sha256'') then\n    raise exception using errcode=''28000'', message=''K2_GUEST_SIGNATURE_INVALID'';\n  end if;\n  delete from k2_private.guest_request_nonces where expires_at <= now();\n  insert into k2_private.guest_request_nonces(action,nonce,expires_at,verified_backend_pid,verified_transaction_id)\n  values(p_action,p_nonce,now()+interval ''10 minutes'',pg_catalog.pg_backend_pid(),pg_catalog.pg_current_xact_id()) on conflict do nothing;\n  return found;\nend;\n","acl":["postgres=X/postgres"],"config":["search_path=\"\""],"definer":true},{"identity":"k2_private.guard_order_delivery_charge_v1()","before":"f86b24530beb701ee0454eb7225cb83099956712a1a87ea4a08d3ed6e0403022","after":"a7996740a83ac7881f582e23a600c43cfe6974b869668aa118d1a9bc6976a766","body":"\ndeclare v_snapshot k2_private.order_delivery_snapshots;v_order public.order_requests;v_acceptance k2_private.express_delivery_acceptances;\nbegin\n if tg_op=''UPDATE'' then\n  select * into v_snapshot from k2_private.order_delivery_snapshots where order_id=old.id;\n  if not found then\n   if old.channel_source is distinct from ''website'' and new.channel_source=''website'' then\n    raise exception using errcode=''22023'',message=''K2_DELIVERY_REVIEW_REQUIRED'';\n   end if;\n   return new;\n  end if;\n  if new.id is distinct from old.id or new.channel_source is distinct from old.channel_source\n   or new.shop_id is distinct from old.shop_id then\n   raise exception using errcode=''22023'',message=''K2_ORDER_CHARGE_IMMUTABLE'';\n  end if;\n  v_order:=new;\n else\n  -- Deferred INSERT: original and persisted admission identity both matter.\n  select * into v_order from public.order_requests where id=new.id;\n  if not found then\n   if new.channel_source=''website'' then raise exception using errcode=''22023'',message=''K2_DELIVERY_REVIEW_REQUIRED'';end if;\n   return null;\n  end if;\n  if new.channel_source<>''website'' and v_order.channel_source<>''website'' then return null;end if;\n  select * into v_snapshot from k2_private.order_delivery_snapshots where order_id=v_order.id;\n  if not found then raise exception using errcode=''22023'',message=''K2_DELIVERY_REVIEW_REQUIRED'';end if;\n end if;\n select * into v_acceptance from k2_private.express_delivery_acceptances where order_id=v_order.id;\n if v_order.idempotency_key is distinct from v_snapshot.idempotency_key\n  or v_order.request_fingerprint is distinct from v_snapshot.request_fingerprint\n  or v_order.fulfillment_method is distinct from v_snapshot.fulfillment_method\n  or v_order.delivery_address is distinct from v_snapshot.delivery_address\n  or v_order.subtotal is distinct from v_snapshot.subtotal\n  or v_order.discount_amount is distinct from v_snapshot.discount_amount\n  or v_order.total_amount is distinct from coalesce(v_acceptance.total_amount,v_snapshot.total_amount)\n  or v_order.customer_delivery_confirmed_at is distinct from coalesce(v_acceptance.accepted_at,v_snapshot.accepted_at) then\n  raise exception using errcode=''22023'',message=''K2_ORDER_CHARGE_IMMUTABLE'';\n end if;\n if v_snapshot.quote->>''service''=''express'' then\n  if v_acceptance.order_id is null then\n   if v_order.shipping_amount is distinct from 0::numeric or v_order.shipping_quote_status is distinct from ''pending_quote''\n    or v_order.payment_status not in (''not_requested'',''unpaid'',''failed'') then\n    raise exception using errcode=''22023'',message=''K2_DELIVERY_ACCEPTANCE_REQUIRED'';\n   end if;\n  elsif v_order.shipping_amount is distinct from v_acceptance.fee_minor::numeric/100\n    or v_order.shipping_quote_status is distinct from ''customer_confirmed'' then\n   raise exception using errcode=''22023'',message=''K2_ORDER_CHARGE_IMMUTABLE'';\n  end if;\n else\n  if v_order.shipping_quote_status<>''customer_confirmed''\n   or v_order.shipping_amount is distinct from (v_snapshot.quote->>''feeMinor'')::numeric/100 then\n   raise exception using errcode=''22023'',message=''K2_ORDER_CHARGE_IMMUTABLE'';\n  end if;\n end if;\n if tg_op=''UPDATE'' then return new;end if;\n return null;\nend ","acl":["postgres=X/postgres"],"config":["search_path=\"\""],"definer":true},{"identity":"public.read_guest_order_status_v1(bigint, uuid, text, text, text, text)","before":"b894e1ab92a83015ef5e4a88ebcc7c6ef722ba95c692e38f0c2f5d2cbe16d2f7","after":"701e7c6c4c60431a57032c3ec9672a4732e65e772a0a9be163e345a26248e978","body":"\ndeclare\n  v_grant public.guest_access_grants;\n  v_rate record;\nbegin\n  if not k2_private.verify_guest_bff_request(\n    ''guest_read'',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature\n  ) then\n    return query select false,''REQUEST_REPLAYED'',0,''[]''::jsonb; return;\n  end if;\n  if p_payload_text <> ''{}'' or p_guest_grant_hash !~ ''^[0-9a-f]{64}$'' then\n    return query select false,''GUEST_ACCESS_REQUIRED'',0,''[]''::jsonb; return;\n  end if;\n\n  update public.guest_access_grants g set use_count=use_count+1,last_used_at=now()\n  where g.token_hash=decode(p_guest_grant_hash,''hex'') and g.status=''active''\n    and g.expires_at>now() and (g.max_uses is null or g.use_count<g.max_uses)\n  returning g.* into v_grant;\n  if not found then\n    return query select false,''GUEST_ACCESS_EXPIRED'',0,''[]''::jsonb; return;\n  end if;\n\n  select * into v_rate from k2_private.consume_guest_rate(\n    ''guest_order_read'',''grant'',v_grant.token_hash,300,60\n  );\n  if not v_rate.allowed then\n    return query select false,''RATE_LIMITED'',v_rate.retry_after_seconds,''[]''::jsonb; return;\n  end if;\n\n  return query select true,null::text,0,coalesce((\n    select jsonb_agg(jsonb_build_object(\n      ''public_reference'',scoped.public_reference,\n      ''status'',scoped.status,\n      ''payment_status'',scoped.payment_status,\n      ''total_amount'',case when scoped.shipping_quote_status in (''customer_confirmed'',''platform_charged'',''waived'') and scoped.total_amount>=0 then scoped.total_amount else null::numeric end,\n      ''shipping_quote_status'',scoped.shipping_quote_status,\n      ''delivery_status'',scoped.delivery_status,\n      ''express_quote'',k2_private.project_express_quote_v1(scoped.id),\n      ''item_count'',coalesce((\n        select sum(line.quantity)::integer\n        from public.order_request_items line\n        where line.order_request_id=scoped.id\n      ),0),\n      ''created_at'',scoped.created_at\n    ) order by scoped.created_at desc)\n    from (\n      select request.* from public.order_requests request\n      join public.guest_access_grant_scopes s\n        on s.scope_kind=''order_request'' and s.scope_id=request.id\n      where s.grant_id=v_grant.id and ''read''=any(s.permissions)\n      order by request.created_at desc limit 20\n    ) scoped\n  ),''[]''::jsonb);\nend;\n","acl":["postgres=X/postgres","anon=X/postgres"],"config":["search_path=\"\""],"definer":true},{"identity":"public.list_customer_account_history_v1(bigint, uuid, text, text, text)","before":"9ed9cf8fcdc19d37ef52a4ba256fcbfb77945c6391855bee22418c29468a80f5","after":"1a97473f50de0a4542cb7c53b4a05793201508689da74251a8793c6bcff45fd1","body":"\ndeclare\n  v_account public.customer_accounts;\n  v_rate record;\nbegin\n  if auth.uid() is null then\n    return query select false,''ACCOUNT_AUTH_REQUIRED'',0,null::timestamptz,''[]''::jsonb,''[]''::jsonb,''[]''::jsonb; return;\n  end if;\n  if not k2_private.verify_guest_bff_request(\n    ''account_read'',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature\n  ) then\n    return query select false,''REQUEST_REPLAYED'',0,null::timestamptz,''[]''::jsonb,''[]''::jsonb,''[]''::jsonb; return;\n  end if;\n  if p_payload_text <> ''{}'' then\n    return query select false,''REQUEST_INVALID'',0,null::timestamptz,''[]''::jsonb,''[]''::jsonb,''[]''::jsonb; return;\n  end if;\n  select * into v_account from public.customer_accounts\n  where user_id=auth.uid() and status=''active'';\n  if not found then\n    return query select false,''ACCOUNT_NOT_LINKED'',0,null::timestamptz,''[]''::jsonb,''[]''::jsonb,''[]''::jsonb; return;\n  end if;\n  select * into v_rate from k2_private.consume_guest_rate(\n    ''account_read'',''actor'',extensions.digest(convert_to(auth.uid()::text,''UTF8''),''sha256''),300,60\n  );\n  if not v_rate.allowed then\n    return query select false,''RATE_LIMITED'',v_rate.retry_after_seconds,null::timestamptz,''[]''::jsonb,''[]''::jsonb,''[]''::jsonb; return;\n  end if;\n  return query select true,null::text,0,v_account.linked_at,\n    coalesce((select jsonb_agg(jsonb_build_object(\n      ''public_reference'',o.public_reference,''status'',o.status,\n      ''payment_status'',o.payment_status,''shipping_quote_status'',o.shipping_quote_status,''total_amount'',case when o.shipping_quote_status in (''customer_confirmed'',''platform_charged'',''waived'') and o.total_amount>=0 then o.total_amount else null::numeric end,\n      ''express_quote'',k2_private.project_express_quote_v1(o.id),\n      ''created_at'',o.created_at\n    ) order by o.created_at desc) from (\n      select * from public.order_requests where customer_id=v_account.customer_id\n      order by created_at desc limit 20\n    ) o),''[]''::jsonb),\n    coalesce((select jsonb_agg(jsonb_build_object(\n      ''public_reference'',p.public_reference,''status'',p.status,\n      ''item_title'',p.item_title,''quantity'',p.quantity,''created_at'',p.created_at\n    ) order by p.created_at desc) from (\n      select * from public.pasabuy_requests where customer_id=v_account.customer_id\n      order by created_at desc limit 20\n    ) p),''[]''::jsonb),\n    coalesce((select jsonb_agg(jsonb_build_object(\n      ''conversation_reference'',c.guest_reference,''channel'',c.platform::text,\n      ''status'',c.status,''last_message_at'',c.last_message_at,\n      ''messages'',coalesce((select jsonb_agg(jsonb_build_object(\n        ''direction'',case when m.sender_type=''Customer'' then ''inbound'' else ''outbound'' end,\n        ''content'',m.content,''delivery_status'',m.delivery_status,''created_at'',m.created_at\n      ) order by m.created_at) from (\n        select msg.* from public.messages msg where msg.conversation_id=c.id\n          and (msg.delivery_status<>''internal_only'' or msg.sender_type=''Customer'')\n        order by msg.created_at desc limit 100\n      ) m),''[]''::jsonb)\n    ) order by c.last_message_at desc) from (\n      select * from public.conversations where customer_id=v_account.customer_id\n      order by last_message_at desc limit 20\n    ) c),''[]''::jsonb);\nend;\n","acl":["postgres=X/postgres","authenticated=X/postgres"],"config":["search_path=\"\""],"definer":true},{"identity":"public.get_order_conversation_v1(uuid, text)","before":"e2e4ada15a6c0c06879383d2e1db90cc43c98eed83e78ab49d984f7e80c9cb8c","after":"5249b6710d45b8ed590f03c22c8b2eb2e6ad27981cb294607464b852162be3b7","body":"\ndeclare\n  v_order public.order_requests;\n  v_conversation_id uuid;\nbegin\n  if p_order_id is null or p_order_key is null or length(p_order_key) not between 32 and 100 then\n    return jsonb_build_object(''ok'', false, ''error'', ''ORDER_ACCESS_REQUIRED'');\n  end if;\n  select * into v_order from public.order_requests\n  where id=p_order_id and idempotency_key=p_order_key;\n  if not found then return jsonb_build_object(''ok'', false, ''error'', ''ORDER_ACCESS_REQUIRED''); end if;\n  select id into v_conversation_id from public.conversations\n  where source_kind=''order_request'' and source_id=v_order.id;\n  if v_conversation_id is null then\n    return jsonb_build_object(''ok'', false, ''error'', ''ORDER_CONVERSATION_UNAVAILABLE'');\n  end if;\n  return jsonb_build_object(\n    ''ok'', true,\n    ''public_reference'', v_order.public_reference,\n    ''order_status'', v_order.status,\n    ''payment_status'', v_order.payment_status,\n    ''shipping_quote_status'', v_order.shipping_quote_status,\n    ''total_amount'', case when v_order.shipping_quote_status in (''customer_confirmed'',''platform_charged'',''waived'') and v_order.total_amount>=0 then v_order.total_amount else null::numeric end,\n    ''express_quote'', k2_private.project_express_quote_v1(v_order.id),\n    ''messages'', coalesce((\n      select jsonb_agg(jsonb_build_object(\n        ''id'', m.id, ''content'', m.content, ''created_at'', m.created_at,\n        ''direction'', case when m.sender_type=''Customer'' then ''inbound'' else ''outbound'' end\n      ) order by m.created_at)\n      from (select * from public.messages\n        where conversation_id=v_conversation_id and delivery_status<>''internal_only''\n        order by created_at desc limit 100) m\n    ), ''[]''::jsonb)\n  );\nend;\n","acl":null,"config":["search_path=\"\""],"definer":true}]'::jsonb) as x(identity text,before text,after text,body text,acl text[],config text[],definer boolean) loop
  select p.*,pg_get_functiondef(p.oid) definition into b from pg_proc p where p.oid=to_regprocedure(t.identity);
  if not found or encode(extensions.digest(convert_to(b.prosrc,'UTF8'),'sha256'),'hex')<>t.before
    or b.proacl::text[] is distinct from t.acl or b.proconfig is distinct from t.config
    or b.prosecdef is distinct from t.definer or pg_get_userbyid(b.proowner)<>'postgres' then
    raise exception using errcode='55000',message='K2_EXPRESS_BODY_OR_METADATA_DRIFT:'||t.identity;
  end if;
  v_definition:=replace(b.definition,b.prosrc,t.body);execute v_definition;
  select * into a from pg_proc where oid=b.oid;
  if encode(extensions.digest(convert_to(a.prosrc,'UTF8'),'sha256'),'hex')<>t.after
    or (to_jsonb(a)-'prosrc'-'proacl') is distinct from (to_jsonb(b)-'prosrc'-'proacl'-'definition')
    or a.proacl is distinct from b.proacl then
    raise exception using errcode='55000',message='K2_EXPRESS_METADATA_CHANGED';
  end if;
 end loop;
end $correction$;
