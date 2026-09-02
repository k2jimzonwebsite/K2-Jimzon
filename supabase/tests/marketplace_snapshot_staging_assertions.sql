-- Behavioral assertions for the prepared MAP-023/MAP-026 private boundary.

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false);
select set_config('request.jwt.claim.aal','aal2',false);

create or replace function k2_test.signed_command(
  p_action text,
  p_payload jsonb,
  p_idempotency_key uuid
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_nonce uuid:=gen_random_uuid();
  v_timestamp bigint:=extract(epoch from clock_timestamp())::bigint;
  v_payload_text text:=p_payload::text;
  v_payload_hash text;
  v_message text;
  v_signature text;
begin
  v_payload_hash:=encode(extensions.digest(convert_to(v_payload_text,'UTF8'),'sha256'),'hex');
  v_message:=p_action||E'\n'||v_timestamp::text||E'\n'||v_nonce::text||E'\n'
    ||v_actor::text||E'\n'||p_idempotency_key::text||E'\n'||v_payload_hash;
  v_signature:=encode(extensions.hmac(
    convert_to(v_message,'UTF8'),decode(repeat('ab',32),'hex'),'sha256'
  ),'hex');
  return public.execute_admin_marketplace_snapshot_v1(
    p_action,v_timestamp,v_nonce,p_idempotency_key,v_payload_text,v_signature
  );
end
$$;

create or replace function k2_test.order_payload(
  p_import_id uuid,
  p_source_identity text,
  p_file_sha256 text
) returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object(
  'importId',p_import_id,'sessionId','70000000-0000-0000-0000-000000000001',
  'shopId','20000000-0000-0000-0000-000000000001',
  'sourceIdentity',p_source_identity,'fileSha256',p_file_sha256,
  'schemaVersion','k2.marketplace-orders.v1',
  'reason','Stage customer-free synthetic order facts for close reconciliation.',
  'facts',jsonb_build_array(
    jsonb_build_object(
      'rowNumber',1,'shopId','20000000-0000-0000-0000-000000000001',
      'externalOrderId','ORDER-001','externalLineId','LINE-001',
      'marketplaceSku','SP-SKU-LINK','quantity',1,'grossAmount','1250.00',
      'currency','PHP','orderedAt','2026-08-15T08:30:00+08:00',
      'orderStatus','paid','paymentStatus','verified','payloadSha256',repeat('5',64),
      'outcome','accepted','duplicateOfRowNumber',null,'conflictWithRowNumber',null
    ),
    jsonb_build_object(
      'rowNumber',2,'shopId','20000000-0000-0000-0000-000000000001',
      'externalOrderId','ORDER-001','externalLineId','LINE-001',
      'marketplaceSku','SP-SKU-LINK','quantity',1,'grossAmount','1250.00',
      'currency','PHP','orderedAt','2026-08-15T08:30:00+08:00',
      'orderStatus','paid','paymentStatus','verified','payloadSha256',repeat('5',64),
      'outcome','duplicate','duplicateOfRowNumber',1,'conflictWithRowNumber',null
    ),
    jsonb_build_object(
      'rowNumber',3,'shopId','20000000-0000-0000-0000-000000000001',
      'externalOrderId','ORDER-001','externalLineId','LINE-001',
      'marketplaceSku','SP-SKU-LINK','quantity',2,'grossAmount','2500.00',
      'currency','PHP','orderedAt','2026-08-15T08:30:00+08:00',
      'orderStatus','paid','paymentStatus','verified','payloadSha256',repeat('6',64),
      'outcome','conflict','duplicateOfRowNumber',null,'conflictWithRowNumber',1
    )
  )
)
$$;

create or replace function k2_test.assert_true(p_value boolean,p_message text)
returns void language plpgsql as $$
begin
  if coalesce(p_value,false)=false then raise exception 'ASSERTION_FAILED: %',p_message; end if;
end
$$;

create or replace function k2_test.snapshot_payload(
  p_import_id uuid,
  p_source_identity text,
  p_file_sha256 text
) returns jsonb language sql stable set search_path='' as $$
select jsonb_build_object(
  'importId',p_import_id,
  'provider','shopee',
  'shopId','20000000-0000-0000-0000-000000000001',
  'sourceIdentity',p_source_identity,
  'fileSha256',p_file_sha256,
  'schemaVersion','k2.marketplace-snapshot.v1',
  'periodStart','2026-08-01',
  'periodEnd','2026-08-31',
  'reason','Stage a customer-free synthetic marketplace export for local rehearsal.',
  'rows',jsonb_build_array(
    jsonb_build_object(
      'rowNumber',2,'source',jsonb_build_object(
        'schema_version','k2.marketplace-snapshot.v1','source_row_id','row-link',
        'external_item_id','SP-ITEM-LINK','external_variant_id','SP-VAR-LINK',
        'marketplace_sku','SP-SKU-LINK','barcode','480000000001','title','Existing Product',
        'size','100 ml','concentration','','flavor','','shade','','formulation','','pack_count','1'
      ),'normalized',jsonb_build_object(
        'unitPrice',1250,'currency','PHP','listingStatus','active','reportedQuantity',8,
        'observedAt','2026-08-31T08:00:00+08:00'
      ),'payloadSha256',repeat('1',64),'outcome','accepted','duplicateOfRowNumber',null,
      'errors',jsonb_build_array(),'suggestions',jsonb_build_array(jsonb_build_object(
        'productId','30000000-0000-0000-0000-000000000001','eligible',true,
        'variantConflict',false,'score',100,'reasons',jsonb_build_array('barcode')
      ))
    ),
    jsonb_build_object(
      'rowNumber',3,'source',jsonb_build_object(
        'schema_version','k2.marketplace-snapshot.v1','source_row_id','row-create',
        'external_item_id','SP-ITEM-CREATE','external_variant_id','SP-VAR-CREATE',
        'marketplace_sku','SP-SKU-CREATE','barcode','','title','Reviewed New Product',
        'size','50 ml','concentration','','flavor','','shade','','formulation','','pack_count','1'
      ),'normalized',jsonb_build_object(
        'unitPrice',900,'currency','PHP','listingStatus','active','reportedQuantity',4,
        'observedAt','2026-08-31T08:00:00+08:00'
      ),'payloadSha256',repeat('2',64),'outcome','accepted','duplicateOfRowNumber',null,
      'errors',jsonb_build_array(),'suggestions',jsonb_build_array()
    ),
    jsonb_build_object(
      'rowNumber',4,'source',jsonb_build_object(
        'schema_version','k2.marketplace-snapshot.v1','source_row_id','row-unresolved',
        'external_item_id','SP-ITEM-UNRESOLVED','external_variant_id','SP-VAR-UNRESOLVED',
        'marketplace_sku','SP-SKU-UNRESOLVED','barcode','','title','Unknown Product',
        'size','','concentration','','flavor','','shade','','formulation','','pack_count','1'
      ),'normalized',jsonb_build_object(
        'unitPrice',500,'currency','PHP','listingStatus','inactive','reportedQuantity',0,
        'observedAt','2026-08-31T08:00:00+08:00'
      ),'payloadSha256',repeat('3',64),'outcome','accepted','duplicateOfRowNumber',null,
      'errors',jsonb_build_array(),'suggestions',jsonb_build_array()
    ),
    jsonb_build_object(
      'rowNumber',5,'source',jsonb_build_object(
        'schema_version','k2.marketplace-snapshot.v1','source_row_id','row-duplicate',
        'external_item_id','SP-ITEM-LINK','external_variant_id','SP-VAR-LINK',
        'marketplace_sku','SP-SKU-LINK','barcode','480000000001','title','Existing Product',
        'size','100 ml','concentration','','flavor','','shade','','formulation','','pack_count','1'
      ),'normalized',jsonb_build_object(
        'unitPrice',1250,'currency','PHP','listingStatus','active','reportedQuantity',8,
        'observedAt','2026-08-31T08:00:00+08:00'
      ),'payloadSha256',repeat('1',64),'outcome','duplicate','duplicateOfRowNumber',2,
      'errors',jsonb_build_array(),'suggestions',jsonb_build_array()
    ),
    jsonb_build_object(
      'rowNumber',6,'source',jsonb_build_object(
        'schema_version','k2.marketplace-snapshot.v1','source_row_id','row-conflict',
        'external_item_id','SP-ITEM-LINK','external_variant_id','SP-VAR-LINK',
        'marketplace_sku','SP-SKU-LINK','barcode','480000000001','title','Changed Product',
        'size','100 ml','concentration','','flavor','','shade','','formulation','','pack_count','1'
      ),'normalized',jsonb_build_object(
        'unitPrice',1300,'currency','PHP','listingStatus','active','reportedQuantity',9,
        'observedAt','2026-08-31T09:00:00+08:00'
      ),'payloadSha256',repeat('4',64),'outcome','conflict','duplicateOfRowNumber',2,
      'errors',jsonb_build_array('DUPLICATE_PAYLOAD_CONFLICT'),'suggestions',jsonb_build_array()
    )
  )
)
$$;

select k2_test.assert_true(
  not has_table_privilege('authenticated','k2_private.marketplace_snapshot_imports','SELECT')
  and not has_table_privilege('authenticated','k2_private.marketplace_snapshot_rows','INSERT'),
  'private staging tables leaked direct client privileges'
);
select k2_test.assert_true(
  (select relrowsecurity and relforcerowsecurity from pg_class
   where oid='k2_private.marketplace_snapshot_rows'::regclass),
  'staging rows do not force RLS'
);

select k2_test.signed_command(
  'marketplace_snapshot_stage',
  k2_test.snapshot_payload(
    '50000000-0000-0000-0000-000000000001','shopee-01:2026-08.synthetic.csv',repeat('a',64)
  ),
  '60000000-0000-0000-0000-000000000001'
);
select k2_test.assert_true(
  (select accepted_row_count=3 and duplicate_row_count=1 and conflict_row_count=1
   from k2_private.marketplace_snapshot_imports
   where id='50000000-0000-0000-0000-000000000001'),
  'accepted, duplicate, and conflict evidence was not retained'
);

select k2_test.assert_true(
  (k2_test.signed_command(
    'marketplace_snapshot_stage',
    k2_test.snapshot_payload(
      '50000000-0000-0000-0000-000000000009','shopee-01:2026-08.synthetic.csv',repeat('a',64)
    ),
    '60000000-0000-0000-0000-000000000002'
  )->>'importId')='50000000-0000-0000-0000-000000000001',
  'exact source replay did not return prior immutable import'
);

do $$ begin
  perform k2_test.signed_command(
    'marketplace_snapshot_stage',
    k2_test.snapshot_payload(
      '50000000-0000-0000-0000-000000000008','shopee-01:2026-08.synthetic.csv',repeat('b',64)
    ),
    '60000000-0000-0000-0000-000000000003'
  );
  raise exception 'changed source identity payload was accepted';
exception when others then
  if sqlerrm not like '%K2_MARKETPLACE_SNAPSHOT_CONFLICT%' then raise; end if;
end $$;

do $$
declare v_row_id uuid;
begin
  select id into v_row_id from k2_private.marketplace_snapshot_rows
  where import_id='50000000-0000-0000-0000-000000000001' and row_number=2;
  perform k2_test.signed_command(
    'marketplace_match_decision',jsonb_build_object(
      'importId','50000000-0000-0000-0000-000000000001','rowId',v_row_id,
      'decision','link_existing','productId','30000000-0000-0000-0000-000000000001',
      'reviewedProduct',null,'reason','Approve the exact barcode suggestion after human review.'
    ),'60000000-0000-0000-0000-000000000004'
  );
  raise exception 'Staff was allowed to approve a product match';
exception when others then
  if sqlerrm not like '%K2_MARKETPLACE_ADMIN_REQUIRED%' then raise; end if;
end $$;

select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false);

select k2_test.assert_true(
  jsonb_array_length(public.read_admin_marketplace_shop_options_v1())=3,
  'exact marketplace shop options were not available to Owner Count and Close'
);

do $$
declare v_row_id uuid; v_result jsonb;
begin
  select id into v_row_id from k2_private.marketplace_snapshot_rows
  where import_id='50000000-0000-0000-0000-000000000001' and row_number=2;
  v_result:=k2_test.signed_command(
    'marketplace_match_decision',jsonb_build_object(
      'importId','50000000-0000-0000-0000-000000000001','rowId',v_row_id,
      'decision','link_existing','productId','30000000-0000-0000-0000-000000000001',
      'reviewedProduct',null,'reason','Approve the exact barcode suggestion after human review.'
    ),'60000000-0000-0000-0000-000000000005'
  );
  perform k2_test.assert_true(
    v_result->>'productId'='30000000-0000-0000-0000-000000000001'
    and (v_result->>'physicalInventoryChanged')::boolean=false,
    'approved link did not preserve quantity as observation-only evidence'
  );
end $$;

do $$
declare v_row_id uuid; v_result jsonb;
begin
  select id into v_row_id from k2_private.marketplace_snapshot_rows
  where import_id='50000000-0000-0000-0000-000000000001' and row_number=3;
  v_result:=k2_test.signed_command(
    'marketplace_match_decision',jsonb_build_object(
      'importId','50000000-0000-0000-0000-000000000001','rowId',v_row_id,
      'decision','create_new_draft','productId',null,
      'reviewedProduct',jsonb_build_object(
        'name','Reviewed New Product','barcode',null,'description','Human-reviewed synthetic fixture.',
        'size','50 ml','packageType','Bottle','subcategory','Fragrance'
      ),'reason','Create a Draft only after reviewing the imported product evidence.'
    ),'60000000-0000-0000-0000-000000000006'
  );
  perform k2_test.assert_true(
    v_result->>'sku' like 'K2-%' and v_result->>'productStatus'='Draft'
    and (select published=false from public.products where id=(v_result->>'productId')::uuid),
    'server generated Draft SKU was not used for the reviewed product'
  );
end $$;

do $$
declare v_row_id uuid;
begin
  select id into v_row_id from k2_private.marketplace_snapshot_rows
  where import_id='50000000-0000-0000-0000-000000000001' and row_number=4;
  perform k2_test.signed_command(
    'marketplace_match_decision',jsonb_build_object(
      'importId','50000000-0000-0000-0000-000000000001','rowId',v_row_id,
      'decision','leave_unresolved','productId',null,'reviewedProduct',null,
      'reason','Leave unresolved because no trustworthy product identity exists yet.'
    ),'60000000-0000-0000-0000-000000000007'
  );
end $$;
select k2_test.assert_true(
  (select count(*)=2 from k2_private.marketplace_product_aliases)
  and (select count(*)=2 from k2_private.marketplace_listing_observations)
  and (select status='resolved' from k2_private.marketplace_snapshot_imports
       where id='50000000-0000-0000-0000-000000000001'),
  'human decisions did not resolve the import without aliasing the unresolved row'
);

select k2_test.assert_true(
  (select count(*)=1 and max(quantity)=17 from public.product_batches),
  'physical inventory changed during marketplace snapshot decisions'
);

select k2_test.signed_command(
  'owner_close_session_save',jsonb_build_object(
    'sessionId','70000000-0000-0000-0000-000000000001','periodStart','2026-08-01',
    'periodEnd','2026-08-31','timezone','Asia/Manila','shopIds',jsonb_build_array(
      '20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002'
    ),'currentStep','source_selection','expectedVersion',1,
    'reason','Start the phone-first Owner Count and Close session for exact shops.'
  ),'80000000-0000-0000-0000-000000000001'
);
select k2_test.assert_true(
  (select timezone='Asia/Manila' and version=1 from k2_private.owner_close_sessions
   where id='70000000-0000-0000-0000-000000000001')
  and (select count(*)=2 from k2_private.owner_close_session_shops
       where session_id='70000000-0000-0000-0000-000000000001'),
  'Owner Count and Close did not retain exact shops and Asia/Manila time'
);

select k2_test.signed_command(
  'owner_close_session_save',jsonb_build_object(
    'sessionId','70000000-0000-0000-0000-000000000001','periodStart','2026-08-01',
    'periodEnd','2026-08-31','timezone','Asia/Manila','shopIds',jsonb_build_array(
      '20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002'
    ),'currentStep','product_matching','expectedVersion',1,
    'reason','Resume the close session after source imports are staged and reviewed.'
  ),'80000000-0000-0000-0000-000000000002'
);

do $$ begin
  perform k2_test.signed_command(
    'owner_close_session_save',jsonb_build_object(
      'sessionId','70000000-0000-0000-0000-000000000001','periodStart','2026-08-01',
      'periodEnd','2026-08-31','timezone','Asia/Manila','shopIds',jsonb_build_array(
        '20000000-0000-0000-0000-000000000001'
      ),'currentStep','stock_count','expectedVersion',1,
      'reason','Attempt a stale close-session save to prove optimistic concurrency.'
    ),'80000000-0000-0000-0000-000000000003'
  );
  raise exception 'stale close-session version was accepted';
exception when others then
  if sqlerrm not like '%K2_OWNER_CLOSE_VERSION_CONFLICT%' then raise; end if;
end $$;

select k2_test.assert_true(
  (public.read_admin_owner_close_session_v1('70000000-0000-0000-0000-000000000001')->>'version')::integer=2,
  'close-session read did not resume at version two'
);

select k2_test.signed_command(
  'marketplace_order_fact_stage',k2_test.order_payload(
    '90000000-0000-0000-0000-000000000001','shopee-01:orders-2026-08.synthetic.csv',repeat('c',64)
  ),'91000000-0000-0000-0000-000000000001'
);
select k2_test.assert_true(
  (select accepted_count=1 and duplicate_count=1 and conflict_count=1
   from k2_private.owner_close_order_imports where id='90000000-0000-0000-0000-000000000001')
  and (select count(*)=3 from k2_private.owner_close_order_facts
       where import_id='90000000-0000-0000-0000-000000000001')
  and (select match_status='linked' from k2_private.owner_close_order_facts
       where import_id='90000000-0000-0000-0000-000000000001' and row_number=1),
  'order facts did not retain accepted, duplicate, conflict, and alias evidence'
);
select k2_test.assert_true(
  (k2_test.signed_command(
    'marketplace_order_fact_stage',k2_test.order_payload(
      '90000000-0000-0000-0000-000000000009','shopee-01:orders-2026-08.synthetic.csv',repeat('c',64)
    ),'91000000-0000-0000-0000-000000000002'
  )->>'importId')='90000000-0000-0000-0000-000000000001',
  'exact order source replay did not return prior immutable import'
);
select k2_test.signed_command(
  'marketplace_order_fact_stage',k2_test.order_payload(
    '90000000-0000-0000-0000-000000000002','shopee-01:orders-2026-08-second.synthetic.csv',repeat('e',64)
  ),'91000000-0000-0000-0000-000000000004'
);
select k2_test.assert_true(
  (select accepted_count=0 and duplicate_count=2 and conflict_count=1
   from k2_private.owner_close_order_imports where id='90000000-0000-0000-0000-000000000002')
  and (select outcome='duplicate' and match_status='duplicate'
       from k2_private.owner_close_order_facts
       where import_id='90000000-0000-0000-0000-000000000002' and row_number=1),
  'cross-import order identity was double-counted instead of deduplicated'
);
do $$ begin
  perform k2_test.signed_command(
    'marketplace_order_fact_stage',k2_test.order_payload(
      '90000000-0000-0000-0000-000000000008','shopee-01:orders-2026-08.synthetic.csv',repeat('d',64)
    ),'91000000-0000-0000-0000-000000000003'
  );
  raise exception 'changed order source identity payload was accepted';
exception when others then
  if sqlerrm not like '%K2_MARKETPLACE_ORDER_IMPORT_CONFLICT%' then raise; end if;
end $$;
select k2_test.assert_true(
  (select count(*)=1 and max(quantity)=17 from public.product_batches),
  'order staging changed physical inventory'
);

do $$ begin
  perform k2_test.signed_command(
    'marketplace_fee_estimate_save',jsonb_build_object(
      'estimateId','92000000-0000-0000-0000-000000000009',
      'sessionId','70000000-0000-0000-0000-000000000001',
      'shopId','20000000-0000-0000-0000-000000000001',
      'policyVersion','shopee-manual-2026-08-v1','currency','PHP',
      'commissionBasisPoints',600,'paymentBasisPoints',200,'withholdingBasisPoints',100,
      'fixedFeeMinorPerOrder',500,'reason','Estimate fees only after reconciling every retained order conflict.'
    ),'93000000-0000-0000-0000-000000000009'
  );
  raise exception 'fee estimate accepted unresolved conflict evidence';
exception when others then
  if sqlerrm not like '%K2_MARKETPLACE_FEE_FACTS_BLOCKED%' then raise; end if;
end $$;

insert into k2_private.owner_close_order_imports(
  id,session_id,shop_id,source_identity,file_sha256,schema_version,
  accepted_count,duplicate_count,conflict_count,created_by
) values(
  '90000000-0000-0000-0000-000000000003','70000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002','shop-two-fee-rehearsal',repeat('f',64),
  'k2.marketplace-orders.v1',1,0,0,'10000000-0000-0000-0000-000000000001'
);
insert into k2_private.owner_close_order_facts(
  import_id,session_id,shop_id,row_number,external_order_id,external_line_id,
  marketplace_sku,product_id,payload_sha256,fact_data,outcome,match_status
) values(
  '90000000-0000-0000-0000-000000000003','70000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',1,'ORDER-CLEAN','LINE-1','SP-SKU-LINK',
  '30000000-0000-0000-0000-000000000001',repeat('7',64),jsonb_build_object(
    'grossAmount','100.00','currency','PHP'
  ),'accepted','linked'
);
select k2_test.signed_command(
  'marketplace_fee_estimate_save',jsonb_build_object(
    'estimateId','92000000-0000-0000-0000-000000000001',
    'sessionId','70000000-0000-0000-0000-000000000001',
    'shopId','20000000-0000-0000-0000-000000000002',
    'policyVersion','shopee-manual-2026-08-v1','currency','PHP',
    'commissionBasisPoints',600,'paymentBasisPoints',200,'withholdingBasisPoints',100,
    'fixedFeeMinorPerOrder',500,'reason','Save a versioned estimate from reconciled customer-free order facts.'
  ),'93000000-0000-0000-0000-000000000001'
);
select k2_test.assert_true(
  (select estimate_version=1 and gross_minor=10000 and commission_minor=600
      and payment_minor=200 and withholding_minor=100 and fixed_minor=500
      and estimated_fee_minor=1400 and estimated_net_minor=8600
   from k2_private.owner_close_fee_estimates
   where id='92000000-0000-0000-0000-000000000001')
  and jsonb_array_length(public.read_admin_owner_close_fee_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->'latestEstimates')=1
  and (public.read_admin_owner_close_fee_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->>'estimateOnly')::boolean=true,
  'versioned aggregate fee estimate or explicit non-accounting flags were incorrect'
);
select k2_test.assert_true(
  jsonb_array_length(public.read_admin_owner_close_stock_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->'products')>=1
  and jsonb_array_length(public.read_admin_owner_close_stock_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->'lots')=1
  and (public.read_admin_owner_close_stock_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->>'observationOnly')::boolean=true
  and (public.read_admin_owner_close_stock_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->>'canonicalMutationRoute')='/api/admin/lots/reconcile',
  'stock comparison did not separate observation reads from canonical lot mutation'
);
select k2_test.signed_command(
  'owner_close_stock_review_save',jsonb_build_object(
    'sessionId','70000000-0000-0000-0000-000000000001',
    'productId','30000000-0000-0000-0000-000000000001',
    'expectedCanonicalBefore',17,'physicalCount',17,
    'reason','Physical recount matches the current exact canonical lot total.'
  ),'94000000-0000-0000-0000-000000000001'
);
select k2_test.assert_true(
  (select outcome='matched' and discrepancy=0 and version=1
   from k2_private.owner_close_stock_reviews
   where session_id='70000000-0000-0000-0000-000000000001'
     and product_id='30000000-0000-0000-0000-000000000001')
  and jsonb_array_length(public.read_admin_owner_close_stock_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->'reviews')=1,
  'matched physical count was not durably recorded for resume'
);
do $$ begin
  perform k2_test.signed_command(
    'owner_close_stock_review_save',jsonb_build_object(
      'sessionId','70000000-0000-0000-0000-000000000001',
      'productId','30000000-0000-0000-0000-000000000001',
      'expectedCanonicalBefore',17,'physicalCount',16,
      'reason','Attempt to record an unreconciled physical discrepancy must fail.'
    ),'94000000-0000-0000-0000-000000000002'
  );
  raise exception 'unreconciled physical count was recorded as complete';
exception when others then
  if sqlerrm not like '%K2_OWNER_CLOSE_STOCK_NOT_RECONCILED%' then raise; end if;
end $$;

select k2_test.signed_command(
  'marketplace_coverage_override',jsonb_build_object(
    'sessionId','70000000-0000-0000-0000-000000000001',
    'productId','30000000-0000-0000-0000-000000000001',
    'shopId','20000000-0000-0000-0000-000000000002',
    'action','skip','priority',null,
    'reason','Owner skips this scarce product in the second exact Shopee shop.'
  ),'80000000-0000-0000-0000-000000000004'
);

select k2_test.assert_true(
  jsonb_array_length(public.read_admin_marketplace_coverage_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->'shops')=2
  and (public.read_admin_marketplace_coverage_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->>'effect')='proposal_only'
  and (public.read_admin_marketplace_coverage_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->>'providerWrite')::boolean=false
  and (public.read_admin_marketplace_coverage_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->>'custodyTransfer')::boolean=false,
  'coverage input was not exact-shop and review-only'
);
select k2_test.assert_true(
  jsonb_array_length(public.read_admin_marketplace_coverage_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->'overrides')=1
  and (select count(*)=1 from k2_private.marketplace_coverage_override_events),
  'reasoned owner coverage override or immutable event was not retained'
);

select k2_test.assert_true(
  jsonb_array_length(public.read_admin_owner_close_pasabuy_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->'requests')=1
  and (public.read_admin_owner_close_pasabuy_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->>'customerMinimized')::boolean=true
  and (public.read_admin_owner_close_pasabuy_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->>'canonicalPasabuyStatusChanged')::boolean=false,
  'Pasabuy boxing input was not open-only, customer-minimized, and review-only'
);
select k2_test.signed_command(
  'owner_close_pasabuy_review_save',jsonb_build_object(
    'sessionId','70000000-0000-0000-0000-000000000001',
    'requestId','43000000-0000-0000-0000-000000000001',
    'readiness','ready','reason','Arrived item is identified and ready for the canonical boxing workflow.'
  ),'95000000-0000-0000-0000-000000000001'
);
select k2_test.assert_true(
  (select readiness='ready' and version=1
   from k2_private.owner_close_pasabuy_reviews
   where session_id='70000000-0000-0000-0000-000000000001'
     and request_id='43000000-0000-0000-0000-000000000001')
  and jsonb_array_length(public.read_admin_owner_close_pasabuy_input_v1(
    '70000000-0000-0000-0000-000000000001'
  )->'reviews')=1
  and (select status='arrived' from public.pasabuy_requests
       where id='43000000-0000-0000-0000-000000000001'),
  'Pasabuy boxing readiness was not durable or changed canonical status'
);

insert into k2_private.owner_close_order_imports(
  id,session_id,shop_id,source_identity,file_sha256,schema_version,
  accepted_count,duplicate_count,conflict_count,created_by
) values(
  '90000000-0000-0000-0000-000000000004','70000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001','shop-one-clean-handoff-rehearsal',repeat('a',64),
  'k2.marketplace-orders.v1',1,0,0,'10000000-0000-0000-0000-000000000001'
);
insert into k2_private.owner_close_order_facts(
  import_id,session_id,shop_id,row_number,external_order_id,external_line_id,
  marketplace_sku,product_id,payload_sha256,fact_data,outcome,match_status
) values(
  '90000000-0000-0000-0000-000000000004','70000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',1,'ORDER-CLEAN-HANDOFF','LINE-1','SP-SKU-LINK',
  '30000000-0000-0000-0000-000000000001',repeat('8',64),jsonb_build_object(
    'grossAmount','200.00','currency','PHP'
  ),'accepted','linked'
);
select k2_test.signed_command(
  'marketplace_fee_estimate_save',jsonb_build_object(
    'estimateId','92000000-0000-0000-0000-000000000002',
    'sessionId','70000000-0000-0000-0000-000000000001',
    'shopId','20000000-0000-0000-0000-000000000001',
    'policyVersion','shopee-manual-2026-08-v1','currency','PHP',
    'commissionBasisPoints',600,'paymentBasisPoints',200,'withholdingBasisPoints',100,
    'fixedFeeMinorPerOrder',500,'reason','Save the customer-free estimate required for the handoff rehearsal.'
  ),'93000000-0000-0000-0000-000000000002'
);
select k2_test.signed_command(
  'owner_close_session_save',jsonb_build_object(
    'sessionId','70000000-0000-0000-0000-000000000001','periodStart','2026-08-01',
    'periodEnd','2026-08-31','timezone','Asia/Manila','shopIds',jsonb_build_array(
      '20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002'
    ),'currentStep','bookkeeping_handoff','expectedVersion',2,
    'reason','All close checkpoints reached the customer-minimized bookkeeping handoff.'
  ),'96000000-0000-0000-0000-000000000001'
);
select k2_test.signed_command(
  'owner_close_stock_review_save',jsonb_build_object(
    'sessionId','70000000-0000-0000-0000-000000000001',
    'productId',(select id from public.products where name='Reviewed New Product' limit 1),
    'expectedCanonicalBefore',0,'physicalCount',0,
    'reason','Reviewed Draft has no canonical lots and no physical units were found.'
  ),'94000000-0000-0000-0000-000000000003'
);
select k2_test.assert_true(
  (public.read_admin_owner_close_bookkeeping_handoff_v1(
    '70000000-0000-0000-0000-000000000001'
  )->>'readyToClose')::boolean=true
  and jsonb_array_length(public.read_admin_owner_close_bookkeeping_handoff_v1(
    '70000000-0000-0000-0000-000000000001'
  )->'blockers')=0
  and (public.read_admin_owner_close_bookkeeping_handoff_v1(
    '70000000-0000-0000-0000-000000000001'
  )->>'customerMinimized')::boolean=true,
  'bookkeeping handoff did not derive a complete customer-minimized readiness artifact: '
    ||public.read_admin_owner_close_bookkeeping_handoff_v1(
      '70000000-0000-0000-0000-000000000001'
    )::text
);
select k2_test.signed_command(
  'owner_close_bookkeeping_handoff_save',jsonb_build_object(
    'sessionId','70000000-0000-0000-0000-000000000001','expectedSessionVersion',3,
    'reason','Finalize the reviewed estimate-only bookkeeping handoff and close session.'
  ),'96000000-0000-0000-0000-000000000002'
);
select k2_test.assert_true(
  (select status='completed' and version=4 from k2_private.owner_close_sessions
   where id='70000000-0000-0000-0000-000000000001')
  and (select count(*)=1 from k2_private.owner_close_bookkeeping_handoffs
       where session_id='70000000-0000-0000-0000-000000000001')
  and (select count(*)=1 from k2_private.owner_close_session_events
       where session_id='70000000-0000-0000-0000-000000000001'
         and event_type='bookkeeping_handoff_completed'),
  'bookkeeping handoff did not close exactly once with durable evidence'
);

select 'MARKETPLACE_SNAPSHOT_BEHAVIOR_ASSERTIONS_OK';
