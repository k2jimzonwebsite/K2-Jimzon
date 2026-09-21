\set ON_ERROR_STOP on
begin;
insert into public.globe_products(product_id,enabled,display_order) values('rio-mare',true,0);
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
set local request.jwt.claims = '{"aal":"aal2","is_admin":true,"is_staff":true}';

do $$
declare
  v_key uuid := '22222222-2222-4222-8222-222222222222';
  v_payload text := '{"productId":"rio-mare","enabled":false,"hero":null,"displayOrder":0,"version":1,"reason":"Hide pending photo review"}';
  v_result jsonb;
  v_review_id uuid;
begin
  v_result := public.execute_admin_globe_review_direct_v1('globe_config_update',v_key,v_payload);
  if v_result->>'enabled' <> 'false' or (v_result->>'version')::integer <> 2 then
    raise exception 'Globe command did not save';
  end if;
  if public.execute_admin_globe_review_direct_v1('globe_config_update',v_key,v_payload) <> v_result then
    raise exception 'Same-key retry changed result';
  end if;
  begin
    perform public.execute_admin_globe_review_direct_v1('globe_config_update',v_key,replace(v_payload,'false','true'));
    raise exception 'Changed payload reused the same key';
  exception when sqlstate '22023' then null;
  end;

  v_result := public.execute_admin_globe_review_direct_v1('review_create','33333333-3333-4333-8333-333333333333',
    '{"name":"Real buyer","channel":"Shopee","stars":4,"text":"Arrived sealed and on the expected date.","item":"Rio Mare tuna","productId":"rio-mare","reviewDate":"2026-08-20","sourceKind":"verified_marketplace","sourceReference":"ORDER-1042","rightsBasis":"marketplace_publication","reason":"Record source feedback"}');
  v_review_id := (v_result->'review'->>'id')::uuid;
  if v_result->'review'->>'status' <> 'draft' then
    raise exception 'Creation published a review';
  end if;
  v_result := public.execute_admin_globe_review_direct_v1('review_publish','44444444-4444-4444-8444-444444444444',
    jsonb_build_object('id',v_review_id,'version',1,'reason','Evidence and rights checked')::text);
  if v_result->'review'->>'status' <> 'published' then
    raise exception 'Publication did not save';
  end if;

  perform set_config('request.jwt.claims','{"aal":"aal2","is_admin":false,"is_staff":true}',true);
  begin
    perform public.execute_admin_globe_review_direct_v1('review_withdraw','55555555-5555-4555-8555-555555555555',
      jsonb_build_object('id',v_review_id,'version',2,'reason','Staff cannot publish')::text);
    raise exception 'Non-Admin wrote a review';
  exception when sqlstate '42501' then null;
  end;
  perform set_config('request.jwt.claims','{"aal":"aal1","is_admin":true,"is_staff":true}',true);
  begin
    perform public.execute_admin_globe_review_direct_v1('review_withdraw','66666666-6666-4666-8666-666666666666',
      jsonb_build_object('id',v_review_id,'version',2,'reason','MFA required')::text);
    raise exception 'AAL1 Admin wrote a review';
  exception when sqlstate '42501' then null;
  end;
end $$;

reset role;
do $$ begin
  if (select count(*) from k2_private.globe_review_events where request_id='22222222-2222-4222-8222-222222222222') <> 1 then
    raise exception 'Retry duplicated audit event';
  end if;
end $$;

do $$ begin
  if has_table_privilege('authenticated','public.globe_products','update')
     or has_table_privilege('authenticated','public.reviews','insert') then
    raise exception 'Direct table write grant remains';
  end if;
end $$;
rollback;
select 'ADMIN_GLOBE_DIRECT_ASSERTIONS_PASSED';
