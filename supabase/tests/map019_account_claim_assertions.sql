\set ON_ERROR_STOP on
create schema if not exists k2_test;
create or replace function k2_test.signature(p_action text,p_timestamp bigint,p_nonce uuid,p_payload text,p_ip text)
returns text language sql stable as $$
  select encode(extensions.hmac(convert_to(
    p_action||E'\n'||p_timestamp||E'\n'||p_nonce||E'\n'||
    encode(extensions.digest(convert_to(p_payload,'UTF8'),'sha256'),'hex')||E'\n'||p_ip,
    'UTF8'),request_secret,'sha256'),'hex') from k2_private.guest_bff_secrets where singleton=true
$$;
create or replace function k2_test.admin_signature(
  p_action text,p_timestamp bigint,p_nonce uuid,p_actor uuid,p_key uuid,p_payload text
) returns text language sql stable as $$
  select encode(extensions.hmac(convert_to(
    p_action||E'\n'||p_timestamp||E'\n'||p_nonce||E'\n'||p_actor||E'\n'||p_key||E'\n'||
    encode(extensions.digest(convert_to(p_payload,'UTF8'),'sha256'),'hex'),'UTF8'),request_secret,'sha256'),'hex')
  from k2_private.admin_bff_secrets where singleton=true
$$;
do $$
declare
  v_user uuid := '10000000-0000-4000-8000-000000000001';
  v_customer uuid := '20000000-0000-4000-8000-000000000001';
  v_contact uuid := '30000000-0000-4000-8000-000000000001';
  v_other_customer uuid := '20000000-0000-4000-8000-000000000002';
  v_conversation uuid := '50000000-0000-4000-8000-000000000001';
  v_other_conversation uuid := '50000000-0000-4000-8000-000000000002';
  v_payload text := '{"contactKind":"email","idempotencyKey":"40000000-0000-4000-8000-000000000001"}';
  v_reply_payload text := '{"conversationReference":"CV-0123456789ABCDEF","idempotencyKey":"60000000-0000-4000-8000-000000000001","message":"Please confirm my delivery status."}';
  v_ip text := repeat('a',64); v_grant text := repeat('b',64);
  v_ts bigint; v_nonce uuid; v_result record; v_history record; v_reply record;
begin
  insert into auth.users values(v_user,'buyer@example.com',now(),null,null);
  insert into public.customers(id,display_name,created_source) values(v_customer,'Buyer','website_guest');
  insert into public.customer_contact_points(id,customer_id,contact_kind,contact_value,normalized_hash,source)
  select v_contact,v_customer,'email','buyer@example.com',
    extensions.hmac(convert_to('email:buyer@example.com','UTF8'),contact_secret,'sha256'),'website_guest'
  from k2_private.guest_bff_secrets where singleton=true;
  insert into public.guest_access_grants(customer_id,token_hash,expires_at)
  values(v_customer,decode(v_grant,'hex'),now()+interval '1 hour');
  perform set_config('request.jwt.claim.sub',v_user::text,true);
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  select * into v_result from public.claim_guest_customer_account_v1(
    v_ts,v_nonce,v_payload,v_ip,k2_test.signature('account_claim',v_ts,v_nonce,v_payload,v_ip),v_grant);
  if not v_result.ok or not v_result.claimed or not v_result.guest_access_revoked then raise exception 'CLAIM_DID_NOT_SUCCEED'; end if;
  if (select count(*) from public.customer_accounts where user_id=v_user and customer_id=v_customer and status='active')<>1
     or (select verification_status from public.customer_contact_points where id=v_contact)<>'verified'
     or (select status from public.guest_access_grants where customer_id=v_customer)<>'revoked'
     or (select count(*) from k2_private.guest_account_claim_events where customer_id=v_customer)<>1 then
    raise exception 'CLAIM_STATE_INVALID';
  end if;
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  select * into v_result from public.claim_guest_customer_account_v1(
    v_ts,v_nonce,v_payload,v_ip,k2_test.signature('account_claim',v_ts,v_nonce,v_payload,v_ip),v_grant);
  if not v_result.ok or (select count(*) from k2_private.guest_account_claim_events where customer_id=v_customer)<>1 then
    raise exception 'IDEMPOTENT_REPLAY_INVALID';
  end if;
  select * into v_result from public.claim_guest_customer_account_v1(
    v_ts,v_nonce,v_payload,v_ip,k2_test.signature('account_claim',v_ts,v_nonce,v_payload,v_ip),v_grant);
  if v_result.ok or v_result.error_code<>'REQUEST_REPLAYED' then raise exception 'NONCE_REPLAY_NOT_REJECTED: %',v_result.error_code; end if;
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  select * into v_result from public.claim_guest_customer_account_v1(
    v_ts,v_nonce,replace(v_payload,'email','phone'),v_ip,
    k2_test.signature('account_claim',v_ts,v_nonce,replace(v_payload,'email','phone'),v_ip),v_grant);
  if v_result.ok or v_result.error_code<>'IDEMPOTENCY_CONFLICT' then raise exception 'PAYLOAD_REUSE_NOT_REJECTED: %',v_result.error_code; end if;

  insert into public.customers(id,display_name,created_source) values(v_other_customer,'Other buyer','website_guest');
  insert into public.order_requests(public_reference,customer_id,status,payment_status,total_amount)
  values('WEB-ACCOUNT1',v_customer,'confirmed','not_requested',1234.50),
        ('WEB-OTHER001',v_other_customer,'submitted','not_requested',999);
  insert into public.pasabuy_requests(public_reference,customer_id,status,item_title,quantity)
  values('PB-ACCOUNT01',v_customer,'researching','Italian pantry item',2),
        ('PB-OTHER0001',v_other_customer,'quoted','Private other item',1);
  insert into public.conversations(id,customer_id,customer_name,platform,status,guest_reference)
  values(v_conversation,v_customer,'Buyer','Website','Open','CV-0123456789ABCDEF'),
        (v_other_conversation,v_other_customer,'Other buyer','Website','Open','CV-FEDCBA9876543210');
  insert into public.messages(conversation_id,sender_type,content,delivery_status,direction)
  values(v_conversation,'Customer','Where is my order?','received','inbound'),
        (v_conversation,'Admin','Customer-visible reply','sent','outbound'),
        (v_conversation,'Admin','Private staff note','internal_only','internal'),
        (v_other_conversation,'Customer','Other customer private text','received','inbound');

  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  select * into v_history from public.list_customer_account_history_v1(
    v_ts,v_nonce,'{}',v_ip,k2_test.signature('account_read',v_ts,v_nonce,'{}',v_ip));
  if not v_history.ok or jsonb_array_length(v_history.orders)<>1
     or jsonb_array_length(v_history.pasabuy_requests)<>1
     or jsonb_array_length(v_history.conversations)<>1
     or v_history.orders::text like '%WEB-OTHER001%'
     or v_history.pasabuy_requests::text like '%Private other item%'
     or v_history.conversations::text like '%Private staff note%'
     or v_history.conversations::text like '%Other customer private text%' then
    raise exception 'ACCOUNT_HISTORY_SCOPE_INVALID';
  end if;

  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  select * into v_reply from public.append_customer_account_message_v1(
    v_ts,v_nonce,v_reply_payload,v_ip,k2_test.signature('account_reply',v_ts,v_nonce,v_reply_payload,v_ip));
  if not v_reply.ok or (select count(*) from public.messages where conversation_id=v_conversation
    and provider_event_key like 'account:%')<>1 then raise exception 'ACCOUNT_REPLY_FAILED'; end if;
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  select * into v_reply from public.append_customer_account_message_v1(
    v_ts,v_nonce,v_reply_payload,v_ip,k2_test.signature('account_reply',v_ts,v_nonce,v_reply_payload,v_ip));
  if not v_reply.ok or (select count(*) from public.messages where conversation_id=v_conversation
    and provider_event_key like 'account:%')<>1 then raise exception 'ACCOUNT_REPLY_REPLAY_INVALID'; end if;
  v_reply_payload:=replace(v_reply_payload,'CV-0123456789ABCDEF','CV-FEDCBA9876543210');
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  select * into v_reply from public.append_customer_account_message_v1(
    v_ts,v_nonce,v_reply_payload,v_ip,k2_test.signature('account_reply',v_ts,v_nonce,v_reply_payload,v_ip));
  if v_reply.ok or v_reply.error_code<>'CONVERSATION_NOT_AVAILABLE' then raise exception 'CROSS_CUSTOMER_REPLY_NOT_REJECTED'; end if;

  perform set_config('request.jwt.claim.sub','',true);
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  select * into v_result from public.claim_guest_customer_account_v1(
    v_ts,v_nonce,v_payload,v_ip,k2_test.signature('account_claim',v_ts,v_nonce,v_payload,v_ip),v_grant);
  if v_result.ok or v_result.error_code<>'ACCOUNT_AUTH_REQUIRED' then raise exception 'UNAUTHENTICATED_CLAIM_NOT_REJECTED'; end if;
end $$;
do $$
declare
  v_payload text := '{"businessType":"cafe_restaurant","contactRole":"Owner","customerName":"Maria Buyer","deliveryArea":"Makati City","email":"wholesale@example.com","idempotencyKey":"70000000-0000-4000-8000-000000000001","notes":"No credit requested","organizationName":"Launch Test Cafe","phone":"09171234567","targetItems":"Coffee beans, 30 units","volumeBand":"starter"}';
  v_changed text; v_ip text:=repeat('d',64); v_ts bigint; v_nonce uuid; v_result record;
  v_actor uuid:='90000000-0000-4000-8000-000000000001'; v_key uuid; v_id uuid; v_command text; v_command_result jsonb;
  v_provider_session uuid:='91000000-0000-4000-8000-000000000001';
  v_admin_session uuid:='92000000-0000-4000-8000-000000000001'; v_created_ms bigint;
  v_media_hash text:=repeat('a',64); v_media_path text; v_media_result jsonb;
  v_assign_path text; v_assign_url text; v_assign_payload text; v_assign_result jsonb;
begin
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  select * into v_result from public.submit_wholesale_inquiry_v1(v_ts,v_nonce,v_payload,v_ip,k2_test.signature('wholesale_inquiry',v_ts,v_nonce,v_payload,v_ip),null);
  if not v_result.ok or v_result.public_reference !~ '^WI-[0-9A-F]{16}$' or v_result.conversation_reference !~ '^CV-[0-9A-F]{16}$' or v_result.status<>'submitted' then raise exception 'WHOLESALE_INQUIRY_FAILED'; end if;
  if (select count(*) from public.wholesale_inquiries)<>1 or (select count(*) from public.messages where provider_event_key like 'wholesale-inquiry:%')<>1 then raise exception 'WHOLESALE_STATE_INVALID'; end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='wholesale_inquiries' and column_name in ('price_list_id','credit_limit','pricing_approved','terms_approved')) then raise exception 'WHOLESALE_AUTHORITY_LEAKED_INTO_INQUIRY'; end if;
  v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  select * into v_result from public.submit_wholesale_inquiry_v1(v_ts,v_nonce,v_payload,v_ip,k2_test.signature('wholesale_inquiry',v_ts,v_nonce,v_payload,v_ip),null);
  if not v_result.ok or (select count(*) from public.wholesale_inquiries)<>1 then raise exception 'WHOLESALE_IDEMPOTENCY_FAILED'; end if;
  v_changed:=replace(v_payload,'30 units','40 units'); v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  select * into v_result from public.submit_wholesale_inquiry_v1(v_ts,v_nonce,v_changed,v_ip,k2_test.signature('wholesale_inquiry',v_ts,v_nonce,v_changed,v_ip),null);
  if v_result.ok or v_result.error_code<>'IDEMPOTENCY_CONFLICT' then raise exception 'WHOLESALE_CHANGED_PAYLOAD_NOT_REJECTED'; end if;
  v_changed:=replace(v_payload,'{"businessType"','{"pricingApproved":true,"businessType"'); v_ts:=extract(epoch from clock_timestamp())::bigint; v_nonce:=extensions.gen_random_uuid();
  select * into v_result from public.submit_wholesale_inquiry_v1(v_ts,v_nonce,v_changed,v_ip,k2_test.signature('wholesale_inquiry',v_ts,v_nonce,v_changed,v_ip),null);
  if v_result.ok or v_result.error_code<>'REQUEST_INVALID' then raise exception 'WHOLESALE_AUTHORITY_INPUT_NOT_REJECTED'; end if;
  begin
    perform public.list_admin_wholesale_inquiries_v1();
    raise exception 'ANON_WHOLESALE_READ_ALLOWED';
  exception when insufficient_privilege then null; end;
  insert into auth.users(id,email,email_confirmed_at) values(v_actor,'admin@example.com',now());
  insert into auth.sessions(id,user_id) values(v_provider_session,v_actor);
  perform set_config('request.jwt.claim.sub',v_actor::text,true);
  perform set_config('request.jwt.claims','{"aal":"aal1","is_staff":true}',true);
  begin
    perform public.list_admin_wholesale_inquiries_v1();
    raise exception 'AAL1_WHOLESALE_READ_ALLOWED';
  exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('aal','aal2','is_staff',true,'session_id',v_provider_session)::text,true);
  v_created_ms:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  v_command:=jsonb_build_object('createdAt',v_created_ms,'expiresAt',v_created_ms+28800000,'sessionId',v_admin_session)::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_session_command_v1(
    'admin_session_register',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('admin_session_register',v_ts,v_nonce,v_actor,v_key,v_command));
  if not coalesce((v_command_result->>'registered')::boolean,false) then raise exception 'ADMIN_SESSION_REGISTER_FAILED'; end if;
  v_command:=jsonb_build_object('sessionId',v_admin_session)::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_session_command_v1(
    'admin_session_validate',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('admin_session_validate',v_ts,v_nonce,v_actor,v_key,v_command));
  if not coalesce((v_command_result->>'active')::boolean,false) then raise exception 'ADMIN_PROVIDER_SESSION_VALIDATE_FAILED'; end if;
  v_key:=extensions.gen_random_uuid();
  v_media_path:=v_actor::text||'/product-media/'||v_key::text||'-'||substr(v_media_hash,1,16)||'.jpg';
  insert into storage.objects(bucket_id,name,metadata) values(
    'product-images',v_media_path,jsonb_build_object('mimetype','image/jpeg','size',2048)
  );
  v_command:=jsonb_build_object(
    'objectPath',v_media_path,'contentType','image/jpeg','size',2048,
    'width',640,'height',640,'sha256',v_media_hash
  )::text;
  v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_media_result:=public.execute_admin_product_media_command_v1(
    'product_media_upload',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('product_media_upload',v_ts,v_nonce,v_actor,v_key,v_command));
  if v_media_result->>'objectPath'<>v_media_path
     or (select count(*) from k2_private.admin_command_receipts where actor_id=v_actor and action='product_media_upload')<>1 then
    raise exception 'ADMIN_PRODUCT_MEDIA_REGISTRATION_FAILED';
  end if;
  v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_media_result:=public.execute_admin_product_media_command_v1(
    'product_media_upload',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('product_media_upload',v_ts,v_nonce,v_actor,v_key,v_command));
  if v_media_result->>'objectPath'<>v_media_path
     or (select count(*) from k2_private.admin_command_receipts where actor_id=v_actor and action='product_media_upload')<>1 then
    raise exception 'ADMIN_PRODUCT_MEDIA_REPLAY_FAILED';
  end if;
  begin
    v_changed:=replace(v_command,'"width": 640','"width": 641');
    v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
    perform public.execute_admin_product_media_command_v1(
      'product_media_upload',v_ts,v_nonce,v_key,v_changed,
      k2_test.admin_signature('product_media_upload',v_ts,v_nonce,v_actor,v_key,v_changed));
    raise exception 'ADMIN_PRODUCT_MEDIA_CHANGED_PAYLOAD_ALLOWED';
  exception when invalid_parameter_value then
    if sqlerrm not like '%K2_ADMIN_IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;
  insert into public.products(sku) values('K2-MEDIA-001');
  v_assign_path:=v_media_path;
  v_assign_url:='https://example.supabase.co/storage/v1/object/public/product-images/'||v_assign_path;
  v_assign_payload:=jsonb_build_object(
    'sku','K2-MEDIA-001',
    'primary',jsonb_build_object('url',v_assign_url,'objectPath',v_assign_path),
    'lifestyle','[]'::jsonb,'secondary','[]'::jsonb,
    'reason','Verified primary storefront photograph.'
  )::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid();
  v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_assign_result:=public.execute_admin_product_media_assignment_v1(
    'product_media_assign',v_ts,v_nonce,v_key,v_assign_payload,
    k2_test.admin_signature('product_media_assign',v_ts,v_nonce,v_actor,v_key,v_assign_payload));
  if v_assign_result->>'sku'<>'K2-MEDIA-001'
     or (select primary_image_url from public.products where sku='K2-MEDIA-001')<>v_assign_url
     or (select image_url from public.products where sku='K2-MEDIA-001')<>v_assign_url
     or (select count(*) from k2_private.product_media_events where sku='K2-MEDIA-001')<>1 then
    raise exception 'ADMIN_PRODUCT_MEDIA_ASSIGNMENT_FAILED';
  end if;
  v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_assign_result:=public.execute_admin_product_media_assignment_v1(
    'product_media_assign',v_ts,v_nonce,v_key,v_assign_payload,
    k2_test.admin_signature('product_media_assign',v_ts,v_nonce,v_actor,v_key,v_assign_payload));
  if (select count(*) from k2_private.product_media_events where sku='K2-MEDIA-001')<>1 then
    raise exception 'ADMIN_PRODUCT_MEDIA_ASSIGNMENT_REPLAY_FAILED';
  end if;
  v_assign_payload:=jsonb_build_object(
    'sku','K2-MEDIA-001','primary',null,'lifestyle','[]'::jsonb,'secondary','[]'::jsonb,
    'reason','Remove the draft primary photograph.'
  )::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid();
  v_ts:=extract(epoch from clock_timestamp())::bigint;
  perform public.execute_admin_product_media_assignment_v1(
    'product_media_assign',v_ts,v_nonce,v_key,v_assign_payload,
    k2_test.admin_signature('product_media_assign',v_ts,v_nonce,v_actor,v_key,v_assign_payload));
  if (select primary_image_url is not null from public.products where sku='K2-MEDIA-001')
     or (select count(*) from k2_private.product_media_events where sku='K2-MEDIA-001')<>2
     or (select cleanup_status from k2_private.product_media_events where request_id=v_key)<>'pending'
     or (select cleanup_paths from k2_private.product_media_events where request_id=v_key)<>array[v_assign_path] then
    raise exception 'ADMIN_PRODUCT_MEDIA_REMOVAL_FAILED';
  end if;
  delete from storage.objects where bucket_id='product-images' and name=v_assign_path;
  v_command:=jsonb_build_object(
    'assignmentRequestId',v_key,'objectPaths',jsonb_build_array(v_assign_path)
  )::text;
  v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.complete_admin_product_media_cleanup_v1(
    'product_media_cleanup_complete',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('product_media_cleanup_complete',v_ts,v_nonce,v_actor,v_key,v_command));
  if not coalesce((v_command_result->>'cleanupCompleted')::boolean,false)
     or (select cleanup_status from k2_private.product_media_events where request_id=v_key)<>'completed'
     or (select cleanup_completed_at from k2_private.product_media_events where request_id=v_key) is null then
    raise exception 'ADMIN_PRODUCT_MEDIA_CLEANUP_COMPLETION_FAILED';
  end if;
  insert into storage.objects(bucket_id,name,metadata,created_at) values(
    'product-images',v_assign_path,jsonb_build_object('mimetype','image/jpeg','size',2048),
    clock_timestamp()-interval '2 hours'
  );
  perform set_config('request.jwt.claims',jsonb_build_object(
    'aal','aal2','is_staff',true,'is_admin',true,'session_id',v_provider_session
  )::text,true);
  if jsonb_array_length(public.read_admin_product_media_orphans_v1(60)->'items')<>1 then
    raise exception 'ADMIN_PRODUCT_MEDIA_ORPHAN_REVIEW_FAILED';
  end if;
  v_command:=jsonb_build_object(
    'objectPaths',jsonb_build_array(v_assign_path),
    'reason','Remove an abandoned verified upload after the safety window.'
  )::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid();
  v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.prepare_admin_product_media_orphan_cleanup_v1(
    'product_media_orphan_cleanup',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('product_media_orphan_cleanup',v_ts,v_nonce,v_actor,v_key,v_command));
  if (v_command_result->'objectPaths'->>0)<>v_assign_path
     or (select cleanup_status from k2_private.product_media_orphan_events where request_id=v_key)<>'pending' then
    raise exception 'ADMIN_PRODUCT_MEDIA_ORPHAN_PREPARE_FAILED';
  end if;
  delete from storage.objects where bucket_id='product-images' and name=v_assign_path;
  v_command:=jsonb_build_object('objectPaths',jsonb_build_array(v_assign_path))::text;
  v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.complete_admin_product_media_orphan_cleanup_v1(
    'product_media_orphan_cleanup_complete',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('product_media_orphan_cleanup_complete',v_ts,v_nonce,v_actor,v_key,v_command));
  if not coalesce((v_command_result->>'cleanupCompleted')::boolean,false)
     or (select cleanup_status from k2_private.product_media_orphan_events where request_id=v_key)<>'completed' then
    raise exception 'ADMIN_PRODUCT_MEDIA_ORPHAN_COMPLETION_FAILED';
  end if;
  insert into public.globe_products(product_id,enabled,display_order) values('rio-mare',true,0);
  v_command:=jsonb_build_object(
    'name','Camille D.','channel','Shopee verified purchase','stars',5,
    'text','The batch date and packaging matched the verified marketplace order.',
    'item','Rio Mare tuna','productId','rio-mare','reviewDate',current_date,
    'sourceKind','verified_marketplace','sourceReference','SHOPEE-REVIEW-VERIFIED-001',
    'rightsBasis','marketplace_publication','reason','Capture attributable review evidence as a private draft.'
  )::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_globe_review_command_v1(
    'review_create',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('review_create',v_ts,v_nonce,v_actor,v_key,v_command));
  v_id:=(v_command_result#>>'{review,id}')::uuid;
  if v_command_result#>>'{review,status}'<>'draft'
     or (select count(*) from k2_private.globe_review_events where action='review_create')<>1 then
    raise exception 'ADMIN_REVIEW_DRAFT_CREATE_FAILED';
  end if;
  v_command:=jsonb_build_object('id',v_id,'version',1,'reason','Source and publication rights were independently reviewed.')::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_globe_review_command_v1(
    'review_publish',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('review_publish',v_ts,v_nonce,v_actor,v_key,v_command));
  if v_command_result#>>'{review,status}'<>'published' or (select published_at from public.reviews where id=v_id) is null then
    raise exception 'ADMIN_REVIEW_PUBLISH_FAILED';
  end if;
  v_command:=jsonb_build_object(
    'id',v_id,'version',2,'name','Camille D.','channel','Shopee verified purchase','stars',5,
    'text','The package and printed batch date matched the verified marketplace order.',
    'item','Rio Mare tuna','productId','rio-mare','reviewDate',current_date,
    'sourceKind','verified_marketplace','sourceReference','SHOPEE-REVIEW-VERIFIED-001',
    'rightsBasis','marketplace_publication','reason','Correct wording while preserving the attributable source.'
  )::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_globe_review_command_v1(
    'review_update',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('review_update',v_ts,v_nonce,v_actor,v_key,v_command));
  if v_command_result#>>'{review,status}'<>'draft' or (select published_at from public.reviews where id=v_id) is not null then
    raise exception 'ADMIN_PUBLISHED_REVIEW_CORRECTION_NOT_RETURNED_TO_DRAFT';
  end if;
  v_command:=jsonb_build_object('id',v_id,'version',3,'reason','Corrected copy and source evidence were reviewed again.')::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  perform public.execute_admin_globe_review_command_v1('review_publish',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('review_publish',v_ts,v_nonce,v_actor,v_key,v_command));
  v_command:=jsonb_build_object('id',v_id,'version',4,'reason','Withdraw the claim while source permission is reconfirmed.')::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_globe_review_command_v1('review_withdraw',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('review_withdraw',v_ts,v_nonce,v_actor,v_key,v_command));
  if v_command_result#>>'{review,status}'<>'withdrawn' or (select withdrawn_at from public.reviews where id=v_id) is null then
    raise exception 'ADMIN_REVIEW_WITHDRAW_FAILED';
  end if;
  v_command:=jsonb_build_object('productId','rio-mare','enabled',false,'hero',null,
    'displayOrder',2,'version',1,'reason','Temporarily remove the product from the review globe.')::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_globe_review_command_v1('globe_config_update',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('globe_config_update',v_ts,v_nonce,v_actor,v_key,v_command));
  if coalesce((v_command_result->>'enabled')::boolean,true) or (v_command_result->>'version')::integer<>2
     or jsonb_array_length(public.read_admin_globe_cms_v1()->'reviews')<>1 then
    raise exception 'ADMIN_GLOBE_CONFIG_UPDATE_FAILED';
  end if;
  update public.products set published=true,primary_image_url=v_assign_url,image_url=v_assign_url
  where sku='K2-MEDIA-001';
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid();
  v_ts:=extract(epoch from clock_timestamp())::bigint;
  begin
    perform public.execute_admin_product_media_assignment_v1(
      'product_media_assign',v_ts,v_nonce,v_key,v_assign_payload,
      k2_test.admin_signature('product_media_assign',v_ts,v_nonce,v_actor,v_key,v_assign_payload));
    raise exception 'ADMIN_PUBLISHED_PRIMARY_REMOVAL_ALLOWED';
  exception when check_violation then
    if sqlerrm not like '%K2_ADMIN_MEDIA_PRIMARY_REQUIRED%' then raise; end if;
  end;
  if jsonb_array_length(public.list_admin_wholesale_inquiries_v1())<>1
     or public.list_admin_wholesale_inquiries_v1()::text like '%customer_id%'
     or public.list_admin_wholesale_inquiries_v1()::text like '%conversation_id%'
     or public.list_admin_wholesale_inquiries_v1()::text not like '%WI-%' then
    raise exception 'ADMIN_WHOLESALE_PROJECTION_INVALID';
  end if;
  v_command:='{"inquiryReference":"'||(select public_reference from public.wholesale_inquiries limit 1)||'","reason":"Qualified need is ready for staff review.","toStatus":"under_review"}';
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_wholesale_inquiry_command_v1(
    'wholesale_inquiry_review',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('wholesale_inquiry_review',v_ts,v_nonce,v_actor,v_key,v_command));
  if v_command_result->>'status'<>'under_review'
     or coalesce((v_command_result->>'commercialAuthorityAvailable')::boolean,true)
     or (select count(*) from k2_private.wholesale_inquiry_events where actor_id=v_actor)<>1 then
    raise exception 'WHOLESALE_REVIEW_COMMAND_INVALID';
  end if;
  v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_wholesale_inquiry_command_v1(
    'wholesale_inquiry_review',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('wholesale_inquiry_review',v_ts,v_nonce,v_actor,v_key,v_command));
  if v_command_result->>'status'<>'under_review'
     or (select count(*) from k2_private.wholesale_inquiry_events where actor_id=v_actor)<>1 then
    raise exception 'WHOLESALE_REVIEW_IDEMPOTENCY_INVALID';
  end if;
  begin
    v_changed:=replace(v_command,'staff review','commercial approval');
    v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
    perform public.execute_admin_wholesale_inquiry_command_v1(
      'wholesale_inquiry_review',v_ts,v_nonce,v_key,v_changed,
      k2_test.admin_signature('wholesale_inquiry_review',v_ts,v_nonce,v_actor,v_key,v_changed));
    raise exception 'WHOLESALE_REVIEW_PAYLOAD_REUSE_ALLOWED';
  exception when invalid_parameter_value then
    if sqlerrm not like '%K2_ADMIN_IDEMPOTENCY_CONFLICT%' then raise; end if;
  end;
  v_command:='{"inquiryReference":"'||(select public_reference from public.wholesale_inquiries limit 1)||'","reason":"Staff review completed without commercial approval.","toStatus":"closed"}';
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  perform public.execute_admin_wholesale_inquiry_command_v1(
    'wholesale_inquiry_review',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('wholesale_inquiry_review',v_ts,v_nonce,v_actor,v_key,v_command));
  v_command:=replace(replace(v_command,'Staff review completed without commercial approval.','New evidence requires staff review again.'),'"toStatus":"closed"','"toStatus":"under_review"');
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_wholesale_inquiry_command_v1(
    'wholesale_inquiry_review',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('wholesale_inquiry_review',v_ts,v_nonce,v_actor,v_key,v_command));
  if v_command_result->>'status'<>'under_review'
     or (select count(*) from k2_private.wholesale_inquiry_events where actor_id=v_actor)<>3 then
    raise exception 'WHOLESALE_REVIEW_RECOVERY_INVALID';
  end if;
  v_command:=jsonb_build_object('name','Verified Italia Supplier','contactEmail','supply@example.test',
    'leadTimeDays',14,'reason','Create from the verified purchasing contact record.')::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_supplier_command_v1(
    'supplier_create',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('supplier_create',v_ts,v_nonce,v_actor,v_key,v_command));
  if v_command_result#>>'{supplier,name}'<>'Verified Italia Supplier'
     or jsonb_array_length(public.read_admin_procurement_v1()->'suppliers')<>1
     or coalesce((public.read_admin_procurement_v1()->>'purchaseOrderCreationAvailable')::boolean,true)
     or (select count(*) from k2_private.supplier_events where actor_id=v_actor)<>1 then
    raise exception 'ADMIN_SUPPLIER_CREATE_FAILED';
  end if;
  v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_supplier_command_v1(
    'supplier_create',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('supplier_create',v_ts,v_nonce,v_actor,v_key,v_command));
  if jsonb_array_length(public.read_admin_procurement_v1()->'suppliers')<>1
     or (select count(*) from k2_private.supplier_events where actor_id=v_actor)<>1 then
    raise exception 'ADMIN_SUPPLIER_IDEMPOTENCY_FAILED';
  end if;
  delete from auth.sessions where id=v_provider_session;
  v_command:=jsonb_build_object('sessionId',v_admin_session)::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_command_result:=public.execute_admin_session_command_v1(
    'admin_session_validate',v_ts,v_nonce,v_key,v_command,
    k2_test.admin_signature('admin_session_validate',v_ts,v_nonce,v_actor,v_key,v_command));
  if coalesce((v_command_result->>'active')::boolean,true)
     or (select revoked_reason from k2_private.admin_sessions where session_id=v_admin_session)<>'Provider session inactive'
     or not exists(select 1 from k2_private.admin_session_events where session_id=v_admin_session and reason_code='provider_session_inactive') then
    raise exception 'ADMIN_PROVIDER_SESSION_INVALIDATION_FAILED';
  end if;
  insert into k2_private.admin_request_rate_buckets(scope,subject,bucket_start,hit_count)
  values('actor',v_actor::text,date_trunc('minute',clock_timestamp()),360)
  on conflict(scope,subject,bucket_start) do update set hit_count=excluded.hit_count;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  begin
    perform k2_private.verify_admin_bff_request(
      'admin_session_validate',v_ts,v_nonce,v_key,v_command,
      k2_test.admin_signature('admin_session_validate',v_ts,v_nonce,v_actor,v_key,v_command));
    raise exception 'ADMIN_ACTOR_BUDGET_NOT_ENFORCED';
  exception when program_limit_exceeded then
    if sqlerrm not like '%K2_ADMIN_RATE_LIMITED%' then raise; end if;
  end;
  delete from k2_private.admin_request_rate_buckets
  where scope='actor' and subject=v_actor::text and bucket_start=date_trunc('minute',clock_timestamp());
  insert into k2_private.admin_request_rate_buckets(scope,subject,bucket_start,hit_count)
  values('global','all_admin_requests',date_trunc('minute',clock_timestamp()),6000)
  on conflict(scope,subject,bucket_start) do update set hit_count=excluded.hit_count;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  begin
    perform k2_private.verify_admin_bff_request(
      'admin_session_validate',v_ts,v_nonce,v_key,v_command,
      k2_test.admin_signature('admin_session_validate',v_ts,v_nonce,v_actor,v_key,v_command));
    raise exception 'ADMIN_GLOBAL_BUDGET_NOT_ENFORCED';
  exception when program_limit_exceeded then
    if sqlerrm not like '%K2_ADMIN_RATE_LIMITED%' then raise; end if;
  end;
  delete from k2_private.admin_request_rate_buckets
  where scope='global' and subject='all_admin_requests' and bucket_start=date_trunc('minute',clock_timestamp());
end $$;
select 'MAP019_ACCOUNT_CLAIM_ASSERTIONS_PASSED';
