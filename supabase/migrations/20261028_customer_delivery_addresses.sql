-- Prepared only. One address authority inside the existing private settings row.
-- Does not change Auth identities, existing orders, delivery tariffs or the signer.
begin;

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

commit;
