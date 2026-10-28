-- Synthetic actors only; run inside the owned restored-schema transaction.
do $$ begin
  if to_regprocedure('public.save_customer_account_address_book_v1(bigint,uuid,text,text,text)') is null then
    raise exception 'ADDRESS_BOOK_NOT_IMPLEMENTED';
  end if;
end $$;

create function pg_temp.address_command(payload jsonb) returns jsonb language plpgsql as $$
declare ts bigint:=extract(epoch from clock_timestamp())::bigint; nonce uuid:=gen_random_uuid();
  ip text:=repeat('a',64); bytes text:=payload::text; secret bytea; signature text;
begin
  select request_secret into secret from k2_private.guest_bff_secrets where singleton;
  signature:=encode(extensions.hmac(convert_to('account_settings_write'||E'\n'||ts||E'\n'||nonce||E'\n'||
    encode(extensions.digest(convert_to(bytes,'UTF8'),'sha256'),'hex')||E'\n'||ip,'UTF8'),secret,'sha256'),'hex');
  return public.save_customer_account_address_book_v1(ts,nonce,bytes,ip,signature);
end $$;

do $$
declare actor uuid:=gen_random_uuid(); other_actor uuid:=gen_random_uuid(); address_id uuid:=gen_random_uuid();
  a jsonb; original jsonb; command jsonb; result jsonb; snapshot jsonb; path jsonb; legacy text;
begin
  insert into auth.users(id,email,email_confirmed_at,created_at,updated_at,aud,role,raw_app_meta_data,raw_user_meta_data)
    values(actor,'address-'||actor||'@example.invalid',clock_timestamp(),clock_timestamp(),clock_timestamp(),'authenticated','authenticated','{}','{}'),
    (other_actor,'address-'||other_actor||'@example.invalid',clock_timestamp(),clock_timestamp(),clock_timestamp(),'authenticated','authenticated','{}','{}');
  perform set_config('request.jwt.claim.sub',actor::text,true);
  with recursive parents as (
    select code,parent_code,0 as distance from k2_private.delivery_psgc_locations
      where code=(select code from k2_private.delivery_psgc_locations where level='Bgy' order by code limit 1)
    union all select p.code,p.parent_code,c.distance+1 from k2_private.delivery_psgc_locations p join parents c on c.parent_code=p.code
  ) select jsonb_agg(code order by distance desc) into path from parents;
  a:=jsonb_build_object('id',address_id,'label','Home','recipientName','Synthetic recipient','phone','+639178546329',
    'street','18 Synthetic Street','postalCode','1600','landmark','Blue gate',
    'destination',jsonb_build_object('sourceVersion','psgc-2026-06-30','path',path));
  command:=jsonb_build_object('operation','addresses','operationId',gen_random_uuid(),'expectedRevision',0,
    'displayName','Synthetic profile owner','addresses',jsonb_build_array(a),'defaultAddressId',address_id);
  original:=command;

  -- Refused first saves cannot leave a partial profile/settings row.
  result:=pg_temp.address_command(jsonb_set(command,'{expectedRevision}','9'));
  if result->>'error_code'<>'ADDRESS_BOOK_CONFLICT' or exists(select 1 from k2_private.customer_account_settings where user_id=actor) then
    raise exception 'ADDRESS_REJECTED_BOOTSTRAP_MUTATED';
  end if;
  result:=pg_temp.address_command(jsonb_set(command,'{addresses,0,destination,path}',jsonb_build_array('9999999999','8888888888','7777777777')));
  if result->>'error_code'<>'ADDRESS_BOOK_INVALID' or exists(select 1 from k2_private.customer_account_settings where user_id=actor) then
    raise exception 'ADDRESS_INVALID_PSGC_BOOTSTRAP_MUTATED';
  end if;
  result:=pg_temp.address_command(command||jsonb_build_object('userId',other_actor));
  if result->>'error_code'<>'ADDRESS_BOOK_INVALID' or exists(select 1 from k2_private.customer_account_settings where user_id=actor) then
    raise exception 'ADDRESS_SELECTOR_BOOTSTRAP_MUTATED';
  end if;

  result:=pg_temp.address_command(command);
  if result->>'ok'<>'true' or result#>>'{settings,addressBook,revision}'<>'1'
    or result#>>'{settings,displayName}'<>'Synthetic profile owner'
    or result#>>'{settings,addressBook,addresses,0,recipientName}'<>'Synthetic recipient'
    or coalesce(result#>>'{settings,deliveryAddress}','')='' then raise exception 'ADDRESS_FIRST_SAVE_FAILED: %',result->>'error_code'; end if;
  legacy:=result#>>'{settings,deliveryAddress}';
  select to_jsonb(s) into snapshot from k2_private.customer_account_settings s where user_id=actor;
  result:=pg_temp.address_command(command);
  if result->>'ok'<>'true' or snapshot is distinct from (select to_jsonb(s) from k2_private.customer_account_settings s where user_id=actor) then
    raise exception 'ADDRESS_EXACT_RETRY_MUTATED';
  end if;
  result:=pg_temp.address_command(jsonb_set(command,'{addresses,0,label}','"Changed"'));
  if result->>'error_code'<>'ADDRESS_BOOK_OPERATION_CONFLICT'
    or snapshot is distinct from (select to_jsonb(s) from k2_private.customer_account_settings s where user_id=actor) then
    raise exception 'ADDRESS_CHANGED_TUPLE_ACCEPTED';
  end if;
  result:=pg_temp.address_command(jsonb_set(command,'{operationId}',to_jsonb(gen_random_uuid())));
  if result->>'error_code'<>'ADDRESS_BOOK_CONFLICT'
    or snapshot is distinct from (select to_jsonb(s) from k2_private.customer_account_settings s where user_id=actor) then
    raise exception 'ADDRESS_STALE_REVISION_MUTATED';
  end if;

  command:=jsonb_set(jsonb_set(command,'{operationId}',to_jsonb(gen_random_uuid())),'{expectedRevision}','1');
  result:=pg_temp.address_command(command);
  if result#>>'{settings,addressBook,revision}'<>'2' then raise exception 'ADDRESS_SECOND_REVISION_FAILED'; end if;
  select to_jsonb(s) into snapshot from k2_private.customer_account_settings s where user_id=actor;
  result:=pg_temp.address_command(original);
  if result->>'error_code'<>'ADDRESS_BOOK_CONFLICT'
    or snapshot is distinct from (select to_jsonb(s) from k2_private.customer_account_settings s where user_id=actor) then
    raise exception 'ADDRESS_HISTORICAL_RETRY_FALSE_SUCCESS';
  end if;
  -- A changed expected revision is a deliberate new intent, not the old retry.
  command:=jsonb_set(original,'{expectedRevision}','2');
  result:=pg_temp.address_command(command);
  if result#>>'{settings,addressBook,revision}'<>'3' then raise exception 'ADDRESS_REVISION_SCOPED_IDENTITY_FAILED'; end if;
  command:=jsonb_set(jsonb_set(jsonb_set(jsonb_set(command,'{expectedRevision}','3'),'{operationId}',to_jsonb(gen_random_uuid())),
    '{addresses}','[]'),'{defaultAddressId}','null');
  result:=pg_temp.address_command(command);
  if result#>>'{settings,addressBook,revision}'<>'4' or result#>>'{settings,deliveryAddress}'<>''
    or result#>>'{settings,addressBook,initialized}'<>'true'
    or jsonb_array_length(result#>'{settings,addressBook,addresses}')<>0 then raise exception 'ADDRESS_DELETE_LAST_RESURRECTED'; end if;
  select to_jsonb(s) into snapshot from k2_private.customer_account_settings s where user_id=actor;
  declare ts bigint:=extract(epoch from clock_timestamp())::bigint; nonce uuid:=gen_random_uuid(); ip text:=repeat('a',64);
    payload text:=jsonb_build_object('displayName','Old tab','deliveryAddress',legacy,'notifyInApp',true)::text; signature text;
  begin
    select encode(extensions.hmac(convert_to('account_settings_write'||E'\n'||ts||E'\n'||nonce||E'\n'||
      encode(extensions.digest(convert_to(payload,'UTF8'),'sha256'),'hex')||E'\n'||ip,'UTF8'),request_secret,'sha256'),'hex')
      into signature from k2_private.guest_bff_secrets where singleton;
    result:=public.save_customer_account_settings_v1(ts,nonce,payload,ip,signature);
  end;
  if result->>'error_code'<>'ADDRESS_BOOK_LEGACY_CONFLICT'
    or snapshot is distinct from (select to_jsonb(s) from k2_private.customer_account_settings s where user_id=actor) then
    raise exception 'ADDRESS_LATE_LEGACY_WRITE_RESURRECTED';
  end if;
  perform set_config('request.jwt.claim.sub',other_actor::text,true);
  if k2_private.customer_account_settings_payload_v1(other_actor)#>>'{addressBook,revision}'<>'0'
    or k2_private.customer_account_settings_payload_v1(other_actor)->>'displayName'<>'' then raise exception 'ADDRESS_OTHER_ACTOR_VISIBLE'; end if;
  if has_function_privilege('anon','public.save_customer_account_address_book_v1(bigint,uuid,text,text,text)','EXECUTE')
    or has_function_privilege('authenticated','k2_private.customer_account_settings_payload_v1(uuid)','EXECUTE') then
    raise exception 'ADDRESS_PRIVATE_GRANTS_WIDENED';
  end if;
end $$;
select set_config('k2_test.address_book_coverage','on',true);
create function pg_temp.populate_address_book(subject uuid) returns void language plpgsql as $$
declare path jsonb; address_id uuid:=gen_random_uuid(); result jsonb; profile_name text;
begin
  with recursive parents as (
    select code,parent_code,0 as distance from k2_private.delivery_psgc_locations
      where code=(select code from k2_private.delivery_psgc_locations where level='Bgy' order by code limit 1)
    union all select p.code,p.parent_code,c.distance+1 from k2_private.delivery_psgc_locations p join parents c on c.parent_code=p.code
  ) select jsonb_agg(code order by distance desc) into path from parents;
  perform set_config('request.jwt.claim.sub',subject::text,true);
  select display_name into strict profile_name from k2_private.customer_account_settings where user_id=subject;
  result:=pg_temp.address_command(jsonb_build_object('operation','addresses','operationId',gen_random_uuid(),
    'expectedRevision',0,'displayName',profile_name,'defaultAddressId',address_id,
    'addresses',jsonb_build_array(jsonb_build_object('id',address_id,'label','Closure coverage','recipientName','Synthetic recipient',
      'phone','+639178546329','street','18 Synthetic Street','postalCode','','landmark','Synthetic landmark',
      'destination',jsonb_build_object('sourceVersion','psgc-2026-06-30','path',path)))));
  if result->>'ok'<>'true' or result#>>'{settings,addressBook,revision}'<>'1' then raise exception 'ADDRESS_CLOSURE_SETUP_FAILED'; end if;
end $$;
select 'CUSTOMER_ADDRESS_BOOK_NATIVE_ASSERTIONS_PASSED';
