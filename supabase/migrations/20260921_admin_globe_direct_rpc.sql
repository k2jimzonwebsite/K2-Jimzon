-- Direct authenticated Globe editing for the transitional Admin mode.
-- Keeps the existing command behavior and private receipts without a browser BFF.
begin;
do $$
begin
  if to_regprocedure('public.read_admin_globe_cms_v1()') is null
     or to_regclass('k2_private.globe_review_events') is null
     or to_regclass('k2_private.admin_command_receipts') is null then
    raise exception 'K2_GLOBE_BOUNDARY_REQUIRED';
  end if;
end;
$$;
revoke insert,update,delete on public.globe_products,public.reviews from authenticated;
create or replace function public.execute_admin_globe_review_direct_v1(
  p_action text,p_idempotency_key uuid,p_payload_text text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid(); v_payload jsonb; v_hash text;
  v_existing k2_private.admin_command_receipts; v_result jsonb;
  v_reason text; v_count integer; v_inserted integer;
  v_globe public.globe_products%rowtype; v_review public.reviews%rowtype;
  v_before jsonb; v_after jsonb; v_id uuid; v_version integer;
  v_hero jsonb; v_hero_url text; v_hero_path text; v_suffix text;
  v_product_id text; v_status text;
begin
  if p_action is null or p_action not in ('globe_config_update','review_create','review_update','review_publish','review_withdraw')
     or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  if p_idempotency_key is null or p_payload_text is null
     or octet_length(p_payload_text)>8192 then
    raise exception using errcode='22023',message='K2_ADMIN_GLOBE_REVIEW_INVALID';
  end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' then
    raise exception using errcode='22023',message='K2_ADMIN_GLOBE_REVIEW_INVALID';
  end if;
  v_reason:=trim(v_payload->>'reason');
  if length(v_reason) not between 3 and 500 then
    raise exception using errcode='22023',message='K2_ADMIN_GLOBE_REVIEW_INVALID';
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
  if v_count>=30 then raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED'; end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS'; end if;

  if p_action='globe_config_update' then
    if not (v_payload ?& array['productId','enabled','hero','displayOrder','version','reason'])
       or (v_payload-array['productId','enabled','hero','displayOrder','version','reason'])<>'{}'::jsonb
       or coalesce(v_payload->>'productId','')!~'^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
       or jsonb_typeof(v_payload->'enabled')<>'boolean'
       or (v_payload->>'displayOrder')::integer not between 0 and 99
       or (v_payload->>'version')::integer<1 then
      raise exception using errcode='22023',message='K2_ADMIN_GLOBE_REVIEW_INVALID';
    end if;
    v_product_id:=v_payload->>'productId'; v_version:=(v_payload->>'version')::integer;
    select * into v_globe from public.globe_products where product_id=v_product_id for update;
    if not found then raise exception using errcode='P0002',message='K2_ADMIN_GLOBE_NOT_FOUND'; end if;
    if v_globe.version<>v_version then raise exception using errcode='40001',message='K2_ADMIN_GLOBE_STALE'; end if;
    v_hero:=v_payload->'hero';
    if jsonb_typeof(v_hero)='null' then v_hero_url:=null;
    elsif jsonb_typeof(v_hero)='object' and (v_hero ?& array['url','objectPath'])
      and (v_hero-array['url','objectPath'])='{}'::jsonb then
      v_hero_url:=v_hero->>'url'; v_hero_path:=nullif(v_hero->>'objectPath','');
      if v_hero_url is null or length(v_hero_url) not between 10 and 2048
         or v_hero_url!~'^https://[^[:space:][:cntrl:]]+$' then
        raise exception using errcode='22023',message='K2_ADMIN_GLOBE_REVIEW_INVALID'; end if;
      if v_hero_path is null then
        if v_hero_url is distinct from v_globe.hero_image then
          raise exception using errcode='22023',message='K2_ADMIN_MEDIA_UNREGISTERED'; end if;
      else
        if v_hero_path!~('^'||v_actor::text||'/product-media/[0-9a-f-]{36}-[0-9a-f]{16}[.](jpg|png|webp)$')
           or not exists(select 1 from k2_private.admin_command_receipts r where r.actor_id=v_actor
             and r.action='product_media_upload' and r.completed_at is not null and r.result->>'objectPath'=v_hero_path)
           or not exists(select 1 from storage.objects o where o.bucket_id='product-images' and o.name=v_hero_path) then
          raise exception using errcode='22023',message='K2_ADMIN_MEDIA_UNREGISTERED'; end if;
        v_suffix:='/storage/v1/object/public/product-images/'||v_hero_path;
        if right(v_hero_url,length(v_suffix))<>v_suffix then
          raise exception using errcode='22023',message='K2_ADMIN_GLOBE_REVIEW_INVALID'; end if;
      end if;
    else raise exception using errcode='22023',message='K2_ADMIN_GLOBE_REVIEW_INVALID'; end if;
    v_before:=jsonb_build_object('enabled',v_globe.enabled,'heroImage',v_globe.hero_image,'displayOrder',v_globe.display_order,'version',v_globe.version);
    update public.globe_products set enabled=(v_payload->>'enabled')::boolean,
      hero_image=v_hero_url,display_order=(v_payload->>'displayOrder')::integer,
      version=version+1,updated_at=clock_timestamp() where product_id=v_product_id
    returning jsonb_build_object('productId',product_id,'enabled',enabled,'heroImage',hero_image,'displayOrder',display_order,'version',version) into v_result;
    v_after:=v_result;

  elsif p_action in ('review_create','review_update') then
    if not (v_payload ?& array['name','channel','stars','text','item','productId','reviewDate','sourceKind','sourceReference','rightsBasis','reason'])
       or (v_payload-array['id','version','name','channel','stars','text','item','productId','reviewDate','sourceKind','sourceReference','rightsBasis','reason'])<>'{}'::jsonb
       or (p_action='review_create' and (v_payload ? 'id' or v_payload ? 'version'))
       or (p_action='review_update' and not (v_payload ?& array['id','version'])) then
      raise exception using errcode='22023',message='K2_ADMIN_GLOBE_REVIEW_INVALID'; end if;
    if length(trim(v_payload->>'name')) not between 2 and 80
       or length(trim(v_payload->>'channel')) not between 2 and 80
       or (v_payload->>'stars')::integer not between 1 and 5
       or length(trim(v_payload->>'text')) not between 10 and 1200
       or length(trim(v_payload->>'item')) not between 2 and 120
       or coalesce(v_payload->>'sourceKind','') not in ('verified_marketplace','website_customer','wholesale_customer','pasabuy_customer','owner_record')
       or length(trim(v_payload->>'sourceReference')) not between 3 and 120
       or coalesce(v_payload->>'rightsBasis','') not in ('customer_consent','marketplace_publication','contractual_permission','owner_record')
       or (v_payload->>'reviewDate')::date>current_date then
      raise exception using errcode='22023',message='K2_ADMIN_GLOBE_REVIEW_INVALID'; end if;
    v_product_id:=nullif(v_payload->>'productId','');
    if v_product_id is not null and not exists(select 1 from public.globe_products where product_id=v_product_id) then
      raise exception using errcode='22023',message='K2_ADMIN_GLOBE_REVIEW_INVALID'; end if;
    if p_action='review_create' then
      insert into public.reviews(product_id,name,channel,stars,text,item,review_date,
        moderation_status,source_kind,source_reference,rights_basis,rights_confirmed_at)
      values(v_product_id,trim(v_payload->>'name'),trim(v_payload->>'channel'),(v_payload->>'stars')::integer,
        trim(v_payload->>'text'),trim(v_payload->>'item'),(v_payload->>'reviewDate')::date,
        'draft',v_payload->>'sourceKind',trim(v_payload->>'sourceReference'),v_payload->>'rightsBasis',clock_timestamp())
      returning id into v_id; v_before:=null;
    else
      v_id:=(v_payload->>'id')::uuid; v_version:=(v_payload->>'version')::integer;
      select * into v_review from public.reviews where id=v_id for update;
      if not found then raise exception using errcode='P0002',message='K2_ADMIN_REVIEW_NOT_FOUND'; end if;
      if v_review.version<>v_version then raise exception using errcode='40001',message='K2_ADMIN_REVIEW_STALE'; end if;
      v_before:=to_jsonb(v_review);
      update public.reviews set product_id=v_product_id,name=trim(v_payload->>'name'),
        channel=trim(v_payload->>'channel'),stars=(v_payload->>'stars')::integer,
        text=trim(v_payload->>'text'),item=trim(v_payload->>'item'),review_date=(v_payload->>'reviewDate')::date,
        source_kind=v_payload->>'sourceKind',source_reference=trim(v_payload->>'sourceReference'),
        rights_basis=v_payload->>'rightsBasis',rights_confirmed_at=clock_timestamp(),
        moderation_status='draft',published_at=null,withdrawn_at=case when v_review.moderation_status='published' then clock_timestamp() else v_review.withdrawn_at end,
        version=version+1,updated_at=clock_timestamp() where id=v_id;
    end if;
    select * into v_review from public.reviews where id=v_id;
    v_result:=jsonb_build_object('review',jsonb_build_object(
      'id',v_review.id,'productId',v_review.product_id,'name',v_review.name,'channel',v_review.channel,
      'stars',v_review.stars,'text',v_review.text,'item',v_review.item,'reviewDate',v_review.review_date,
      'status',v_review.moderation_status,'sourceKind',v_review.source_kind,'sourceReference',v_review.source_reference,
      'rightsBasis',v_review.rights_basis,'rightsConfirmedAt',v_review.rights_confirmed_at,'version',v_review.version));
    v_after:=v_result->'review';

  else
    if not (v_payload ?& array['id','version','reason'])
       or (v_payload-array['id','version','reason'])<>'{}'::jsonb then
      raise exception using errcode='22023',message='K2_ADMIN_GLOBE_REVIEW_INVALID'; end if;
    v_id:=(v_payload->>'id')::uuid; v_version:=(v_payload->>'version')::integer;
    select * into v_review from public.reviews where id=v_id for update;
    if not found then raise exception using errcode='P0002',message='K2_ADMIN_REVIEW_NOT_FOUND'; end if;
    if v_review.version<>v_version then raise exception using errcode='40001',message='K2_ADMIN_REVIEW_STALE'; end if;
    v_before:=to_jsonb(v_review);
    if p_action='review_publish' then
      if v_review.source_kind is null or length(trim(v_review.source_reference))<3
         or v_review.rights_basis is null or v_review.rights_confirmed_at is null then
        raise exception using errcode='23514',message='K2_ADMIN_REVIEW_EVIDENCE_REQUIRED'; end if;
      v_status:='published';
      update public.reviews set moderation_status='published',published_at=clock_timestamp(),withdrawn_at=null,
        version=version+1,updated_at=clock_timestamp() where id=v_id;
    else
      v_status:='withdrawn';
      update public.reviews set moderation_status='withdrawn',withdrawn_at=clock_timestamp(),
        version=version+1,updated_at=clock_timestamp() where id=v_id;
    end if;
    select * into v_review from public.reviews where id=v_id;
    v_result:=jsonb_build_object('review',jsonb_build_object(
      'id',v_review.id,'status',v_review.moderation_status,'publishedAt',v_review.published_at,
      'withdrawnAt',v_review.withdrawn_at,'version',v_review.version));
    v_after:=to_jsonb(v_review);
  end if;

  insert into k2_private.globe_review_events(actor_id,action,request_id,subject_id,reason,before_state,after_state)
  values(v_actor,p_action,p_idempotency_key,coalesce(v_id::text,v_product_id),v_reason,v_before,v_after);
  update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow then
  raise exception using errcode='22023',message='K2_ADMIN_GLOBE_REVIEW_INVALID';
end;
$$;
revoke all on function public.execute_admin_globe_review_direct_v1(text,uuid,text) from public,anon;
grant execute on function public.execute_admin_globe_review_direct_v1(text,uuid,text) to authenticated;
commit;