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

-- @@EXACT_EXPRESS_CORRECTIONS@@
