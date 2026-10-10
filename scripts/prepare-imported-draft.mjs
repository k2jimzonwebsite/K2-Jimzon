// MAP-018: deterministic, guarded preparation. Does not connect to a database.
import fs from 'node:fs'
import { createHash } from 'node:crypto'
const sha = s => createHash('sha256').update(s).digest('hex')
const md5 = s => createHash('md5').update(s).digest('hex')
const q = s => "'" + String(s).replaceAll("'", "''") + "'"
const capture = 'docs/evidence/20261004-category-shelf-life/foundation-qualified-schema-guest-checkout-legacy-review07/metadata-388.json'
const bytes = fs.readFileSync(capture)
if (sha(bytes) !== 'c9babb44aa95790f0d5a7efc7fcd4aac3b49c6682d2e962ae2e5f957b17606ed') throw Error('IMPORTED_DRAFT_CAPTURE_DRIFT')
const data = JSON.parse(bytes)
const exact = (body, anchor, replacement) => { if (body.split(anchor).length !== 2) throw Error('IMPORTED_DRAFT_ANCHOR_DRIFT: ' + anchor); return body.replace(anchor, () => replacement) }
const textFields = { name: 'name', short_name: 'short_name', description: 'description', card_description: 'short_description', why_buy: 'why_buy', usage_instructions: 'usage_instructions', ingredients: 'ingredients', allergens: 'allergens', storage_instructions: 'storage_instructions', package_type: 'package_type', subcategory: 'subcategory', origin: 'origin', size: 'size', finished_product_details: 'finished_product_details' }
const helperBody = `
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
`
function transformDraft(body) {
  body = exact(body, '  v_barcode text;', `  v_barcode text;
  v_target jsonb;
  v_before public.products;
  v_key text;
  v_alias text;`)
  body = exact(body, '  -- Saved Draft association:', `  -- Choose strongest mode before any session/product resource, including retry.
  if exists(select 1 from public.product_intake_sessions where id=p_session_id
    and field_provenance?'imported_draft_target') then
    perform k2_private.lock_category_policy_v1(true);
  end if;
  -- Saved Draft association:`)
  body = exact(body, "  v_product := p_reviewed_payload -> 'product';", `  v_target:=v_session.field_provenance->'imported_draft_target';
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
  v_product := p_reviewed_payload -> 'product';`)
  body = exact(body, '    where barcode is not null', '    where id is distinct from v_product_id and barcode is not null')
  body = exact(body, 'where lower(name) = lower(v_name)', 'where id is distinct from v_product_id and lower(name) = lower(v_name)')
  body = exact(body, "     and not (\n       v_session.field_provenance", "     and not coalesce((\n       v_session.field_provenance")
  body = exact(body, "    raise exception using errcode = '23505', message = 'K2_DUPLICATE_NAME_REQUIRES_RESOLUTION';", "    raise exception using errcode = '23505', message = 'K2_DUPLICATE_NAME_REQUIRES_RESOLUTION';")
  body = exact(body, " >= 10\n     ) then", " >= 10\n     ),false) then")
  const assignments = Object.entries(textFields).map(([field,column]) => `${column}=case when p_field_decisions->>${q(field)}='accepted' and jsonb_typeof(v_product->${q(field)})='string' and nullif(trim(v_product->>${q(field)}),'') is not null then trim(v_product->>${q(field)}) else ${column} end`)
  assignments.push("country_of_origin=case when p_field_decisions->>'origin'='accepted' and jsonb_typeof(v_product->'origin')='string' and nullif(trim(v_product->>'origin'),'') is not null then trim(v_product->>'origin') else country_of_origin end")
  assignments.push(...['seo_keywords','pairings'].map(field => `${field}=case when p_field_decisions->>${q(field)}='accepted' and v_product?${q(field)} then array(select jsonb_array_elements_text(v_product->${q(field)})) else ${field} end`))
  assignments.push('brand_id=coalesce(brand_id,v_brand_id)', 'category_id=coalesce(category_id,v_category_id)')
  const merge = `  if v_target is not null then
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
        elsif v_key in (${[...Object.keys(textFields),'short','inside','whyBuy'].map(q).join(',')}) then
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
    update public.products set ${assignments.join(',\n      ')} where id=v_product_id;
    v_sku:=v_before.sku;
    insert into public.audit_logs(table_name,record_id,action,old_data,new_data,user_id)
    select 'products',v_product_id::text,'UPDATE',to_jsonb(v_before),to_jsonb(p)||jsonb_build_object(
      'operation','REVIEW_IMPORTED_DRAFT','intake_session_id',p_session_id),auth.uid()
    from public.products p where id=v_product_id;
  else
`
  body = exact(body, '  v_sku := public.generate_k2_sku_internal();', merge + '  v_sku := public.generate_k2_sku_internal();')
  body = exact(body, '  update public.product_intake_sessions set\n    draft_payload', '  end if;\n\n  update public.product_intake_sessions set\n    draft_payload')
  body = exact(body, '  insert into public.audit_logs (', '  if v_target is null then\n  insert into public.audit_logs (')
  body = exact(body, "  return jsonb_build_object(\n    'success', true, 'idempotent', false,", "  end if;\n  return jsonb_build_object(\n    'success', true, 'idempotent', false,")
  return body
}
function transformCommand(body) {
  body = exact(body, '  v_unit_cost numeric;', '  v_unit_cost numeric;\n  v_target jsonb;')
  body = exact(body, "  v_payload_hash := encode", `  if p_action='intake_draft' or (p_action='intake_session_create' and v_payload?'existingProduct') then
    perform k2_private.lock_category_policy_v1(true);
  end if;
  v_payload_hash := encode`)
  body = exact(body, "array['requestId','barcode','scannedIdentity']", "array['requestId','barcode','scannedIdentity','existingProduct']")
  body = exact(body, '    insert into public.product_intake_sessions(', `    if v_payload?'existingProduct' then
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
    insert into public.product_intake_sessions(`)
  body = exact(body, "      '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::text[],v_actor", `      case when v_target is null then '{}'::jsonb else jsonb_build_object(
        'meta',jsonb_build_object('schemaVersion','k2.product-content.v3','evidenceCount',0),'product',v_target->'product') end,
      '{}'::jsonb,case when v_target is null then '{}'::jsonb else jsonb_build_object('imported_draft_target',v_target) end,'{}'::text[],v_actor`)
  body = exact(body, "    v_result:=jsonb_build_object(\n      'sessionId',v_session.id,'requestId'", `    if (v_session.field_provenance->'imported_draft_target'->>'productId') is distinct from (v_target->>'productId')
       or (v_session.field_provenance->'imported_draft_target'->>'recordVersion') is distinct from (v_target->>'recordVersion') then
      raise exception using errcode='23505',message='K2_INTAKE_REQUEST_CONFLICT';
    end if;
    v_result:=jsonb_build_object(
      'sessionId',v_session.id,'requestId'`)
  body = exact(body, "    v_patch:=v_payload->'patch';", `    v_patch:=v_payload->'patch';
    if (v_patch->'fieldProvenance')?'imported_draft_target' then
      raise exception using errcode='22023',message='K2_IMPORTED_DRAFT_TARGET_IMMUTABLE';
    end if;`)
  body = exact(body, "then v_patch->'fieldProvenance' else field_provenance end", `then v_patch->'fieldProvenance'||case when field_provenance?'imported_draft_target'
        then jsonb_build_object('imported_draft_target',field_provenance->'imported_draft_target') else '{}'::jsonb end else field_provenance end`)
  return body
}
function transformAi(body) {
  return exact(body,"  v_product_key:=lower",`  if v_session.field_provenance?'imported_draft_target' and (
      (p_action='intake_ai_claim' and v_payload->>'kind' in ('PRIMARY','AFTER'))
      or p_action='intake_ai_attach') then
    raise exception using errcode='42501',message='AI_REVIEW_REQUIRED';
  end if;
  v_product_key:=lower`)
}
const signatures = ['public.create_product_draft_server(uuid, uuid, jsonb, jsonb)', 'public.execute_admin_product_intake_command_v1(text, bigint, uuid, uuid, text, text)', 'public.execute_admin_intake_ai_v1(text, bigint, uuid, uuid, text, text)']
const blocks = signatures.map((signature, index) => {
  const f = data.functions.find(f => f.signature === signature)
  if (!f) throw Error('IMPORTED_DRAFT_SIGNATURE_MISSING')
  const before = f.catalog.prosrc.replaceAll('\r\n','\n'), after = [transformDraft,transformCommand,transformAi][index](before)
  return `do $patch${index}$
declare b pg_catalog.pg_proc%rowtype; a pg_catalog.pg_proc%rowtype; d text;
begin
 select * into b from pg_catalog.pg_proc where oid=to_regprocedure(${q(signature)});
 if b.oid is null or pg_get_userbyid(b.proowner)<>'postgres' or not b.prosecdef
    or b.proisstrict or b.proretset or b.proleakproof or b.prokind<>'f'
    or b.provolatile<>'v' or b.proparallel<>'u' or b.pronargdefaults<>0
    or b.provariadic<>0 or b.prosupport<>0 or b.proargmodes is not null
    or b.proallargtypes is not null or b.prorettype<>'jsonb'::regtype
    or b.prolang<>(select oid from pg_catalog.pg_language where lanname='plpgsql')
    or b.proargnames is distinct from array[${f.catalog.proargnames.map(q).join(',')}]::text[]
    or b.proacl::text[] is distinct from array[${f.catalog.proacl.map(q).join(',')}]::text[]
    or b.proconfig is distinct from array['search_path=""']::text[]
    or md5(replace(b.prosrc,chr(13),'')) not in (${q(md5(before))},${q(md5(after))}) then
  raise exception 'K2_IMPORTED_DRAFT_FUNCTION_DRIFT';
 end if;
 if md5(replace(b.prosrc,chr(13),''))=${q(md5(after))} then return;end if;
 d:=pg_catalog.pg_get_functiondef(b.oid);
 if (length(d)-length(replace(d,b.prosrc,'')))/length(b.prosrc)<>1 then raise exception 'K2_IMPORTED_DRAFT_BODY_ANCHOR';end if;
 execute replace(d,b.prosrc,$body${index}$${after}$body${index}$);
 select * into a from pg_catalog.pg_proc where oid=b.oid;
 if (to_jsonb(a)-'prosrc') is distinct from (to_jsonb(b)-'prosrc')
    or md5(replace(a.prosrc,chr(13),''))<>${q(md5(after))} then raise exception 'K2_IMPORTED_DRAFT_METADATA_CHANGED';end if;
end $patch${index}$;`
})
const helper = 'k2_private.assert_imported_draft_target_v1(uuid,bigint)'
const sql = `-- IDEA-20261007-01 / MAP-018. PREPARED ONLY, not an activation migration.
-- Exact current foundation bodies, original ACL/config and same OIDs retained.
begin;
set local lock_timeout='2s';set local statement_timeout='10s';
do $preflight$ begin
 if current_user<>'postgres' or to_regprocedure('k2_private.lock_category_policy_v1(boolean)') is null
    or has_table_privilege('authenticated','public.product_intake_sessions','INSERT,UPDATE,DELETE') then
  raise exception 'K2_IMPORTED_DRAFT_INSTALL_TARGET_INVALID';
 end if;
 if to_regprocedure(${q(helper)}) is not null and exists(select 1 from pg_catalog.pg_proc p where oid=to_regprocedure(${q(helper)})
    and (md5(replace(prosrc,chr(13),''))<>${q(md5(helperBody))}
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
returns jsonb language plpgsql volatile security definer set search_path='' as $target$${helperBody}$target$;
revoke all on function ${helper} from public,anon,authenticated,service_role;
${blocks.join('\n')}
commit;
`
fs.writeFileSync('supabase/prepared/imported_draft_continuation.sql', sql)
console.log(JSON.stringify({ preparedOnly: true, bytes: Buffer.byteLength(sql), sha256: sha(sql) }))
