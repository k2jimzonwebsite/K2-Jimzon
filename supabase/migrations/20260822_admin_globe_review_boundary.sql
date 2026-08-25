-- K2 Jimzon Admin BOS: reviewed Globe presentation and testimonial lifecycle.
-- Prepared only. Activate with the Admin BFF and direct-write cutover together.

begin;

alter table public.globe_products
  add column if not exists version integer not null default 1 check (version>0);

alter table public.reviews
  add column if not exists moderation_status text not null default 'draft'
    check (moderation_status in ('draft','published','withdrawn')),
  add column if not exists source_kind text
    check (source_kind in ('verified_marketplace','website_customer','wholesale_customer','pasabuy_customer','owner_record')),
  add column if not exists source_reference text,
  add column if not exists rights_basis text
    check (rights_basis in ('customer_consent','marketplace_publication','contractual_permission','owner_record')),
  add column if not exists rights_confirmed_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists withdrawn_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists version integer not null default 1 check (version>0);

create table if not exists k2_private.globe_review_events (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid not null,
  action text not null check (action in (
    'globe_config_update','review_create','review_update','review_publish','review_withdraw'
  )),
  request_id uuid not null,
  subject_id text not null,
  reason text not null check (char_length(reason) between 3 and 500),
  before_state jsonb,
  after_state jsonb not null,
  created_at timestamptz not null default now(),
  unique(actor_id,action,request_id)
);
revoke all on table k2_private.globe_review_events from public,anon,authenticated;
alter table k2_private.globe_review_events enable row level security;
alter table k2_private.globe_review_events force row level security;

drop policy if exists "Admins manage globe products" on public.globe_products;
drop policy if exists globe_products_staff_manage on public.globe_products;
drop policy if exists "Admins manage reviews" on public.reviews;
drop policy if exists reviews_staff_manage on public.reviews;
drop policy if exists "Public read reviews" on public.reviews;
drop policy if exists reviews_public_read on public.reviews;
drop policy if exists reviews_public_published_read on public.reviews;
create policy reviews_public_published_read on public.reviews
for select to anon,authenticated using (moderation_status='published');

revoke insert,update,delete on public.globe_products,public.reviews from authenticated;
revoke select on public.reviews from anon,authenticated;
grant select(id,product_id,name,channel,stars,text,item,review_date,created_at)
  on public.reviews to anon,authenticated;

create or replace function public.read_admin_globe_cms_v1()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_products jsonb; v_reviews jsonb;
begin
  if not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'productId',g.product_id,'enabled',g.enabled,'heroImage',g.hero_image,
    'displayOrder',g.display_order,'version',g.version
  ) order by g.display_order,g.product_id),'[]'::jsonb) into v_products
  from public.globe_products g;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'productId',r.product_id,'name',r.name,'channel',r.channel,
    'stars',r.stars,'text',r.text,'item',r.item,'reviewDate',r.review_date,
    'status',r.moderation_status,'sourceKind',r.source_kind,
    'sourceReference',r.source_reference,'rightsBasis',r.rights_basis,
    'rightsConfirmedAt',r.rights_confirmed_at,'publishedAt',r.published_at,
    'withdrawnAt',r.withdrawn_at,'version',r.version
  ) order by r.created_at desc,r.id),'[]'::jsonb) into v_reviews
  from public.reviews r;
  return jsonb_build_object('globeProducts',v_products,'reviews',v_reviews);
end;
$$;
revoke all on function public.read_admin_globe_cms_v1() from public,anon;
grant execute on function public.read_admin_globe_cms_v1() to authenticated;

create or replace function public.execute_admin_globe_review_command_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
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
  if p_action not in ('globe_config_update','review_create','review_update','review_publish','review_withdraw')
     or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED'; end if;
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
revoke all on function public.execute_admin_globe_review_command_v1(text,bigint,uuid,uuid,text,text) from public,anon;
grant execute on function public.execute_admin_globe_review_command_v1(text,bigint,uuid,uuid,text,text) to authenticated;

commit;
