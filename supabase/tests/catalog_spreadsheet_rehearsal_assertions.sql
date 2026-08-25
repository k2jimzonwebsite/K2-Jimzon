\set ON_ERROR_STOP on

set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
set request.jwt.claims='{"aal":"aal2"}';
insert into auth.users(id) values(auth.uid());

do $$
declare
  v_operation uuid:='22222222-2222-4222-8222-222222222222';
  v_key uuid:='33333333-3333-4333-8333-333333333333';
  v_payload text;
  v_result jsonb;
  v_status jsonb;
  v_created public.products;
begin
  v_payload:=jsonb_build_object(
    'operationId',v_operation,'fileSha256',repeat('a',64),
    'templateVersion','k2-catalog-v1','chunkIndex',0,'finalChunk',true,
    'reason','Verified against the supplier package before catalog creation.',
    'rows',jsonb_build_array(jsonb_build_object(
      'rowNumber',2,'kind','new','catalogId',null,'sku',null,
      'expectedVersion',null,'expectedUpdatedAt',null,
      'values',jsonb_build_object(
        'name','Rehearsal Pasta','description','Bronze cut','usage_instructions','Boil',
        'storage_instructions','Keep dry','ingredients','Wheat','allergens','Gluten',
        'country_of_origin','Italy','net_weight','500.25','package_type','Bag',
        'subcategory','Pasta','seo_keywords','pasta | italy',
        'primary_image_url','https://example.com/pasta.jpg','product_video_url','',
        'internal_notes','Rehearsal only'
      )
    ))
  )::text;
  v_result:=public.execute_admin_catalog_import_v1(
    'catalog_import_chunk',extract(epoch from now())::bigint,
    '44444444-4444-4444-8444-444444444444',v_key,v_payload,'test'
  );
  if v_result->>'status'<>'completed' or (v_result->>'committedRowCount')::int<>1 then
    raise exception 'new-row result assertion failed: %',v_result;
  end if;
  select * into strict v_created from public.products where sku='K2-SKU-000001';
  if v_created.status<>'Draft' or v_created.published or v_created.net_weight<>500.25
     or v_created.catalog_record_version<>1 then
    raise exception 'new draft assertion failed';
  end if;
  v_status:=public.read_admin_catalog_import_status_v1(v_operation);
  if v_status->>'status'<>'completed' or jsonb_array_length(v_status->'rows')<>1 then
    raise exception 'durable status assertion failed: %',v_status;
  end if;
  v_result:=public.execute_admin_catalog_import_v1(
    'catalog_import_chunk',extract(epoch from now())::bigint,
    '55555555-5555-4555-8555-555555555555',v_key,v_payload,'test'
  );
  if (select count(*) from public.products where sku='K2-SKU-000001')<>1 then
    raise exception 'idempotency assertion failed';
  end if;
end
$$;

do $$
declare
  v_product public.products;
  v_payload text;
begin
  select * into strict v_product from public.products where sku='K2-SKU-000001';
  v_payload:=jsonb_build_object(
    'operationId','99999999-9999-4999-8999-999999999999','fileSha256',repeat('c',64),
    'templateVersion','k2-catalog-v1','chunkIndex',0,'finalChunk',true,
    'reason','Approved the corrected product name after a second package review.',
    'rows',jsonb_build_array(jsonb_build_object(
      'rowNumber',2,'kind','update','catalogId',v_product.catalog_id,'sku',v_product.sku,
      'expectedVersion',v_product.catalog_record_version,
      'expectedUpdatedAt',v_product.updated_at,
      'values',jsonb_build_object(
        'name','Rehearsal Pasta Updated','description','Bronze cut',
        'usage_instructions','Boil','storage_instructions','Keep dry',
        'ingredients','Wheat','allergens','Gluten','country_of_origin','Italy',
        'net_weight','500.25','package_type','Bag','subcategory','Pasta',
        'seo_keywords','pasta | italy','primary_image_url','https://example.com/pasta.jpg',
        'product_video_url','','internal_notes','Rehearsal only'
      )
    ))
  )::text;
  perform public.execute_admin_catalog_import_v1(
    'catalog_import_chunk',extract(epoch from now())::bigint,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',v_payload,'test'
  );
  select * into strict v_product from public.products where sku='K2-SKU-000001';
  if v_product.name<>'Rehearsal Pasta Updated' or v_product.catalog_record_version<>2 then
    raise exception 'successful update/version assertion failed';
  end if;
  begin
    perform public.execute_admin_catalog_import_v1(
      'catalog_import_chunk',extract(epoch from now())::bigint,
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      replace(v_payload,'Rehearsal Pasta Updated','Conflicting Payload'),'test'
    );
    raise exception 'changed-payload replay unexpectedly succeeded';
  exception when invalid_parameter_value then
    null;
  end;
end
$$;

do $$
declare
  v_product public.products;
  v_payload text;
begin
  select * into strict v_product from public.products where sku='K2-SKU-000001';
  v_payload:=jsonb_build_object(
    'operationId','66666666-6666-4666-8666-666666666666','fileSha256',repeat('b',64),
    'templateVersion','k2-catalog-v1','chunkIndex',0,'finalChunk',true,
    'reason','Rehearsed a stale update to verify atomic conflict behavior.',
    'rows',jsonb_build_array(jsonb_build_object(
      'rowNumber',2,'kind','update','catalogId',v_product.catalog_id,'sku',v_product.sku,
      'expectedVersion',v_product.catalog_record_version+1,
      'expectedUpdatedAt',v_product.updated_at,
      'values',jsonb_build_object(
        'name','Must Roll Back','description','','usage_instructions','',
        'storage_instructions','','ingredients','','allergens','',
        'country_of_origin','','net_weight','','package_type','',
        'subcategory','','seo_keywords','','primary_image_url','',
        'product_video_url','','internal_notes',''
      )
    ))
  )::text;
  begin
    perform public.execute_admin_catalog_import_v1(
      'catalog_import_chunk',extract(epoch from now())::bigint,
      '77777777-7777-4777-8777-777777777777',
      '88888888-8888-4888-8888-888888888888',v_payload,'test'
    );
    raise exception 'stale update unexpectedly succeeded';
  exception when serialization_failure then
    null;
  end;
  if (select name from public.products where sku=v_product.sku)<>'Rehearsal Pasta Updated'
     or exists(select 1 from k2_private.catalog_import_operations
               where operation_id='66666666-6666-4666-8666-666666666666') then
    raise exception 'stale update was not atomic';
  end if;
end
$$;

do $$
declare
  v_payload text;
begin
  v_payload:=jsonb_build_object(
    'operationId','dddddddd-dddd-4ddd-8ddd-dddddddddddd','fileSha256',repeat('d',64),
    'templateVersion','k2-catalog-v1','chunkIndex',1,'finalChunk',true,
    'reason','Rehearsed an out-of-order chunk to prove sequence denial.',
    'rows',jsonb_build_array(jsonb_build_object(
      'rowNumber',3,'kind','new','catalogId',null,'sku',null,
      'expectedVersion',null,'expectedUpdatedAt',null,
      'values',jsonb_build_object(
        'name','Out of Order','description','','usage_instructions','',
        'storage_instructions','','ingredients','','allergens','',
        'country_of_origin','','net_weight','','package_type','',
        'subcategory','','seo_keywords','','primary_image_url','',
        'product_video_url','','internal_notes',''
      )
    ))
  )::text;
  begin
    perform public.execute_admin_catalog_import_v1(
      'catalog_import_chunk',extract(epoch from now())::bigint,
      'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      'ffffffff-ffff-4fff-8fff-ffffffffffff',v_payload,'test'
    );
    raise exception 'out-of-order chunk unexpectedly succeeded';
  exception when check_violation then
    null;
  end;
  if exists(select 1 from k2_private.catalog_import_operations
            where operation_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd') then
    raise exception 'out-of-order chunk left operation state';
  end if;
end
$$;

do $$
begin
  perform set_config('request.jwt.claims','{"aal":"aal1"}',true);
  begin
    perform public.read_admin_catalog_import_status_v1('22222222-2222-4222-8222-222222222222');
    raise exception 'AAL1 status read unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
  perform set_config('request.jwt.claims','{"aal":"aal2"}',true);
end
$$;

do $$
begin
  if has_table_privilege('authenticated','public.products','INSERT')
     or has_table_privilege('authenticated','public.products','UPDATE')
     or has_table_privilege('authenticated','public.products','DELETE') then
    raise exception 'authenticated direct product writes remain granted';
  end if;
  if has_table_privilege('authenticated','k2_private.catalog_import_row_events','UPDATE')
     or (select count(*) from k2_private.catalog_import_row_events)<>2 then
    raise exception 'catalog event evidence assertion failed';
  end if;
end
$$;

select 'catalog spreadsheet PostgreSQL rehearsal passed' as result;
