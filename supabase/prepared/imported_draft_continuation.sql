-- IDEA-20261007-01 / MAP-018. PREPARED ONLY, not an activation migration.
-- Exact current foundation bodies, original ACL/config and same OIDs retained.
begin;
set local lock_timeout='2s';set local statement_timeout='10s';
do $preflight$ begin
 if current_user<>'postgres' or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null
    or has_table_privilege('authenticated','public.product_intake_sessions','INSERT,UPDATE,DELETE') then
  raise exception 'K2_IMPORTED_DRAFT_INSTALL_TARGET_INVALID';
 end if;
 if to_regprocedure('k2_private.assert_imported_draft_target_v1(uuid,bigint)') is not null and exists(select 1 from pg_catalog.pg_proc p where oid=to_regprocedure('k2_private.assert_imported_draft_target_v1(uuid,bigint)')
    and (md5(replace(prosrc,chr(13),''))<>'f6e99be431090705df0b095f608eca0f'
     or pg_get_userbyid(proowner)<>'postgres' or not prosecdef or proisstrict or proretset or proleakproof
     or prokind<>'f' or provolatile<>'v' or proparallel<>'u' or pronargdefaults<>0 or provariadic<>0 or prosupport<>0
     or proargmodes is not null or proallargtypes is not null or prorettype<>'jsonb'::regtype
     or proargnames is distinct from array['p_product_id','p_expected_version']::text[]
     or proconfig is distinct from array['search_path=""']::text[]
     or proacl::text[] is distinct from array['postgres=X/postgres']::text[])) then
  raise exception 'K2_IMPORTED_DRAFT_HELPER_DRIFT';
 end if;
end $preflight$;
create or replace function k2_private.assert_imported_draft_target_v1(p_product_id uuid,p_expected_version bigint)
returns jsonb language plpgsql volatile security definer set search_path='' as $target$
declare p public.products; v_result jsonb;
begin
 if auth.uid() is null or not public.is_staff() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
  raise exception using errcode='42501',message='K2_AAL2_STAFF_REQUIRED';
 end if;
 perform k2_private.lock_category_policy_v1(true);
 if p_product_id is null or p_expected_version is null or p_expected_version<1 then
  raise exception using errcode='22023',message='K2_IMPORTED_DRAFT_TARGET_INVALID';
 end if;
 select * into p from public.products where id=p_product_id for update;
 if not found or p.catalog_record_version is distinct from p_expected_version then
  raise exception using errcode='40001',message='K2_IMPORTED_DRAFT_VERSION_CONFLICT';
 end if;
 if p.status is distinct from 'Draft' or p.published is distinct from false
    or coalesce((to_jsonb(p)->>'stock_available')::numeric,0)<>0
    or exists(select 1 from public.product_batches where sku=p.sku and (quantity<>0 or reserved_quantity<>0))
    or exists(select 1 from public.inventory_balances where sku=p.sku and (on_hand<>0 or reserved<>0))
    or exists(select 1 from public.product_intake_sessions where product_id=p.id)
    or not exists(select 1 from k2_private.catalog_import_row_events where catalog_id=p.catalog_id and sku=p.sku and outcome='created') then
  raise exception using errcode='23514',message='K2_IMPORTED_DRAFT_NOT_ELIGIBLE';
 end if;
 v_result:=jsonb_build_object('productId',p.id,'recordVersion',p.catalog_record_version::text,
  'catalogId',p.catalog_id,'sku',p.sku,'name',p.name,'primaryImageUrl',p.primary_image_url,
  'product',jsonb_strip_nulls(jsonb_build_object(
   'name',p.name,'short_name',p.short_name,'description',p.description,
   'card_description',p.short_description,'why_buy',p.why_buy,
   'usage_instructions',p.usage_instructions,'ingredients',p.ingredients,'allergens',p.allergens,
   'storage_instructions',p.storage_instructions,'package_type',p.package_type,'subcategory',p.subcategory,
   'origin',coalesce(p.origin,p.country_of_origin),'size',p.size,
   'finished_product_details',p.finished_product_details,'seo_keywords',p.seo_keywords,'pairings',p.pairings,
   'brand',(select name from public.brands where id=p.brand_id),
   'category',(select name from public.categories where id=p.category_id),
   'barcode',p.barcode)));
 return v_result;
end;
$target$;
revoke all on function k2_private.assert_imported_draft_target_v1(uuid,bigint) from public,anon,authenticated,service_role;
do $patch0$
declare b pg_catalog.pg_proc%rowtype; a pg_catalog.pg_proc%rowtype; d text;
begin
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.create_product_draft_server(uuid, uuid, jsonb, jsonb)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef
    or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f'
    or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0
    or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null
    or b.proallargtypes is not null or b.prorettype<>'jsonb'::regtype
    or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
    or b.proargnames is distinct from array['p_session_id','p_request_id','p_reviewed_payload','p_field_decisions']::text[]
    or b.proacl::text[] is distinct from array['postgres=X/postgres']::text[]
    or b.proconfig is distinct from array['search_path=""']::text[]
    or md5(replace(b.prosrc,chr(13),'')) not in ('e0ae0726b5d19da69a023eb59bc98722','6d57157ff24897887116d326fcb437d1') then
  raise exception 'K2_IMPORTED_DRAFT_FUNCTION_DRIFT';
 end if;
 if md5(replace(b.prosrc,chr(13),''))='6d57157ff24897887116d326fcb437d1' then return;end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,b.prosrc,'')))/length(b.prosrc)<>1 then raise exception 'K2_IMPORTED_DRAFT_BODY_ANCHOR';end if;
 execute replace(d,b.prosrc,$body0$
declare
  v_session public.product_intake_sessions%rowtype;
  v_product jsonb;
  v_name text;
  v_sku text;
  v_slug text;
  v_product_id uuid;
  v_brand_id uuid;
  v_category_id uuid;
  v_identity_lock bigint;
  v_barcode text;
  v_target jsonb;
  v_before public.products;
  v_key text;
  v_alias text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception using errcode = '42501', message = 'K2_STAFF_REQUIRED';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception using errcode = '42501', message = 'K2_AAL2_REQUIRED';
  end if;
  if jsonb_typeof(p_reviewed_payload) is distinct from 'object'
     or jsonb_typeof(p_field_decisions) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'K2_INVALID_REVIEW_PAYLOAD';
  end if;

  -- Choose strongest mode before any session/product resource, including retry.
  if exists(select 1 from public.product_intake_sessions where id=p_session_id
    and field_provenance?'imported_draft_target') then
    perform k2_private.lock_category_policy_v1(true);
  end if;
  -- Saved Draft association: reauthorize and reread under the original session lock.
  select * into v_session from public.product_intake_sessions
  where id=p_session_id and status='active' and product_id is not null
    and (created_by=auth.uid() or public.is_admin());
  if found then
    select * into v_session from public.product_intake_sessions
    where id=p_session_id and status='active'
      and (created_by=auth.uid() or public.is_admin()) for update;
    if not found then raise exception using errcode='42501',message='K2_INTAKE_SESSION_NOT_FOUND';end if;
    if v_session.request_id is distinct from p_request_id then raise exception using errcode='22023',message='K2_REQUEST_ID_MISMATCH';end if;
    if v_session.product_id is null then
      raise exception using errcode='55000',message='K2_DRAFT_RETRY_STATE_CHANGED';
    end if;
    return jsonb_build_object('success',true,'idempotent',true,
      'product_id',v_session.product_id,'sku',v_session.assigned_sku);
  end if;
  -- New zero-stock Draft first assignment reads existing taxonomy; no taxonomy mutation.
  perform k2_private.lock_category_policy_v1(false);

  select * into v_session
  from public.product_intake_sessions
  where id = p_session_id
    and status = 'active'
    and (created_by = auth.uid() or public.is_admin())
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'K2_INTAKE_SESSION_NOT_FOUND';
  end if;
  if v_session.request_id is distinct from p_request_id then
    raise exception using errcode = '22023', message = 'K2_REQUEST_ID_MISMATCH';
  end if;
  if v_session.product_id is not null then
    return jsonb_build_object(
      'success', true, 'idempotent', true,
      'product_id', v_session.product_id, 'sku', v_session.assigned_sku
    );
  end if;
  if v_session.checklist_step <> 'draft_saved'
     or p_reviewed_payload -> 'meta' ->> 'schemaVersion' is distinct from 'k2.product-content.v3'
     or p_field_decisions ->> 'name' is distinct from 'accepted' then
    raise exception using errcode = '23514', message = 'K2_DRAFT_REVIEW_GATE_INCOMPLETE';
  end if;
  if octet_length(p_reviewed_payload::text) > 131072
     or octet_length(p_field_decisions::text) > 32768 then
    raise exception using errcode = '22023', message = 'K2_DRAFT_PAYLOAD_TOO_LARGE';
  end if;
  if (select count(*) from jsonb_array_elements(v_session.packaging_images) image
      where image ->> 'slot' in ('PRIMARY', 'BACK', 'BARCODE')
        and image ->> 'upload_status' = 'uploaded') <> 3
     or (select count(distinct image ->> 'slot') from jsonb_array_elements(v_session.packaging_images) image
         where image ->> 'slot' in ('PRIMARY', 'BACK', 'BARCODE')
           and image ->> 'upload_status' = 'uploaded') <> 3
     or coalesce(v_session.evidence_checklist ->> 'ingredients', '') <> 'true'
     or coalesce(v_session.evidence_checklist ->> 'allergens', '') <> 'true'
     or coalesce(v_session.evidence_checklist ->> 'storage', '') <> 'true'
     or coalesce(v_session.evidence_checklist ->> 'expiry', '') <> 'true' then
    raise exception using errcode = '23514', message = 'K2_EVIDENCE_GATE_INCOMPLETE';
  end if;

  v_target:=v_session.field_provenance->'imported_draft_target';
  if v_target is not null then
    if jsonb_typeof(v_target) is distinct from 'object'
       or coalesce(v_target->>'productId','')!~'^[0-9a-f-]{36}$'
       or coalesce(v_target->>'recordVersion','')!~'^[1-9][0-9]{0,18}$' then
      raise exception using errcode='22023',message='K2_IMPORTED_DRAFT_TARGET_INVALID';
    end if;
    perform k2_private.assert_imported_draft_target_v1((v_target->>'productId')::uuid,(v_target->>'recordVersion')::bigint);
    select * into v_before from public.products where id=(v_target->>'productId')::uuid;
    v_product_id:=v_before.id;
  end if;
  v_product := p_reviewed_payload -> 'product';
  if jsonb_typeof(v_product) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'K2_PRODUCT_OBJECT_REQUIRED';
  end if;
  v_name := nullif(trim(v_product ->> 'name'), '');
  if v_name is null or length(v_name) > 140 then
    raise exception using errcode = '22023', message = 'K2_PRODUCT_NAME_INVALID';
  end if;
  if coalesce(v_product ->> 'barcode', v_session.barcode) is not null
     and length(coalesce(v_product ->> 'barcode', v_session.barcode)) > 32 then
    raise exception using errcode = '22023', message = 'K2_BARCODE_INVALID';
  end if;
  v_barcode := nullif(trim(coalesce(v_product ->> 'barcode', v_session.barcode)), '');

  -- Cooperating fresh Draft identities: ordered locks precede duplicate reads/SKU.
  for v_identity_lock in
    select distinct identity_key from (values
      (pg_catalog.hashtextextended('k2.draft.name:' || lower(v_name), 0)),
      (case when v_barcode is not null
        then pg_catalog.hashtextextended('k2.draft.barcode:' || lower(v_barcode), 0)
        else null::bigint end)
    ) identities(identity_key) where identity_key is not null order by identity_key
  loop
    perform pg_catalog.pg_advisory_xact_lock(v_identity_lock);
  end loop;

  if exists (
    select 1 from public.products
    where id is distinct from v_product_id and barcode is not null
      and lower(trim(barcode)) = lower(v_barcode)
  ) then
    raise exception using errcode = '23505', message = 'K2_DUPLICATE_BARCODE';
  end if;
  if exists (select 1 from public.products where id is distinct from v_product_id and lower(name) = lower(v_name))
     and not coalesce((
       v_session.field_provenance -> 'duplicate_resolution' ->> 'decision' = 'confirmed_distinct_variant'
       and length(trim(coalesce(v_session.field_provenance -> 'duplicate_resolution' ->> 'reason', ''))) >= 10
     ),false) then
    raise exception using errcode = '23505', message = 'K2_DUPLICATE_NAME_REQUIRES_RESOLUTION';
  end if;

  select id into v_brand_id from public.brands
  where lower(name) = lower(nullif(trim(v_product ->> 'brand'), ''))
  order by created_at nulls last, id limit 1;
  select id into v_category_id from public.categories
  where lower(name) = lower(nullif(trim(v_product ->> 'category'), ''))
  order by created_at nulls last, id limit 1;

  if v_target is not null then
    -- Only explicit, present reviewed facts change; unknown/null text retains baseline.
    for v_key,v_alias in select * from (values ('short_name','short'),('description','inside'),('why_buy','whyBuy')) a(k,alias) loop
      if v_product?v_alias and p_field_decisions->>v_alias='accepted' then
        if v_product?v_key and v_product->v_key is distinct from v_product->v_alias then
          raise exception using errcode='22023',message='K2_IMPORTED_DRAFT_ALIAS_CONFLICT';
        end if;
        v_product:=v_product||jsonb_build_object(v_key,v_product->v_alias);
        p_field_decisions:=p_field_decisions||jsonb_build_object(v_key,'accepted');
      end if;
    end loop;
    for v_key in select jsonb_object_keys(v_product) loop
      if p_field_decisions->>v_key='accepted' then
        if v_key in ('seo_keywords','pairings') then
          if jsonb_typeof(v_product->v_key) is distinct from 'array'
             or exists(select 1 from jsonb_array_elements(v_product->v_key) x where jsonb_typeof(x)<>'string') then
            raise exception using errcode='22023',message='K2_IMPORTED_DRAFT_FIELD_INVALID';
          end if;
        elsif v_key in ('name','short_name','description','card_description','why_buy','usage_instructions','ingredients','allergens','storage_instructions','package_type','subcategory','origin','size','finished_product_details','short','inside','whyBuy') then
          if jsonb_typeof(v_product->v_key) not in ('string','null') then
            raise exception using errcode='22023',message='K2_IMPORTED_DRAFT_FIELD_INVALID';
          end if;
        elsif v_key='barcode' then
          if nullif(trim(v_product->>v_key),'') is distinct from v_before.barcode then
            raise exception using errcode='23514',message='K2_IMPORTED_DRAFT_IDENTITY_CHANGE_REFUSED';
          end if;
        elsif v_key not in ('brand','category','brand_id','net_weight','key_highlights','whyRare','why_rare','seo_title','meta_description','page_heading','supporting_heading','source_urls','review_notes','unknown_fields') then
          raise exception using errcode='22023',message='K2_IMPORTED_DRAFT_FIELD_INVALID';
        end if;
      end if;
    end loop;
    if (p_field_decisions->>'category'='accepted' and nullif(trim(v_product->>'category'),'') is not null
          and (v_category_id is null or (v_before.category_id is not null and v_before.category_id<>v_category_id)))
       or (p_field_decisions->>'brand'='accepted' and nullif(trim(v_product->>'brand'),'') is not null
          and (v_brand_id is null or (v_before.brand_id is not null and v_before.brand_id<>v_brand_id))) then
      raise exception using errcode='23514',message='K2_IMPORTED_DRAFT_TAXONOMY_CHANGE_REFUSED';
    end if;
    if p_field_decisions->>'category' is distinct from 'accepted' then v_category_id:=null;end if;
    if p_field_decisions->>'brand' is distinct from 'accepted' then v_brand_id:=null;end if;
    update public.products set name=case when p_field_decisions->>'name'='accepted' and jsonb_typeof(v_product->'name')='string' and nullif(trim(v_product->>'name'),'') is not null then trim(v_product->>'name') else name end,
      short_name=case when p_field_decisions->>'short_name'='accepted' and jsonb_typeof(v_product->'short_name')='string' and nullif(trim(v_product->>'short_name'),'') is not null then trim(v_product->>'short_name') else short_name end,
      description=case when p_field_decisions->>'description'='accepted' and jsonb_typeof(v_product->'description')='string' and nullif(trim(v_product->>'description'),'') is not null then trim(v_product->>'description') else description end,
      short_description=case when p_field_decisions->>'card_description'='accepted' and jsonb_typeof(v_product->'card_description')='string' and nullif(trim(v_product->>'card_description'),'') is not null then trim(v_product->>'card_description') else short_description end,
      why_buy=case when p_field_decisions->>'why_buy'='accepted' and jsonb_typeof(v_product->'why_buy')='string' and nullif(trim(v_product->>'why_buy'),'') is not null then trim(v_product->>'why_buy') else why_buy end,
      usage_instructions=case when p_field_decisions->>'usage_instructions'='accepted' and jsonb_typeof(v_product->'usage_instructions')='string' and nullif(trim(v_product->>'usage_instructions'),'') is not null then trim(v_product->>'usage_instructions') else usage_instructions end,
      ingredients=case when p_field_decisions->>'ingredients'='accepted' and jsonb_typeof(v_product->'ingredients')='string' and nullif(trim(v_product->>'ingredients'),'') is not null then trim(v_product->>'ingredients') else ingredients end,
      allergens=case when p_field_decisions->>'allergens'='accepted' and jsonb_typeof(v_product->'allergens')='string' and nullif(trim(v_product->>'allergens'),'') is not null then trim(v_product->>'allergens') else allergens end,
      storage_instructions=case when p_field_decisions->>'storage_instructions'='accepted' and jsonb_typeof(v_product->'storage_instructions')='string' and nullif(trim(v_product->>'storage_instructions'),'') is not null then trim(v_product->>'storage_instructions') else storage_instructions end,
      package_type=case when p_field_decisions->>'package_type'='accepted' and jsonb_typeof(v_product->'package_type')='string' and nullif(trim(v_product->>'package_type'),'') is not null then trim(v_product->>'package_type') else package_type end,
      subcategory=case when p_field_decisions->>'subcategory'='accepted' and jsonb_typeof(v_product->'subcategory')='string' and nullif(trim(v_product->>'subcategory'),'') is not null then trim(v_product->>'subcategory') else subcategory end,
      origin=case when p_field_decisions->>'origin'='accepted' and jsonb_typeof(v_product->'origin')='string' and nullif(trim(v_product->>'origin'),'') is not null then trim(v_product->>'origin') else origin end,
      size=case when p_field_decisions->>'size'='accepted' and jsonb_typeof(v_product->'size')='string' and nullif(trim(v_product->>'size'),'') is not null then trim(v_product->>'size') else size end,
      finished_product_details=case when p_field_decisions->>'finished_product_details'='accepted' and jsonb_typeof(v_product->'finished_product_details')='string' and nullif(trim(v_product->>'finished_product_details'),'') is not null then trim(v_product->>'finished_product_details') else finished_product_details end,
      country_of_origin=case when p_field_decisions->>'origin'='accepted' and jsonb_typeof(v_product->'origin')='string' and nullif(trim(v_product->>'origin'),'') is not null then trim(v_product->>'origin') else country_of_origin end,
      seo_keywords=case when p_field_decisions->>'seo_keywords'='accepted' and v_product?'seo_keywords' then array(select jsonb_array_elements_text(v_product->'seo_keywords')) else seo_keywords end,
      pairings=case when p_field_decisions->>'pairings'='accepted' and v_product?'pairings' then array(select jsonb_array_elements_text(v_product->'pairings')) else pairings end,
      brand_id=coalesce(brand_id,v_brand_id),
      category_id=coalesce(category_id,v_category_id) where id=v_product_id;
    v_sku:=v_before.sku;
    insert into public.audit_logs(table_name,record_id,action,old_data,new_data,user_id)
    select 'products',v_product_id::text,'UPDATE',to_jsonb(v_before),to_jsonb(p)||jsonb_build_object(
      'operation','REVIEW_IMPORTED_DRAFT','intake_session_id',p_session_id),auth.uid()
    from public.products p where id=v_product_id;
  else
  v_sku := public.generate_k2_sku_internal();
  v_slug := lower(trim(both '-' from regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g')))
    || '-' || lower(right(v_sku, 6));

  insert into public.products (
    sku, barcode, name, short_name, brand_id, category_id, status, published,
    description, short_description, why_buy, usage_instructions, ingredients,
    allergens, seo_keywords, package_type, subcategory, origin,
    storage_instructions, finished_product_details, pairings, size, slug,
    is_ai_generated, is_human_reviewed, internal_notes, created_at, updated_at
  ) values (
    v_sku,
    v_barcode,
    v_name,
    nullif(trim(coalesce(v_product ->> 'short', v_product ->> 'short_name')), ''),
    v_brand_id,
    v_category_id,
    'Draft',
    false,
    nullif(trim(coalesce(v_product ->> 'description', v_product ->> 'inside')), ''),
    nullif(trim(v_product ->> 'card_description'), ''),
    nullif(trim(coalesce(v_product ->> 'why_buy', v_product ->> 'whyBuy')), ''),
    nullif(trim(v_product ->> 'usage_instructions'), ''),
    nullif(trim(v_product ->> 'ingredients'), ''),
    nullif(trim(v_product ->> 'allergens'), ''),
    case when jsonb_typeof(v_product -> 'seo_keywords') = 'array'
      then array(select jsonb_array_elements_text(v_product -> 'seo_keywords'))
      else '{}'::text[] end,
    nullif(trim(v_product ->> 'package_type'), ''),
    nullif(trim(v_product ->> 'subcategory'), ''),
    nullif(trim(v_product ->> 'origin'), ''),
    nullif(trim(v_product ->> 'storage_instructions'), ''),
    nullif(trim(v_product ->> 'finished_product_details'), ''),
    case when jsonb_typeof(v_product -> 'pairings') = 'array'
      then array(select jsonb_array_elements_text(v_product -> 'pairings'))
      else '{}'::text[] end,
    nullif(trim(v_product ->> 'size'), ''),
    v_slug,
    true,
    false,
    'Created through reviewed product intake ' || p_session_id::text,
    now(),
    now()
  ) returning id into v_product_id;

  end if;

  update public.product_intake_sessions set
    draft_payload = p_reviewed_payload,
    field_decisions = p_field_decisions,
    field_provenance = coalesce(v_session.field_provenance, '{}'::jsonb) || jsonb_build_object(
      'sources', coalesce(p_reviewed_payload -> 'meta' -> 'sources', '[]'::jsonb),
      'schema_version', p_reviewed_payload -> 'meta' -> 'schemaVersion'
    ),
    unknown_fields = case
      when jsonb_typeof(p_reviewed_payload -> 'meta' -> 'unknownFields') = 'array'
      then array(select jsonb_array_elements_text(p_reviewed_payload -> 'meta' -> 'unknownFields'))
      else '{}'::text[] end,
    assigned_sku = v_sku,
    product_id = v_product_id,
    checklist_step = 'first_inventory'
  where id = p_session_id;

  if v_target is null then
  insert into public.audit_logs (
    table_name, record_id, action, old_data, new_data, user_id
  ) values (
    'products', v_product_id::text, 'INSERT', null,
    jsonb_build_object(
      'operation', 'CREATE_PRODUCT_DRAFT',
      'sku', v_sku, 'status', 'Draft', 'intake_session_id', p_session_id,
      'brand_resolved', v_brand_id is not null,
      'category_resolved', v_category_id is not null
    ),
    auth.uid()
  );

  end if;
  return jsonb_build_object(
    'success', true, 'idempotent', false,
    'product_id', v_product_id, 'sku', v_sku, 'status', 'Draft'
  );
end;
$body0$);
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc')
    or md5(replace(a.prosrc,chr(13),''))<>'6d57157ff24897887116d326fcb437d1' then raise exception 'K2_IMPORTED_DRAFT_METADATA_CHANGED';end if;
end $patch0$;
do $patch1$
declare b pg_catalog.pg_proc%rowtype; a pg_catalog.pg_proc%rowtype; d text;
begin
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.execute_admin_product_intake_command_v1(text, bigint, uuid, uuid, text, text)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef
    or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f'
    or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0
    or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null
    or b.proallargtypes is not null or b.prorettype<>'jsonb'::regtype
    or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
    or b.proargnames is distinct from array['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']::text[]
    or b.proacl::text[] is distinct from array['postgres=X/postgres','authenticated=X/postgres']::text[]
    or b.proconfig is distinct from array['search_path=""']::text[]
    or md5(replace(b.prosrc,chr(13),'')) not in ('d0c8b9094f90c57f1893fca4d4c91806','e5c587b3fceed033defc2c87c70e7c51') then
  raise exception 'K2_IMPORTED_DRAFT_FUNCTION_DRIFT';
 end if;
 if md5(replace(b.prosrc,chr(13),''))='e5c587b3fceed033defc2c87c70e7c51' then return;end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,b.prosrc,'')))/length(b.prosrc)<>1 then raise exception 'K2_IMPORTED_DRAFT_BODY_ANCHOR';end if;
 execute replace(d,b.prosrc,$body1$
declare
  v_actor uuid := auth.uid();
  v_payload jsonb;
  v_patch jsonb;
  v_payload_hash text;
  v_existing k2_private.admin_command_receipts;
  v_session public.product_intake_sessions;
  v_result jsonb;
  v_recent_count integer;
  v_inserted integer;
  v_limit integer;
  v_source text;
  v_inventory jsonb;
  v_quantity integer;
  v_unit_cost numeric;
  v_target jsonb;
begin
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then
    raise exception using errcode='28000', message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  if p_action not in (
    'intake_session_create','intake_session_step','intake_draft',
    'intake_inventory','intake_publication','intake_evidence_register'
  ) then
    raise exception using errcode='22023', message='K2_ADMIN_ACTION_INVALID';
  end if;
  v_payload := p_payload_text::jsonb;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
  end if;
  if p_action='intake_draft' or (p_action='intake_session_create' and v_payload?'existingProduct') then
    perform k2_private.lock_category_policy_v1(true);
  end if;
  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');

  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash <> v_payload_hash then
      raise exception using errcode='22023', message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.result is null then
      raise exception using errcode='55000', message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;

  v_limit := case when p_action='intake_session_step' then 120 else 30 end;
  select count(*)::integer into v_recent_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_recent_count>=v_limit then
    raise exception using errcode='54000', message='K2_ADMIN_RATE_LIMITED';
  end if;

  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_payload_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_existing from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
    if v_existing.payload_hash<>v_payload_hash then
      raise exception using errcode='22023', message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.result is null then
      raise exception using errcode='55000', message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;

  if p_action='intake_evidence_register' then
    if (v_payload-array[
      'sessionId','slot','path','fileName','size','type','width','height','sha256'
    ])<>'{}'::jsonb
       or coalesce(v_payload->>'slot','') not in ('PRIMARY','BACK','BARCODE')
       or coalesce(v_payload->>'type','') not in ('image/jpeg','image/png','image/webp')
       or (v_payload->>'size')::integer not between 1 and 10485760
       or (v_payload->>'width')::integer not between 100 and 12000
       or (v_payload->>'height')::integer not between 100 and 12000
       or (v_payload->>'width')::bigint*(v_payload->>'height')::bigint>40000000
       or coalesce(v_payload->>'sha256','')!~'^[0-9a-f]{64}$'
       or coalesce(v_payload->>'sessionId','')!~'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or length(coalesce(v_payload->>'fileName',''))>120
       or v_payload->>'path' !~ ('^'||v_actor::text||'/'||(v_payload->>'sessionId')||'/'||lower(v_payload->>'slot')||'-[0-9a-f-]{36}-[0-9a-f]{16}[.](jpg|png|webp)$') then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_session from public.product_intake_sessions
    where id=(v_payload->>'sessionId')::uuid and status='active'
      and (created_by=v_actor or public.is_admin()) for update;
    if not found then
      raise exception using errcode='42501', message='K2_INTAKE_SESSION_NOT_FOUND';
    end if;
    update public.product_intake_sessions set packaging_images=(
      select coalesce(jsonb_agg(item),'[]'::jsonb)
      from jsonb_array_elements(packaging_images) item
      where item->>'slot'<>v_payload->>'slot'
    )||jsonb_build_array(jsonb_build_object(
      'slot',v_payload->>'slot','path',v_payload->>'path','name',v_payload->>'fileName',
      'size',(v_payload->>'size')::integer,'type',v_payload->>'type',
      'width',(v_payload->>'width')::integer,'height',(v_payload->>'height')::integer,
      'sha256',v_payload->>'sha256','upload_status','uploaded','uploaded_at',now()
    )) where id=v_session.id returning * into v_session;
    v_result:=jsonb_build_object(
      'sessionId',v_session.id,'slot',v_payload->>'slot','path',v_payload->>'path',
      'size',(v_payload->>'size')::integer,'type',v_payload->>'type',
      'width',(v_payload->>'width')::integer,'height',(v_payload->>'height')::integer,
      'sha256',v_payload->>'sha256','uploadStatus','uploaded'
    );

  elsif p_action='intake_session_create' then
    if (v_payload-array['requestId','barcode','scannedIdentity','existingProduct'])<>'{}'::jsonb
       or length(coalesce(v_payload->>'barcode',''))>32
       or length(coalesce(v_payload->>'scannedIdentity',''))>240 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    if v_payload?'existingProduct' then
      if jsonb_typeof(v_payload->'existingProduct') is distinct from 'object'
         or ((v_payload->'existingProduct')-array['productId','recordVersion'])<>'{}'::jsonb
         or coalesce(v_payload->'existingProduct'->>'productId','')!~'^[0-9a-f-]{36}$'
         or jsonb_typeof(v_payload->'existingProduct'->'recordVersion') is distinct from 'string'
         or coalesce(v_payload->'existingProduct'->>'recordVersion','')!~'^[1-9][0-9]{0,18}$' then
        raise exception using errcode='22023',message='K2_IMPORTED_DRAFT_TARGET_INVALID';
      end if;
      v_target:=k2_private.assert_imported_draft_target_v1(
        (v_payload->'existingProduct'->>'productId')::uuid,(v_payload->'existingProduct'->>'recordVersion')::bigint);
    end if;
    insert into public.product_intake_sessions(
      request_id,barcode,scanned_identity,checklist_step,packaging_images,
      draft_payload,field_decisions,field_provenance,unknown_fields,created_by
    ) values (
      (v_payload->>'requestId')::uuid,nullif(v_payload->>'barcode',''),
      coalesce(v_payload->>'scannedIdentity',''),'identify','[]'::jsonb,
      case when v_target is null then '{}'::jsonb else jsonb_build_object(
        'meta',jsonb_build_object('schemaVersion','k2.product-content.v3','evidenceCount',0),'product',v_target->'product') end,
      '{}'::jsonb,case when v_target is null then '{}'::jsonb else jsonb_build_object('imported_draft_target',v_target) end,'{}'::text[],v_actor
    ) on conflict(request_id) do nothing;
    select * into v_session from public.product_intake_sessions
    where request_id=(v_payload->>'requestId')::uuid
      and (created_by=v_actor or public.is_admin());
    if not found then
      raise exception using errcode='23505', message='K2_INTAKE_REQUEST_CONFLICT';
    end if;
    if (v_session.field_provenance->'imported_draft_target'->>'productId') is distinct from (v_target->>'productId')
       or (v_session.field_provenance->'imported_draft_target'->>'recordVersion') is distinct from (v_target->>'recordVersion') then
      raise exception using errcode='23505',message='K2_INTAKE_REQUEST_CONFLICT';
    end if;
    v_result:=jsonb_build_object(
      'sessionId',v_session.id,'requestId',v_session.request_id,
      'step',v_session.checklist_step,'status',v_session.status
    );

  elsif p_action='intake_session_step' then
    if (v_payload-array['sessionId','step','patch'])<>'{}'::jsonb
       or coalesce(v_payload->>'step','') not in (
         'identify','packaging_evidence','research_handoff','field_review',
         'draft_saved','first_inventory','publication_review','completed'
       ) or jsonb_typeof(v_payload->'patch')<>'object' then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_patch:=v_payload->'patch';
    if (v_patch->'fieldProvenance')?'imported_draft_target' then
      raise exception using errcode='22023',message='K2_IMPORTED_DRAFT_TARGET_IMMUTABLE';
    end if;
    if (v_patch-array[
      'barcode','scannedIdentity','categoryType','evidenceChecklist',
      'draftPayload','fieldDecisions','fieldProvenance','unknownFields'
    ])<>'{}'::jsonb
       or (v_patch?'barcode' and length(coalesce(v_patch->>'barcode',''))>32)
       or (v_patch?'scannedIdentity' and length(coalesce(v_patch->>'scannedIdentity',''))>240)
       or (v_patch?'categoryType' and nullif(coalesce(v_patch->>'categoryType',''),'') is not null
         and coalesce(v_patch->>'categoryType','') not in ('food','beauty','household'))
       or (v_patch?'evidenceChecklist' and (jsonb_typeof(v_patch->'evidenceChecklist')<>'object' or octet_length((v_patch->'evidenceChecklist')::text)>8192))
       or (v_patch?'draftPayload' and (jsonb_typeof(v_patch->'draftPayload')<>'object' or octet_length((v_patch->'draftPayload')::text)>131072))
       or (v_patch?'fieldDecisions' and (jsonb_typeof(v_patch->'fieldDecisions')<>'object' or octet_length((v_patch->'fieldDecisions')::text)>32768))
       or (v_patch?'fieldProvenance' and (jsonb_typeof(v_patch->'fieldProvenance')<>'object' or octet_length((v_patch->'fieldProvenance')::text)>32768))
       or (v_patch?'unknownFields' and (
         jsonb_typeof(v_patch->'unknownFields')<>'array'
         or jsonb_array_length(v_patch->'unknownFields')>100
         or exists(select 1 from jsonb_array_elements_text(v_patch->'unknownFields') item where length(item)>200)
       )) then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select * into v_session from public.product_intake_sessions
    where id=(v_payload->>'sessionId')::uuid and status='active'
      and (created_by=v_actor or public.is_admin()) for update;
    if not found then
      raise exception using errcode='42501', message='K2_INTAKE_SESSION_NOT_FOUND';
    end if;
    if not (
      v_session.checklist_step=v_payload->>'step'
      or (v_session.checklist_step,v_payload->>'step') in (
        ('identify','packaging_evidence'),
        ('packaging_evidence','research_handoff'),
        ('research_handoff','field_review'),
        ('field_review','draft_saved')
      )
    ) then
      raise exception using errcode='23514', message='K2_INTAKE_STEP_INVALID';
    end if;
    update public.product_intake_sessions set
      checklist_step=v_payload->>'step',
      barcode=case when v_patch?'barcode' then nullif(v_patch->>'barcode','') else barcode end,
      scanned_identity=case when v_patch?'scannedIdentity' then coalesce(v_patch->>'scannedIdentity','') else scanned_identity end,
      category_type=case when v_patch?'categoryType' then nullif(v_patch->>'categoryType','') else category_type end,
      evidence_checklist=case when v_patch?'evidenceChecklist' then v_patch->'evidenceChecklist' else evidence_checklist end,
      draft_payload=case when v_patch?'draftPayload' then v_patch->'draftPayload' else draft_payload end,
      field_decisions=case when v_patch?'fieldDecisions' then v_patch->'fieldDecisions' else field_decisions end,
      field_provenance=case when v_patch?'fieldProvenance' then v_patch->'fieldProvenance'||case when field_provenance?'imported_draft_target'
        then jsonb_build_object('imported_draft_target',field_provenance->'imported_draft_target') else '{}'::jsonb end else field_provenance end,
      unknown_fields=case when v_patch?'unknownFields' then array(select jsonb_array_elements_text(v_patch->'unknownFields')) else unknown_fields end
    where id=v_session.id returning * into v_session;
    v_result:=jsonb_build_object('sessionId',v_session.id,'step',v_session.checklist_step,'updatedAt',v_session.updated_at);

  elsif p_action='intake_draft' then
    if (v_payload-array['sessionId','requestId','reviewedPayload','fieldDecisions'])<>'{}'::jsonb
       or jsonb_typeof(v_payload->'reviewedPayload')<>'object'
       or jsonb_typeof(v_payload->'fieldDecisions')<>'object'
       or octet_length((v_payload->'reviewedPayload')::text)>131072
       or octet_length((v_payload->'fieldDecisions')::text)>32768 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_result:=public.create_product_draft_server(
      (v_payload->>'sessionId')::uuid,(v_payload->>'requestId')::uuid,
      v_payload->'reviewedPayload',v_payload->'fieldDecisions'
    );

  elsif p_action='intake_inventory' then
    if (v_payload-array['sessionId','inventoryRequestId','source','inventory'])<>'{}'::jsonb
       or coalesce(v_payload->>'source','') not in ('flight','reconciliation')
       or jsonb_typeof(v_payload->'inventory')<>'object' then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_source:=v_payload->>'source';
    v_inventory:=v_payload->'inventory';
    if (v_source='flight' and (v_inventory-array[
         'quantity','boxCode','batchCode','expiryDate','isNonExpiry','unitCost','consignmentId'
       ])<>'{}'::jsonb)
       or (v_source='reconciliation' and (v_inventory-array[
         'quantity','boxCode','batchCode','expiryDate','isNonExpiry','unitCost',
         'ownerCode','hubLocation','custodian','reason'
       ])<>'{}'::jsonb) then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_quantity:=(v_inventory->>'quantity')::integer;
    v_unit_cost:=(v_inventory->>'unitCost')::numeric;
    if v_quantity not between 1 and 100000
       or v_unit_cost not between 0 and 10000000
       or jsonb_typeof(v_inventory->'isNonExpiry')<>'boolean'
       or length(trim(coalesce(v_inventory->>'boxCode',''))) not between 1 and 120
       or length(trim(coalesce(v_inventory->>'batchCode',''))) not between 1 and 120
       or (coalesce((v_inventory->>'isNonExpiry')::boolean,false)=false and nullif(v_inventory->>'expiryDate','') is null)
       or (v_source='flight' and (v_inventory->>'isNonExpiry')::boolean=true)
       or (v_source='reconciliation' and (
         length(trim(coalesce(v_inventory->>'ownerCode',''))) not between 1 and 120
         or length(trim(coalesce(v_inventory->>'hubLocation',''))) not between 1 and 120
         or length(trim(coalesce(v_inventory->>'custodian',''))) not between 1 and 120
         or length(trim(coalesce(v_inventory->>'reason',''))) not between 1 and 1000
         or not exists (
           select 1 from public.hubs h
           where h.id=trim(v_inventory->>'hubLocation')
         )
         or not exists (
           select 1 from public.custodians c
           where c.id=trim(v_inventory->>'custodian')
             and c.hub_id=trim(v_inventory->>'hubLocation')
         )
       )) then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_result:=public.create_product_first_inventory_server(
      (v_payload->>'sessionId')::uuid,(v_payload->>'inventoryRequestId')::uuid,
      v_source,v_inventory
    );

  else
    if (v_payload-array['sessionId','requestedStatus','reason'])<>'{}'::jsonb
       or coalesce(v_payload->>'requestedStatus','') not in ('draft','under_review','live','unlisted','discontinued')
       or length(trim(coalesce(v_payload->>'reason',''))) not between 1 and 500 then
      raise exception using errcode='22023', message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_result:=public.transition_product_publication_server(
      (v_payload->>'sessionId')::uuid,v_payload->>'requestedStatus'
    );
    insert into public.audit_logs(table_name,record_id,action,old_data,new_data,user_id)
    values(
      'products',v_result->>'product_id','UPDATE',null,
      jsonb_build_object(
        'operation', 'PRODUCT_PUBLICATION_REASON',
        'intake_session_id',v_payload->>'sessionId',
        'requested_status',v_payload->>'requestedStatus',
        'reason',trim(v_payload->>'reason')
      ),v_actor
    );
  end if;

  update k2_private.admin_command_receipts set result=v_result,completed_at=now()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
end;
$body1$);
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc')
    or md5(replace(a.prosrc,chr(13),''))<>'e5c587b3fceed033defc2c87c70e7c51' then raise exception 'K2_IMPORTED_DRAFT_METADATA_CHANGED';end if;
end $patch1$;
do $patch2$
declare b pg_catalog.pg_proc%rowtype; a pg_catalog.pg_proc%rowtype; d text;
begin
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure('public.execute_admin_intake_ai_v1(text, bigint, uuid, uuid, text, text)');
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef
    or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f'
    or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0
    or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null
    or b.proallargtypes is not null or b.prorettype<>'jsonb'::regtype
    or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
    or b.proargnames is distinct from array['p_action','p_timestamp','p_nonce','p_idempotency_key','p_payload_text','p_signature']::text[]
    or b.proacl::text[] is distinct from array['postgres=X/postgres','authenticated=X/postgres']::text[]
    or b.proconfig is distinct from array['search_path=""']::text[]
    or md5(replace(b.prosrc,chr(13),'')) not in ('acde04b0dbcaa3b5c02283c63a185320','3d8d22c4936bd7792dcd850037e98c52') then
  raise exception 'K2_IMPORTED_DRAFT_FUNCTION_DRIFT';
 end if;
 if md5(replace(b.prosrc,chr(13),''))='3d8d22c4936bd7792dcd850037e98c52' then return;end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,b.prosrc,'')))/length(b.prosrc)<>1 then raise exception 'K2_IMPORTED_DRAFT_BODY_ANCHOR';end if;
 execute replace(d,b.prosrc,$body2$
declare
  v_actor uuid:=auth.uid(); v_payload jsonb; v_session public.product_intake_sessions;
  v_job k2_private.intake_ai_jobs; v_config k2_private.ai_spend_control_config;
  v_secret bytea; v_hash text; v_expected text; v_hits integer; v_bucket timestamptz;
  v_kind text; v_cost bigint; v_session_spend bigint; v_month_spend bigint; v_product_spend bigint;
  v_product_key text; v_jobs jsonb; v_ready boolean; v_evidence jsonb;
  v_product public.products; v_assignment jsonb; v_media jsonb; v_attached jsonb;
begin
  if v_actor is null or not public.is_staff() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='AI_JOB_UNAVAILABLE';
  end if;
  if p_action is null or p_action not in ('intake_ai_read','intake_ai_claim','intake_ai_complete','intake_ai_review','intake_ai_attach','intake_ai_candidate')
    or p_timestamp is null or p_nonce is null or p_idempotency_key is null
    or p_payload_text is null or octet_length(p_payload_text)>6000000
    or p_signature is null or p_signature !~ '^[a-f0-9]{64}$'
    or abs(extract(epoch from clock_timestamp())::bigint-p_timestamp)>300 then
    raise exception 'AI_JOB_UNAVAILABLE';
  end if;
  select request_secret into v_secret from k2_private.admin_bff_secrets where singleton;
  if v_secret is null then raise exception 'AI_JOB_UNAVAILABLE'; end if;
  v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  v_expected:=encode(extensions.hmac(convert_to(p_action||E'\n'||p_timestamp::text||E'\n'||p_nonce::text||E'\n'||v_actor::text||E'\n'||p_idempotency_key::text||E'\n'||v_hash,'UTF8'),v_secret,'sha256'),'hex');
  if extensions.digest(v_expected,'sha256')<>extensions.digest(p_signature,'sha256') then raise exception 'AI_JOB_UNAVAILABLE'; end if;
  insert into k2_private.admin_request_nonces(actor_id,action,nonce,expires_at)
    values(v_actor,p_action,p_nonce,now()+interval '10 minutes') on conflict do nothing;
  if not found then raise exception 'AI_JOB_UNAVAILABLE'; end if;
  v_bucket:=date_trunc('minute',clock_timestamp());
  insert into k2_private.admin_request_rate_buckets(scope,subject,bucket_start,hit_count)
    values('actor','intake-ai:'||v_actor::text,v_bucket,1)
    on conflict(scope,subject,bucket_start) do update set hit_count=k2_private.admin_request_rate_buckets.hit_count+1 returning hit_count into v_hits;
  if v_hits>60 then raise exception 'AI_JOB_UNAVAILABLE'; end if;
  v_payload:=p_payload_text::jsonb;
  -- Ownership is intentionally stricter than ordinary Admin reads.
  select * into v_session from public.product_intake_sessions
    where id=(v_payload->>'sessionId')::uuid and created_by=v_actor for update;
  if not found then raise exception using errcode='42501',message='AI_JOB_UNAVAILABLE'; end if;
  if v_session.field_provenance?'imported_draft_target' and (
      (p_action='intake_ai_claim' and v_payload->>'kind' in ('PRIMARY','AFTER'))
      or p_action='intake_ai_attach') then
    raise exception using errcode='42501',message='AI_REVIEW_REQUIRED';
  end if;
  v_product_key:=lower(trim(coalesce(nullif(v_session.barcode,''),nullif(v_session.scanned_identity,''),v_session.id::text)));
  select * into v_config from k2_private.ai_spend_control_config where config_key='default' for update;
  select coalesce(sum(reserved_usd_micros),0) into v_session_spend from k2_private.intake_ai_jobs where session_id=v_session.id;
  select coalesce(sum(reserved_usd_micros),0) into v_product_spend from k2_private.intake_ai_jobs where product_key=v_product_key;
  select coalesce(sum(reserved_usd_micros),0) into v_month_spend from k2_private.intake_ai_jobs where created_at>=date_trunc('month',clock_timestamp() at time zone 'UTC') at time zone 'UTC';
  v_ready:=coalesce(v_config.paid_path_enabled and v_config.provider_model_snapshot='gpt-4.1-mini-2025-04-14+gpt-image-1:k2.intake-ai.2026-09-06'
    and v_config.per_product_usd_micros>v_product_spend and v_config.per_session_usd_micros>v_session_spend and v_config.monthly_usd_micros>v_month_spend,false);
  if p_action='intake_ai_read' then
    select coalesce(jsonb_agg((to_jsonb(j)-'evidence'-'reviewed_content')#-'{result,image}' order by j.created_at),'[]'::jsonb) into v_jobs
      from k2_private.intake_ai_jobs j where session_id=v_session.id;
    return jsonb_build_object('jobs',v_jobs,'productId',v_session.product_id,'budget',jsonb_build_object('ready',v_ready,'sessionReserved',v_session_spend,'productReserved',v_product_spend,'monthReserved',v_month_spend,'perSessionCap',v_config.per_session_usd_micros,'perProductCap',v_config.per_product_usd_micros,'monthlyCap',v_config.monthly_usd_micros));
  end if;
  if p_action='intake_ai_claim' then
    v_kind:=v_payload->>'kind';
    if v_kind is null or v_kind not in ('content','PRIMARY','AFTER') or v_payload->>'confirmation' is distinct from 'CONFIRM_PAID_INTAKE'
      or v_payload->>'version' is distinct from 'k2.intake-ai.2026-09-06' then raise exception 'AI_JOB_CONFLICT'; end if;
    select * into v_job from k2_private.intake_ai_jobs where session_id=v_session.id and kind=v_kind;
    if found then return jsonb_build_object('dispatch',false,'job',to_jsonb(v_job)-'evidence'-'reviewed_content'); end if;
    if exists(select 1 from k2_private.intake_ai_jobs where actor_id=v_actor and request_id=p_idempotency_key) then raise exception 'AI_JOB_CONFLICT'; end if;
    if exists(select 1 from k2_private.intake_ai_jobs where session_id=v_session.id and status='dispatched') then raise exception 'AI_JOB_CONFLICT'; end if;
    if v_session.status<>'active' or v_session.product_id is not null then raise exception 'AI_JOB_CONFLICT'; end if;
    if not v_ready then raise exception 'AI_BUDGET_BLOCKED'; end if;
    v_cost:=case when v_kind='content' then 100000 else 1000000 end;
    if v_product_spend+v_cost>v_config.per_product_usd_micros or v_session_spend+v_cost>v_config.per_session_usd_micros or v_month_spend+v_cost>v_config.monthly_usd_micros then raise exception 'AI_BUDGET_BLOCKED'; end if;
    v_evidence:=v_session.packaging_images;
    if jsonb_array_length(v_evidence) not between 1 and 3
      or not exists(select 1 from jsonb_array_elements(v_evidence) e where e->>'slot'='PRIMARY')
      or exists(select 1 from jsonb_array_elements(v_evidence) e where e->>'path' not like v_actor::text||'/'||v_session.id::text||'/%' or e->>'sha256' is null)
      or v_session.checklist_step not in ('research_handoff','field_review','draft_saved') then raise exception 'AI_EVIDENCE_REQUIRED'; end if;
    if v_kind<>'content' and (v_session.field_decisions->>'name' is distinct from 'accepted'
      or nullif(v_session.draft_payload->'product'->>'name','') is null
      or length(trim(coalesce(v_payload->>'brief',''))) not between 8 and 1500) then raise exception 'AI_REVIEW_REQUIRED'; end if;
    insert into k2_private.intake_ai_jobs(session_id,actor_id,request_id,kind,product_key,version,evidence,reviewed_content,brief,reserved_usd_micros)
      values(v_session.id,v_actor,p_idempotency_key,v_kind,v_product_key,v_payload->>'version',v_evidence,v_session.draft_payload,coalesce(v_payload->>'brief',''),v_cost) returning * into v_job;
    return jsonb_build_object('dispatch',true,'job',to_jsonb(v_job)-'evidence'-'reviewed_content','evidence',v_evidence);
  end if;
  select * into v_job from k2_private.intake_ai_jobs where id=(v_payload->>'jobId')::uuid and session_id=v_session.id for update;
  if not found then raise exception 'AI_JOB_UNAVAILABLE'; end if;
  if p_action='intake_ai_candidate' then
    if v_job.kind='content' or v_job.status<>'completed' then raise exception 'AI_JOB_UNAVAILABLE'; end if;
    return jsonb_build_object('job',to_jsonb(v_job)-'evidence'-'reviewed_content');
  end if;
  if p_action='intake_ai_complete' then
    if v_job.request_id<>p_idempotency_key then raise exception 'AI_JOB_CONFLICT'; end if;
    if v_job.status='dispatched' then
      if v_payload->>'failure' is null and (jsonb_typeof(v_payload->'result') is distinct from 'object') then raise exception 'AI_JOB_CONFLICT'; end if;
      update k2_private.intake_ai_jobs set result=nullif(v_payload->'result','null'::jsonb),failure=left(v_payload->>'failure',80),
        status=case when v_payload->>'failure' is null then 'completed' else 'failed' end,
        latency_ms=(v_payload->>'latencyMs')::bigint,completed_at=clock_timestamp() where id=v_job.id returning * into v_job;
    end if;
  elsif p_action='intake_ai_attach' then
    if v_job.attachment_result is not null then return jsonb_build_object('job',to_jsonb(v_job)-'evidence'-'reviewed_content'); end if;
    if v_job.decision is distinct from 'accepted' or v_job.kind='content' or v_session.product_id is null then raise exception 'AI_REVIEW_REQUIRED'; end if;
    select * into v_product from public.products where id=v_session.product_id for update;
    if not found or v_product.sku is distinct from v_payload->'before'->>'sku'
      or v_product.primary_image_url is distinct from v_payload->'before'->>'primary_image_url'
      or coalesce(to_jsonb(v_product.lifestyle_images),'[]'::jsonb) is distinct from coalesce(nullif(v_payload->'before'->'lifestyle_images','null'::jsonb),'[]'::jsonb)
      or coalesce(to_jsonb(v_product.secondary_images),'[]'::jsonb) is distinct from coalesce(nullif(v_payload->'before'->'secondary_images','null'::jsonb),'[]'::jsonb) then raise exception 'AI_JOB_CONFLICT'; end if;
    v_assignment:=v_payload->'assignment';
    v_media:=(v_assignment->>'p_payload_text')::jsonb;
    if v_assignment->>'p_action' is distinct from 'product_media_assign' or v_assignment->>'p_idempotency_key' is distinct from v_job.id::text or v_media->>'sku' is distinct from v_product.sku then raise exception 'AI_JOB_CONFLICT'; end if;
    -- Existing signed media commands alone register/attach canonical assets.
    v_attached:=public.execute_admin_product_media_assignment_v1(v_assignment->>'p_action',(v_assignment->>'p_timestamp')::bigint,(v_assignment->>'p_nonce')::uuid,(v_assignment->>'p_idempotency_key')::uuid,v_assignment->>'p_payload_text',v_assignment->>'p_signature');
    update k2_private.intake_ai_jobs set attachment_result=v_attached where id=v_job.id returning * into v_job;
  elsif p_action='intake_ai_review' then
    if v_job.status<>'completed' or v_job.kind='content'
      or v_payload->>'decision' is null or v_payload->>'decision' not in ('accepted','rejected')
      or length(trim(coalesce(v_payload->>'reason',''))) not between 8 and 500 then raise exception 'AI_REVIEW_REQUIRED'; end if;
    if v_job.decision is not null and v_job.decision<>v_payload->>'decision' then raise exception 'AI_JOB_CONFLICT'; end if;
    update k2_private.intake_ai_jobs set decision=v_payload->>'decision',review_reason=v_payload->>'reason',reviewed_at=coalesce(reviewed_at,clock_timestamp()) where id=v_job.id returning * into v_job;
  end if;
  return jsonb_build_object('job',(to_jsonb(v_job)-'evidence'-'reviewed_content')#-'{result,image}');
end;
$body2$);
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc')
    or md5(replace(a.prosrc,chr(13),''))<>'3d8d22c4936bd7792dcd850037e98c52' then raise exception 'K2_IMPORTED_DRAFT_METADATA_CHANGED';end if;
end $patch2$;
commit;
