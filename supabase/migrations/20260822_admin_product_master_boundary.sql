-- Prepared MAP-020 product-master command boundary.
-- Local rehearsal target only until OWNER-005 and the coordinated Admin cutover.
begin;

create table if not exists k2_private.product_master_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null,
  action text not null check (action in ('product_master_update','product_master_status')),
  request_id uuid not null,
  sku text not null,
  reason text not null,
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(actor_id,action,request_id,sku)
);
alter table k2_private.product_master_events enable row level security;
alter table k2_private.product_master_events force row level security;
revoke all on k2_private.product_master_events from public,anon,authenticated;

revoke insert,update,delete on public.products from authenticated;
revoke all on function public.delete_products_with_pin_v2(text[],text,text,uuid) from public,anon,authenticated;

create or replace function public.execute_admin_product_master_command_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid(); v_payload jsonb; v_patch jsonb; v_hash text; v_reason text;
  v_existing k2_private.admin_command_receipts; v_result jsonb;
  v_count integer; v_inserted integer; v_product public.products%rowtype;
  v_next public.products%rowtype; v_sku text; v_target text; v_skus text[];
  v_before jsonb; v_after jsonb; v_item text;
  v_allowed text[]:=array[
    'name','short','barcode','subcategory','country_of_origin','origin','net_weight',
    'package_type','size','description','why_buy','why_rare','usage_instructions',
    'storage_instructions','ingredients','allergens','finished_product_details',
    'pairings','cost_price','srp','wholesale_price','dealer_price','reorder_level',
    'slug','seo_keywords','is_featured','is_human_reviewed','product_video_url','internal_notes'
  ];
begin
  if p_action not in ('product_master_update','product_master_status','product_master_delete')
     or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED'; end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' or not (v_payload ? 'reason') then
    raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_INVALID';
  end if;
  v_reason:=trim(v_payload->>'reason');
  if length(v_reason) not between 8 and 500 then
    raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_REASON_INVALID';
  end if;
  v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash<>v_hash then raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT'; end if;
    if v_existing.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS'; end if;
    return v_existing.result;
  end if;
  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_count>=10 then raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED'; end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS'; end if;

  if p_action='product_master_update' then
    if not (v_payload ?& array['sku','patch','expectedUpdatedAt','reason'])
       or (v_payload-array['sku','patch','expectedUpdatedAt','reason'])<>'{}'::jsonb then
      raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_INVALID';
    end if;
    v_sku:=trim(v_payload->>'sku'); v_patch:=v_payload->'patch';
    if v_sku!~'^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$' or jsonb_typeof(v_patch)<>'object'
       or v_patch='{}'::jsonb or exists(select 1 from jsonb_object_keys(v_patch) k where not (k=any(v_allowed))) then
      raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_INVALID';
    end if;
    select * into v_product from public.products where sku=v_sku for update;
    if not found then raise exception using errcode='P0002',message='K2_PRODUCT_NOT_FOUND'; end if;
    if v_product.updated_at is distinct from (v_payload->>'expectedUpdatedAt')::timestamptz then
      raise exception using errcode='40001',message='K2_ADMIN_PRODUCT_VERSION_CONFLICT';
    end if;
    v_next:=jsonb_populate_record(v_product,v_patch);
    if nullif(trim(v_next.name),'') is null or length(v_next.name)>240
       or length(coalesce(v_next.barcode,''))>64 or length(coalesce(v_next.short,''))>500
       or length(coalesce(v_next.subcategory,''))>120 or length(coalesce(v_next.country_of_origin,''))>120
       or length(coalesce(v_next.origin,''))>240 or length(coalesce(v_next.package_type,''))>120
       or length(coalesce(v_next.size,''))>120 or length(coalesce(v_next.slug,''))>180
       or length(coalesce(v_next.description,''))>10000 or length(coalesce(v_next.why_buy,''))>2000
       or length(coalesce(v_next.why_rare,''))>2000 or length(coalesce(v_next.usage_instructions,''))>5000
       or length(coalesce(v_next.storage_instructions,''))>5000 or length(coalesce(v_next.ingredients,''))>10000
       or length(coalesce(v_next.allergens,''))>5000 or length(coalesce(v_next.finished_product_details,''))>5000
       or length(coalesce(v_next.product_video_url,''))>2000 or length(coalesce(v_next.internal_notes,''))>5000
       or coalesce(v_next.net_weight,0)<0 or coalesce(v_next.net_weight,0)>100000
       or coalesce(v_next.cost_price,0)<0 or coalesce(v_next.cost_price,0)>1000000
       or coalesce(v_next.srp,0)<0 or coalesce(v_next.srp,0)>1000000
       or coalesce(v_next.wholesale_price,0)<0 or coalesce(v_next.wholesale_price,0)>1000000
       or coalesce(v_next.dealer_price,0)<0 or coalesce(v_next.dealer_price,0)>1000000
       or coalesce(v_next.reorder_level,0)<0 or coalesce(v_next.reorder_level,0)>1000000
       or coalesce(cardinality(v_next.pairings),0)>20 or coalesce(cardinality(v_next.seo_keywords),0)>30 then
      raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_INVALID';
    end if;
    foreach v_item in array coalesce(v_next.pairings,'{}'::text[]) loop
      if length(v_item)>240 then raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_INVALID'; end if;
    end loop;
    foreach v_item in array coalesce(v_next.seo_keywords,'{}'::text[]) loop
      if length(v_item)>120 then raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_INVALID'; end if;
    end loop;
    v_before:=to_jsonb(v_product);
    update public.products set
      name=v_next.name,short=v_next.short,barcode=v_next.barcode,subcategory=v_next.subcategory,
      country_of_origin=v_next.country_of_origin,origin=v_next.origin,net_weight=v_next.net_weight,
      package_type=v_next.package_type,size=v_next.size,description=v_next.description,
      why_buy=v_next.why_buy,why_rare=v_next.why_rare,usage_instructions=v_next.usage_instructions,
      storage_instructions=v_next.storage_instructions,ingredients=v_next.ingredients,
      allergens=v_next.allergens,finished_product_details=v_next.finished_product_details,
      pairings=v_next.pairings,cost_price=v_next.cost_price,srp=v_next.srp,
      wholesale_price=v_next.wholesale_price,dealer_price=v_next.dealer_price,
      reorder_level=v_next.reorder_level,slug=v_next.slug,seo_keywords=v_next.seo_keywords,
      is_featured=v_next.is_featured,is_human_reviewed=v_next.is_human_reviewed,
      product_video_url=v_next.product_video_url,internal_notes=v_next.internal_notes,
      updated_at=clock_timestamp()
    where id=v_product.id returning * into v_next;
    v_after:=to_jsonb(v_next);
    insert into k2_private.product_master_events(actor_id,action,request_id,sku,reason,before_state,after_state)
    values(v_actor,p_action,p_idempotency_key,v_sku,v_reason,v_before,v_after);
    v_result:=jsonb_build_object('sku',v_sku,'status',v_next.status,'updatedAt',v_next.updated_at);

  elsif p_action='product_master_status' then
    if not (v_payload ?& array['skus','status','reason'])
       or (v_payload-array['skus','status','reason'])<>'{}'::jsonb
       or jsonb_typeof(v_payload->'skus')<>'array' then
      raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_INVALID';
    end if;
    select array_agg(value order by value) into v_skus from jsonb_array_elements_text(v_payload->'skus');
    if cardinality(v_skus) not between 1 and 25 or cardinality(v_skus)<>cardinality(array(select distinct unnest(v_skus)))
       or exists(select 1 from unnest(v_skus) s where s!~'^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$') then
      raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_INVALID';
    end if;
    v_target:=v_payload->>'status';
    if v_target not in ('Draft','Under Review','Live','Unlisted','Discontinued') then
      raise exception using errcode='22023',message='K2_PUBLICATION_STATUS_INVALID';
    end if;
    foreach v_sku in array v_skus loop
      select * into v_product from public.products where sku=v_sku for update;
      if not found then raise exception using errcode='P0002',message='K2_PRODUCT_NOT_FOUND'; end if;
      if (v_product.status,v_target) not in (
        ('Draft','Draft'),('Draft','Under Review'),('Under Review','Under Review'),
        ('Under Review','Draft'),('Under Review','Live'),('Under Review','Unlisted'),
        ('Live','Live'),('Live','Unlisted'),('Live','Discontinued'),
        ('Unlisted','Unlisted'),('Unlisted','Under Review'),('Unlisted','Discontinued'),
        ('Discontinued','Discontinued')
      ) then raise exception using errcode='23514',message='K2_PUBLICATION_TRANSITION_INVALID'; end if;
      if v_target='Live' and (
        nullif(trim(v_product.name),'') is null or v_product.brand_id is null or v_product.category_id is null
        or coalesce(v_product.srp,v_product.retail_price,0)<=0
        or nullif(trim(v_product.primary_image_url),'') is null
        or not coalesce(v_product.is_human_reviewed,false)
      ) then raise exception using errcode='23514',message='K2_PUBLICATION_NOT_READY'; end if;
      v_before:=jsonb_build_object('status',v_product.status,'published',v_product.published);
      update public.products set status=v_target,updated_at=clock_timestamp()
      where id=v_product.id returning * into v_next;
      v_after:=jsonb_build_object('status',v_next.status,'published',v_next.published);
      insert into k2_private.product_master_events(actor_id,action,request_id,sku,reason,before_state,after_state)
      values(v_actor,p_action,p_idempotency_key,v_sku,v_reason,v_before,v_after);
    end loop;
    v_result:=jsonb_build_object('skus',to_jsonb(v_skus),'status',v_target,'updated',cardinality(v_skus));

  else
    if not (v_payload ?& array['skus','pin','reason'])
       or (v_payload-array['skus','pin','reason'])<>'{}'::jsonb
       or jsonb_typeof(v_payload->'skus')<>'array' or (v_payload->>'pin')!~'^[0-9]{4}$' then
      raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_INVALID';
    end if;
    select array_agg(value order by value) into v_skus from jsonb_array_elements_text(v_payload->'skus');
    if cardinality(v_skus) not between 1 and 25 or cardinality(v_skus)<>cardinality(array(select distinct unnest(v_skus)))
       or exists(select 1 from unnest(v_skus) s where s!~'^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$') then
      raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_INVALID';
    end if;
    v_result:=public.delete_products_with_pin_v2(v_skus,v_payload->>'pin',v_reason,p_idempotency_key);
  end if;

  update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then
  raise exception using errcode='22023',message='K2_ADMIN_PRODUCT_INVALID';
end;
$$;
revoke all on function public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text) from public,anon;
grant execute on function public.execute_admin_product_master_command_v1(text,bigint,uuid,uuid,text,text) to authenticated;

commit;
