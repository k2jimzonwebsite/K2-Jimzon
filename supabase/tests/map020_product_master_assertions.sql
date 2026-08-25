\set ON_ERROR_STOP on
do $$
declare
  v_actor uuid:='70000000-0000-4000-8000-000000000001';
  v_session uuid:='70000000-0000-4000-8000-000000000002';
  v_key uuid; v_nonce uuid; v_ts bigint; v_payload text; v_result jsonb;
  v_updated timestamptz;
begin
  insert into auth.users(id,email,email_confirmed_at) values(v_actor,'product-admin@example.test',now());
  insert into auth.sessions(id,user_id) values(v_session,v_actor);
  insert into public.user_profiles(id,email,role) values(v_actor,'product-admin@example.test','Admin');
  perform set_config('request.jwt.claim.sub',v_actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('aal','aal2','is_staff',true,'is_admin',true,'session_id',v_session)::text,true);
  insert into public.products(sku,name,status,srp,is_human_reviewed,brand_id,category_id,primary_image_url)
  values('K2-MASTER-001','Original product','Draft',100,true,extensions.gen_random_uuid(),extensions.gen_random_uuid(),'https://example.test/product.jpg')
  returning updated_at into v_updated;

  v_payload:=jsonb_build_object('sku','K2-MASTER-001','patch',jsonb_build_object('name','Reviewed product','srp',125),
    'expectedUpdatedAt',v_updated,'reason','Correct the verified product name and retail price.')::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_result:=public.execute_admin_product_master_command_v1('product_master_update',v_ts,v_nonce,v_key,v_payload,
    k2_test.admin_signature('product_master_update',v_ts,v_nonce,v_actor,v_key,v_payload));
  if v_result->>'sku'<>'K2-MASTER-001' or (select name from public.products where sku='K2-MASTER-001')<>'Reviewed product'
     or (select count(*) from k2_private.product_master_events where action='product_master_update' and sku='K2-MASTER-001')<>1 then
    raise exception 'PRODUCT_MASTER_UPDATE_FAILED';
  end if;
  v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  perform public.execute_admin_product_master_command_v1('product_master_update',v_ts,v_nonce,v_key,v_payload,
    k2_test.admin_signature('product_master_update',v_ts,v_nonce,v_actor,v_key,v_payload));
  if (select count(*) from k2_private.product_master_events where action='product_master_update' and sku='K2-MASTER-001')<>1 then
    raise exception 'PRODUCT_MASTER_UPDATE_NOT_IDEMPOTENT';
  end if;

  v_payload:=jsonb_build_object('skus',jsonb_build_array('K2-MASTER-001'),'status','Under Review',
    'reason','Move the reviewed record into publication review.')::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  perform public.execute_admin_product_master_command_v1('product_master_status',v_ts,v_nonce,v_key,v_payload,
    k2_test.admin_signature('product_master_status',v_ts,v_nonce,v_actor,v_key,v_payload));
  if (select status from public.products where sku='K2-MASTER-001')<>'Under Review' then raise exception 'PRODUCT_MASTER_REVIEW_FAILED'; end if;

  v_payload:=jsonb_build_object('skus',jsonb_build_array('K2-MASTER-001'),'status','Live',
    'reason','Publish after required content and human review are complete.')::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  perform public.execute_admin_product_master_command_v1('product_master_status',v_ts,v_nonce,v_key,v_payload,
    k2_test.admin_signature('product_master_status',v_ts,v_nonce,v_actor,v_key,v_payload));
  if (select status from public.products where sku='K2-MASTER-001')<>'Live' then raise exception 'PRODUCT_MASTER_LIVE_FAILED'; end if;

  insert into public.products(sku,name) values('K2-DELETE-001','Unused setup record');
  v_payload:=jsonb_build_object('skus',jsonb_build_array('K2-DELETE-001'),'pin','4812',
    'reason','Remove duplicate unused setup record after verification.')::text;
  v_key:=extensions.gen_random_uuid(); v_nonce:=extensions.gen_random_uuid(); v_ts:=extract(epoch from clock_timestamp())::bigint;
  v_result:=public.execute_admin_product_master_command_v1('product_master_delete',v_ts,v_nonce,v_key,v_payload,
    k2_test.admin_signature('product_master_delete',v_ts,v_nonce,v_actor,v_key,v_payload));
  if not coalesce((v_result->>'ok')::boolean,false) or exists(select 1 from public.products where sku='K2-DELETE-001') then
    raise exception 'PRODUCT_MASTER_DELETE_FAILED';
  end if;
end $$;
