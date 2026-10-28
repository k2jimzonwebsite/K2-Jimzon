-- MAP-019 owner-reviewable profile/address packet. Exact project: pixplcjqivlfflickobf.
-- No approval is implied by this file. Required preflight/readiness/backup precede application.
begin;
set local lock_timeout='8s';
set local statement_timeout='60s';
lock table k2_private.customer_account_settings in access exclusive mode;
do $guard$
declare p oid;
begin
 p:=to_regprocedure('k2_private.project_express_quote_v1(uuid)');
 if p is null or encode(extensions.digest(convert_to(pg_get_functiondef(p),'UTF8'),'sha256'),'hex')<>'54a17b6de33a7189e709a4162dfbc68dbc5178c55d7014c5cd164887980eb275'
  or pg_get_userbyid((select proowner from pg_proc where oid=p))<>'postgres'
  or (select proconfig from pg_proc where oid=p) is distinct from array['search_path=""']::text[]
  or has_function_privilege('anon',p,'EXECUTE')
  or has_function_privilege('authenticated',p,'EXECUTE')<>false
  or has_function_privilege('service_role',p,'EXECUTE')
  or exists(select 1 from aclexplode(coalesce((select proacl from pg_proc where oid=p),acldefault('f',(select proowner from pg_proc where oid=p)))) a where a.grantee=0 and a.privilege_type='EXECUTE')
 then raise exception 'K2_PROFILE_DEPENDENCY_DRIFT: %','k2_private.project_express_quote_v1(uuid)'; end if;
 p:=to_regprocedure('k2_private.verify_guest_bff_request(text,bigint,uuid,text,text,text)');
 if p is null or encode(extensions.digest(convert_to(pg_get_functiondef(p),'UTF8'),'sha256'),'hex')<>'e929dcb1bea8c12328211d5508435cb5d5da842414856a5afb3a52d5eb8e9852'
  or pg_get_userbyid((select proowner from pg_proc where oid=p))<>'postgres'
  or (select proconfig from pg_proc where oid=p) is distinct from array['search_path=""']::text[]
  or has_function_privilege('anon',p,'EXECUTE')
  or has_function_privilege('authenticated',p,'EXECUTE')<>false
  or has_function_privilege('service_role',p,'EXECUTE')
  or exists(select 1 from aclexplode(coalesce((select proacl from pg_proc where oid=p),acldefault('f',(select proowner from pg_proc where oid=p)))) a where a.grantee=0 and a.privilege_type='EXECUTE')
 then raise exception 'K2_PROFILE_DEPENDENCY_DRIFT: %','k2_private.verify_guest_bff_request(text,bigint,uuid,text,text,text)'; end if;
 p:=to_regprocedure('public.read_customer_account_settings_v1(bigint,uuid,text,text,text)');
 if p is null or encode(extensions.digest(convert_to(pg_get_functiondef(p),'UTF8'),'sha256'),'hex')<>'8dfc55a1fdcf816c9c4cbb70c9f3df5371eca4d7e2bae6d325edc34883969e09'
  or pg_get_userbyid((select proowner from pg_proc where oid=p))<>'postgres'
  or (select proconfig from pg_proc where oid=p) is distinct from array['search_path=""']::text[]
  or has_function_privilege('anon',p,'EXECUTE')
  or has_function_privilege('authenticated',p,'EXECUTE')<>true
  or has_function_privilege('service_role',p,'EXECUTE')
  or exists(select 1 from aclexplode(coalesce((select proacl from pg_proc where oid=p),acldefault('f',(select proowner from pg_proc where oid=p)))) a where a.grantee=0 and a.privilege_type='EXECUTE')
 then raise exception 'K2_PROFILE_DEPENDENCY_DRIFT: %','public.read_customer_account_settings_v1(bigint,uuid,text,text,text)'; end if;
 p:=to_regprocedure('public.save_customer_account_settings_v1(bigint,uuid,text,text,text)');
 if p is null or encode(extensions.digest(convert_to(pg_get_functiondef(p),'UTF8'),'sha256'),'hex')<>'c519af9e447978831672aad13b9a5148a79b6589d952a0e1794c561b98cd512c'
  or pg_get_userbyid((select proowner from pg_proc where oid=p))<>'postgres'
  or (select proconfig from pg_proc where oid=p) is distinct from array['search_path=""']::text[]
  or has_function_privilege('anon',p,'EXECUTE')
  or has_function_privilege('authenticated',p,'EXECUTE')<>true
  or has_function_privilege('service_role',p,'EXECUTE')
  or exists(select 1 from aclexplode(coalesce((select proacl from pg_proc where oid=p),acldefault('f',(select proowner from pg_proc where oid=p)))) a where a.grantee=0 and a.privilege_type='EXECUTE')
 then raise exception 'K2_PROFILE_DEPENDENCY_DRIFT: %','public.save_customer_account_settings_v1(bigint,uuid,text,text,text)'; end if;
 if to_regprocedure('public.read_customer_portfolio_v1(bigint,uuid,text,text,text)') is not null
  or to_regprocedure('public.save_customer_account_address_book_v1(bigint,uuid,text,text,text)') is not null
  or to_regprocedure('k2_private.customer_account_settings_payload_v1(uuid)') is not null
  or to_regprocedure('public.customer_privacy_command_v1(bigint,uuid,text,text,text)') is not null
  or to_regclass('public.order_requests_customer_portfolio_idx') is not null
  or exists(select 1 from information_schema.columns where table_schema='k2_private' and table_name='customer_account_settings' and column_name in ('delivery_addresses','default_delivery_address_id','address_book_initialized','address_revision','address_last_operation_id','address_last_payload_hash'))
  or exists(select 1 from supabase_migrations.schema_migrations where version='20261028140000')
 then raise exception 'K2_PROFILE_RELEASE_ALREADY_PRESENT_OR_PRIVACY_ACTIVE'; end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='k2_private' and c.relname in ('customer_account_settings','customer_account_notifications') and (has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE'))) then raise exception 'K2_PROFILE_PRIVATE_TABLE_GRANTS_DRIFT'; end if;
end $guard$;
-- MAP-019 / IDEA-20261027-02. Prepared only. Requires current identity,
-- settings, structured payments, receipts and delivery snapshots. No apply authority.
do $$ begin
 if to_regclass('k2_private.order_delivery_snapshots') is null
   or to_regclass('k2_private.order_payment_receipts') is null
   or to_regprocedure('k2_private.project_express_quote_v1(uuid)') is null then
   raise exception 'K2_PORTFOLIO_DEPENDENCIES_REQUIRED';
 end if;
end $$;
create index if not exists order_requests_customer_portfolio_idx
 on public.order_requests(customer_id,created_at desc,public_reference desc);

create or replace function public.read_customer_portfolio_v1(
 p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 p jsonb; a public.customer_accounts; budget record; rows jsonb; summary jsonb;
 proof k2_private.order_payment_receipts; before_time timestamptz; before_ref text;
begin
 if auth.uid() is null then return jsonb_build_object('ok',false,'error_code','ACCOUNT_AUTH_REQUIRED'); end if;
 if not k2_private.verify_guest_bff_request('account_read',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature) then
   return jsonb_build_object('ok',false,'error_code','REQUEST_REPLAYED'); end if;
 begin p:=p_payload_text::jsonb;
 exception when data_exception then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end;
 if jsonb_typeof(p)<>'object' or coalesce(p->>'operation','') not in ('list','proof') then
   return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
 select * into a from public.customer_accounts where user_id=auth.uid() and status='active';
 if not found then return jsonb_build_object('ok',false,'error_code','ACCOUNT_NOT_LINKED'); end if;
 select * into budget from k2_private.consume_guest_rate('account_portfolio','actor',
   extensions.digest(convert_to(auth.uid()::text,'UTF8'),'sha256'),300,60);
 if not budget.allowed then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',budget.retry_after_seconds); end if;
 if p->>'operation'='proof' then
   if (select count(*) from jsonb_object_keys(p))<>3 or not(p ?& array['operation','orderReference','proofId']) then
     return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
   select r.* into proof from k2_private.order_payment_receipts r
     join public.order_requests o on o.id=r.order_id
     where o.customer_id=a.customer_id and o.public_reference=p->>'orderReference' and r.id::text=p->>'proofId';
   if not found then return jsonb_build_object('ok',false,'error_code','CONVERSATION_NOT_AVAILABLE'); end if;
   if octet_length(proof.contents)>3145728 or proof.media_type not in ('image/png','image/jpeg','application/pdf') then
     return jsonb_build_object('ok',false,'error_code','REQUEST_REJECTED'); end if;
   return jsonb_build_object('ok',true,'proof',jsonb_build_object('id',proof.id,'mediaType',proof.media_type,
     'base64',encode(proof.contents,'base64')));
 end if;
 if (select count(*) from jsonb_object_keys(p))<>2 or not(p ?& array['operation','cursor']) then
   return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
 if p->'cursor'<>'null'::jsonb then
   if jsonb_typeof(p->'cursor')<>'object' or (select count(*) from jsonb_object_keys(p->'cursor'))<>2
     or not(p->'cursor' ?& array['createdAt','reference']) then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
   begin before_time:=(p->'cursor'->>'createdAt')::timestamptz; before_ref:=p->'cursor'->>'reference';
   exception when data_exception then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end;
   if before_time is null or before_ref is null or before_ref !~ '^WEB-[A-Z0-9-]{1,64}$' then
     return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
 end if;
 -- Collections come from staff-recorded structured payment evidence, never from
 -- an uploaded image or an order's quoted charge. Unknown historical evidence stays unknown.
 with owned as (
   select o.*,case when o.payment_evidence->>'currency'='PHP'
     and coalesce(o.payment_evidence->>'amount','') ~ '^[0-9]{1,12}(\.[0-9]{1,2})?$'
     then (o.payment_evidence->>'amount')::numeric else null end as known_amount
   from public.order_requests o where o.customer_id=a.customer_id
 ) select jsonb_build_object('orderCount',count(*),
   'fulfilledItems',coalesce((select sum(i.quantity) from public.order_request_items i join owned o on o.id=i.order_request_id where o.status='fulfilled'),0),
   'verifiedAmount',coalesce(sum(known_amount) filter(where payment_status='verified'),0),
   'refundedAmount',coalesce(sum(known_amount) filter(where payment_status='refunded'),0),
   'unknownPaymentCount',count(*) filter(where payment_status in ('verified','refunded') and known_amount is null),
   'currency','PHP') into summary from owned;
 select coalesce(jsonb_agg(jsonb_build_object(
   'public_reference',o.public_reference,'created_at',o.created_at,'status',o.status,'payment_status',o.payment_status,
   'shipping_quote_status',o.shipping_quote_status,
   'express_quote',k2_private.project_express_quote_v1(o.id),
   'delivery_review_required',(o.channel_source='website' and not exists(select 1 from k2_private.order_delivery_snapshots s where s.order_id=o.id)),
   'total_amount',case when (o.channel_source<>'website' or exists(select 1 from k2_private.order_delivery_snapshots s where s.order_id=o.id))
     and o.shipping_quote_status in ('customer_confirmed','platform_charged','waived') then o.total_amount else null end,
   'payment',jsonb_build_object('amount',case when o.payment_evidence->>'currency'='PHP'
      and coalesce(o.payment_evidence->>'amount','') ~ '^[0-9]{1,12}(\.[0-9]{1,2})?$' then (o.payment_evidence->>'amount')::numeric else null end,
      'currency',o.payment_evidence->>'currency','method',o.payment_evidence->>'method',
      'reference',o.payment_evidence->>'payment_reference','recordedAt',o.payment_evidence->>'submitted_at'),
   'items',coalesce((select jsonb_agg(jsonb_build_object('sku',i.sku,'name',i.product_name,'quantity',i.quantity,'unitPrice',i.unit_price,'lineTotal',i.line_total) order by i.id)
     from (select * from public.order_request_items where order_request_id=o.id order by id limit 200)i),'[]'::jsonb),
   'itemsTruncated',(select count(*)>200 from public.order_request_items where order_request_id=o.id),
   'proofs',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'mediaType',r.media_type,'submittedAt',r.submitted_at) order by r.submitted_at desc)
     from (select * from k2_private.order_payment_receipts where order_id=o.id order by submitted_at desc limit 20)r),'[]'::jsonb)
 ) order by o.created_at desc,o.public_reference desc),'[]'::jsonb) into rows
 from (select * from public.order_requests where customer_id=a.customer_id
   and (before_time is null or (created_at,public_reference)<(before_time,before_ref))
   order by created_at desc,public_reference desc limit 21)o;
 return jsonb_build_object('ok',true,'summary',summary,'orders',case when jsonb_array_length(rows)>20 then rows-20 else rows end,
   'nextCursor',case when jsonb_array_length(rows)>20 then jsonb_build_object('createdAt',rows->19->>'created_at','reference',rows->19->>'public_reference') else null end);
end $$;
revoke all on function public.read_customer_portfolio_v1(bigint,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.read_customer_portfolio_v1(bigint,uuid,text,text,text) to authenticated;
notify pgrst,'reload schema';

-- Prepared only. One address authority inside the existing private settings row.
-- Does not change Auth identities, existing orders, delivery tariffs or the signer.

alter table k2_private.customer_account_settings
  add column delivery_addresses jsonb not null default '[]'::jsonb,
  add column default_delivery_address_id uuid,
  add column address_book_initialized boolean not null default false,
  add column address_revision bigint not null default 0,
  add column address_last_operation_id uuid,
  add column address_last_payload_hash text,
  add constraint customer_account_address_book_shape check (
    jsonb_typeof(delivery_addresses)='array' and jsonb_array_length(delivery_addresses)<=10
    and address_revision between 0 and 9007199254740991
    and ((jsonb_array_length(delivery_addresses)=0 and default_delivery_address_id is null)
      or (jsonb_array_length(delivery_addresses)>0 and default_delivery_address_id is not null))
  );

create function k2_private.customer_account_settings_payload_v1(actor uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('displayName',coalesce(s.display_name,''),
    'deliveryAddress',case when s.address_book_initialized then coalesce((select a->>'formattedAddress'
      from jsonb_array_elements(s.delivery_addresses) a where a->>'id'=s.default_delivery_address_id::text),'')
      else coalesce(s.delivery_address,'') end,
    'notifyInApp',coalesce(s.notify_in_app,true),
    'addressBook',jsonb_build_object('initialized',coalesce(s.address_book_initialized,false),
      'revision',coalesce(s.address_revision,0),'addresses',coalesce(s.delivery_addresses,'[]'::jsonb),
      'defaultAddressId',s.default_delivery_address_id,'lastOperationId',s.address_last_operation_id,
      'lastOperationRevision',case when s.address_revision>0 then s.address_revision-1 else null end))
  from (values(actor)) v(id) left join k2_private.customer_account_settings s on s.user_id=v.id;
$$;
revoke all on function k2_private.customer_account_settings_payload_v1(uuid) from public,anon,authenticated,service_role;

create or replace function public.read_customer_account_settings_v1(
  p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare budget record; notices jsonb;
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error_code','ACCOUNT_AUTH_REQUIRED'); end if;
  if not k2_private.verify_guest_bff_request('account_settings_read',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature)
    or p_payload_text<>'{}' then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
  select * into budget from k2_private.consume_guest_rate('account_settings_read','actor',extensions.digest(convert_to(auth.uid()::text,'UTF8'),'sha256'),300,60);
  if not budget.allowed then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',budget.retry_after_seconds); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'event_kind',n.event_kind,'public_reference',n.public_reference,
    'created_at',n.created_at,'read_at',n.read_at) order by n.created_at desc),'[]'::jsonb) into notices
    from (select * from k2_private.customer_account_notifications where user_id=auth.uid() order by created_at desc limit 30) n;
  return jsonb_build_object('ok',true,'settings',k2_private.customer_account_settings_payload_v1(auth.uid()),'notifications',notices);
end $$;

create or replace function public.save_customer_account_settings_v1(
  p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; profile_name text; address text; notify boolean; budget record;
  saved k2_private.customer_account_settings; projection text;
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error_code','ACCOUNT_AUTH_REQUIRED'); end if;
  perform pg_advisory_xact_lock(hashtextextended('account-claim-user:'||auth.uid()::text,0));
  if not k2_private.verify_guest_bff_request('account_settings_write',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature)
    then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
  p:=p_payload_text::jsonb;
  if jsonb_typeof(p) is distinct from 'object' or not(p ?& array['displayName','deliveryAddress','notifyInApp'])
    or p-array['displayName','deliveryAddress','notifyInApp']<>'{}'::jsonb
    or jsonb_typeof(p->'displayName') is distinct from 'string'
    or jsonb_typeof(p->'deliveryAddress') is distinct from 'string'
    or jsonb_typeof(p->'notifyInApp') is distinct from 'boolean' then
    return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
  profile_name:=trim(p->>'displayName'); address:=trim(p->>'deliveryAddress'); notify:=(p->>'notifyInApp')::boolean;
  if length(profile_name) not between 1 and 140 or length(address)>500 then
    return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
  select * into budget from k2_private.consume_guest_rate('account_settings_write','actor',extensions.digest(convert_to(auth.uid()::text,'UTF8'),'sha256'),3600,30);
  if not budget.allowed then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',budget.retry_after_seconds); end if;
  select * into saved from k2_private.customer_account_settings where user_id=auth.uid() for update;
  if found and saved.address_book_initialized then
    projection:=k2_private.customer_account_settings_payload_v1(auth.uid())->>'deliveryAddress';
    if address is distinct from projection then return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_LEGACY_CONFLICT'); end if;
  end if;
  insert into k2_private.customer_account_settings(user_id,display_name,delivery_address,notify_in_app)
    values(auth.uid(),profile_name,address,notify)
    on conflict(user_id) do update set display_name=excluded.display_name,delivery_address=excluded.delivery_address,
      notify_in_app=excluded.notify_in_app,updated_at=now();
  return jsonb_build_object('ok',true,'settings',k2_private.customer_account_settings_payload_v1(auth.uid()));
end $$;

create function public.save_customer_account_address_book_v1(
  p_timestamp bigint,p_nonce uuid,p_payload_text text,p_ip_hash text,p_signature text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb; item jsonb; dest jsonb; part jsonb; location_code text; parent text; names text[];
  location k2_private.delivery_psgc_locations; clean jsonb:='[]'::jsonb; ids uuid[]:='{}'; id uuid; default_id uuid;
  phone text; street text; postal text; landmark text; formatted text; projection text:='';
  profile_name text; expected bigint; operation uuid; payload_hash text; budget record; saved k2_private.customer_account_settings;
begin
  if auth.uid() is null then return jsonb_build_object('ok',false,'error_code','ACCOUNT_AUTH_REQUIRED'); end if;
  perform pg_advisory_xact_lock(hashtextextended('account-claim-user:'||auth.uid()::text,0));
  -- Preserve the installed closure-aware verifier. Do not call its bypass alias.
  if not k2_private.verify_guest_bff_request('account_settings_write',p_timestamp,p_nonce,p_payload_text,p_ip_hash,p_signature)
    then return jsonb_build_object('ok',false,'error_code','REQUEST_INVALID'); end if;
  p:=p_payload_text::jsonb;
  if jsonb_typeof(p) is distinct from 'object'
    or not(p ?& array['operation','operationId','expectedRevision','displayName','addresses','defaultAddressId'])
    or p-array['operation','operationId','expectedRevision','displayName','addresses','defaultAddressId']<>'{}'::jsonb
    or p->>'operation' is distinct from 'addresses'
    or jsonb_typeof(p->'operationId') is distinct from 'string'
    or coalesce(p->>'operationId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or jsonb_typeof(p->'displayName') is distinct from 'string'
    or length(trim(p->>'displayName')) not between 1 and 140
    or jsonb_typeof(p->'expectedRevision') is distinct from 'number'
    or (p->>'expectedRevision')::numeric<0 or (p->>'expectedRevision')::numeric>=9007199254740991
    or (p->>'expectedRevision')::numeric<>trunc((p->>'expectedRevision')::numeric)
    or jsonb_typeof(p->'addresses') is distinct from 'array' then
    return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
  if jsonb_array_length(p->'addresses')>10 then return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
  if p->'defaultAddressId'='null'::jsonb then default_id:=null;
  elsif jsonb_typeof(p->'defaultAddressId')='string'
    and p->>'defaultAddressId'~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    default_id:=(p->>'defaultAddressId')::uuid;
  else return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
  expected:=(p->>'expectedRevision')::bigint; operation:=(p->>'operationId')::uuid; profile_name:=trim(p->>'displayName');
  for item in select x from jsonb_array_elements(p->'addresses') x loop
    if jsonb_typeof(item) is distinct from 'object'
      or not(item ?& array['id','label','recipientName','phone','street','postalCode','landmark','destination'])
      or item-array['id','label','recipientName','phone','street','postalCode','landmark','destination']<>'{}'::jsonb
      or exists(select 1 from unnest(array['id','label','recipientName','phone','street','postalCode','landmark']) k where jsonb_typeof(item->k) is distinct from 'string')
      or coalesce(item->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or length(trim(item->>'label')) not between 1 and 40 or length(trim(item->>'recipientName')) not between 1 and 140
      or length(trim(item->>'street')) not between 1 and 240 or length(trim(item->>'landmark'))>120
      or length(item->>'phone')>40 then return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
    id:=(item->>'id')::uuid;
    if id=any(ids) then return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
    ids:=array_append(ids,id);
    phone:=regexp_replace(trim(item->>'phone'),'[[:space:]()-]','','g');
    if phone~'^09[0-9]{9}$' then phone:='+63'||substr(phone,2);
    elsif phone~'^639[0-9]{9}$' then phone:='+'||phone; end if;
    postal:=trim(item->>'postalCode'); street:=trim(item->>'street'); landmark:=trim(item->>'landmark');
    if phone !~ '^\+[1-9][0-9]{7,14}$' or (postal<>'' and postal !~ '^[0-9]{4}$') then
      return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
    dest:=item->'destination'; parent:=null; names:='{}';
    if jsonb_typeof(dest) is distinct from 'object' or not(dest ?& array['sourceVersion','path'])
      or dest-array['sourceVersion','path']<>'{}'::jsonb or dest->>'sourceVersion' is distinct from 'psgc-2026-06-30'
      or jsonb_typeof(dest->'path') is distinct from 'array' then
      return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
    if jsonb_array_length(dest->'path') not between 3 and 5 then return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
    for part in select x from jsonb_array_elements(dest->'path') x loop
      if jsonb_typeof(part) is distinct from 'string' or part#>>'{}' !~ '^[0-9]{10}$' then
        return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
      location_code:=part#>>'{}';
      select * into location from k2_private.delivery_psgc_locations l where l.code=location_code;
      if not found or location.parent_code is distinct from parent or location.source_version<>'psgc-2026-06-30' then
        return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
      parent:=location_code; names:=array_prepend(location.name,names);
    end loop;
    if location.level<>'Bgy' then return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
    formatted:=concat_ws(', ',street,array_to_string(names,', '),nullif(postal,''),case when landmark<>'' then 'Landmark: '||landmark end);
    if length(formatted)>500 then return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
    clean:=clean||jsonb_build_array(jsonb_build_object('id',id,'label',trim(item->>'label'),'recipientName',trim(item->>'recipientName'),
      'phone',phone,'street',street,'postalCode',postal,'landmark',landmark,'destination',dest,'formattedAddress',formatted));
    if id=default_id then projection:=formatted; end if;
  end loop;
  if (jsonb_array_length(clean)=0 and default_id is not null)
    or (jsonb_array_length(clean)>0 and (default_id is null or not(default_id=any(ids)))) then
    return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
  payload_hash:=encode(extensions.digest(convert_to(p::text,'UTF8'),'sha256'),'hex');
  select * into budget from k2_private.consume_guest_rate('account_settings_write','actor',extensions.digest(convert_to(auth.uid()::text,'UTF8'),'sha256'),3600,30);
  if not budget.allowed then return jsonb_build_object('ok',false,'error_code','RATE_LIMITED','retry_after_seconds',budget.retry_after_seconds); end if;
  select * into saved from k2_private.customer_account_settings where user_id=auth.uid() for update;
  if found then
    if saved.address_last_operation_id=operation and expected=saved.address_revision-1 then
      if saved.address_last_payload_hash is distinct from payload_hash then
        return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_OPERATION_CONFLICT'); end if;
      return jsonb_build_object('ok',true,'settings',k2_private.customer_account_settings_payload_v1(auth.uid()));
    end if;
    if saved.address_revision<>expected then return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_CONFLICT'); end if;
    update k2_private.customer_account_settings set delivery_addresses=clean,default_delivery_address_id=default_id,
      delivery_address=projection,address_book_initialized=true,address_revision=expected+1,
      address_last_operation_id=operation,address_last_payload_hash=payload_hash,updated_at=now() where user_id=auth.uid();
  else
    if expected<>0 then return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_CONFLICT'); end if;
    if jsonb_array_length(clean)=0 then return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID'); end if;
    insert into k2_private.customer_account_settings(user_id,display_name,delivery_address,delivery_addresses,default_delivery_address_id,
      address_book_initialized,address_revision,address_last_operation_id,address_last_payload_hash)
      values(auth.uid(),profile_name,projection,clean,default_id,true,1,operation,payload_hash)
      on conflict(user_id) do nothing returning * into saved;
    if not found then return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_CONFLICT'); end if;
  end if;
  return jsonb_build_object('ok',true,'settings',k2_private.customer_account_settings_payload_v1(auth.uid()));
exception when data_exception then
  -- The exception block also covers mutations, so a caught failure cannot
  -- retain a partially inserted profile/address row.
  return jsonb_build_object('ok',false,'error_code','ADDRESS_BOOK_INVALID');
end $$;
revoke all on function public.save_customer_account_address_book_v1(bigint,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.save_customer_account_address_book_v1(bigint,uuid,text,text,text) to authenticated;


insert into supabase_migrations.schema_migrations(version,name,statements) values('20261028140000','map019_profile_addresses_only',array['supabase/migrations/20261027_customer_account_portfolio.sql sha256=705f776cac7aac988a85487dcd039a03022705012308bfb722f761c51b694cb9; supabase/migrations/20261028_customer_delivery_addresses.sql sha256=4b3adbd3916c97711fe5feda75f651a8d8dcab38b2ca59930e949697fc28dfd1']);
notify pgrst,'reload schema';
commit;
