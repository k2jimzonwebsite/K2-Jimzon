-- K2 Jimzon Admin BOS: signed, receipt-backed public product-media registration.
-- Prepared only. The BFF decodes/re-encodes bytes before Storage upload; this
-- database boundary proves the resulting object and binds retries to one payload.

begin;

create or replace function public.execute_admin_product_media_command_v1(
  p_action text,
  p_timestamp bigint,
  p_nonce uuid,
  p_idempotency_key uuid,
  p_payload_text text,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_payload jsonb;
  v_payload_hash text;
  v_existing k2_private.admin_command_receipts;
  v_count integer;
  v_inserted integer;
  v_object_path text;
  v_content_type text;
  v_extension text;
  v_size bigint;
  v_width integer;
  v_height integer;
  v_sha256 text;
  v_result jsonb;
begin
  if p_action <> 'product_media_upload' then
    raise exception using errcode='22023', message='K2_ADMIN_MEDIA_ACTION_INVALID';
  end if;
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
  end if;

  v_payload := p_payload_text::jsonb;
  if jsonb_typeof(v_payload) <> 'object'
     or not (v_payload ?& array['objectPath','contentType','size','width','height','sha256'])
     or (v_payload - array['objectPath','contentType','size','width','height','sha256']) <> '{}'::jsonb then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_PAYLOAD_INVALID';
  end if;
  v_object_path := v_payload->>'objectPath';
  v_content_type := v_payload->>'contentType';
  v_size := (v_payload->>'size')::bigint;
  v_width := (v_payload->>'width')::integer;
  v_height := (v_payload->>'height')::integer;
  v_sha256 := v_payload->>'sha256';
  v_extension := case v_content_type
    when 'image/jpeg' then 'jpg' when 'image/png' then 'png'
    when 'image/webp' then 'webp' else null end;
  if v_extension is null or v_size not between 1 and 4194304
     or v_width not between 100 and 12000 or v_height not between 100 and 12000
     or v_width::bigint*v_height::bigint > 40000000
     or v_sha256 !~ '^[0-9a-f]{64}$'
     or v_object_path <> v_actor::text||'/product-media/'||p_idempotency_key::text||'-'||substr(v_sha256,1,16)||'.'||v_extension then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_PAYLOAD_INVALID';
  end if;

  v_payload_hash := encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash<>v_payload_hash then
      raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.result is null then
      raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;

  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_count>=20 then
    raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED';
  end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_payload_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';
  end if;

  if not exists(
    select 1 from storage.objects
    where bucket_id='product-images' and name=v_object_path
      and coalesce(metadata->>'mimetype','')=v_content_type
      and coalesce((metadata->>'size')::bigint,0)=v_size
  ) then
    raise exception using errcode='55000',message='K2_ADMIN_MEDIA_OBJECT_UNVERIFIED';
  end if;
  v_result:=jsonb_build_object(
    'objectPath',v_object_path,'contentType',v_content_type,'size',v_size,
    'width',v_width,'height',v_height,'sha256',v_sha256
  );
  update k2_private.admin_command_receipts
  set result=v_result,completed_at=clock_timestamp()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_PAYLOAD_INVALID';
end;
$$;

revoke all on function public.execute_admin_product_media_command_v1(text,bigint,uuid,uuid,text,text)
  from public,anon;
grant execute on function public.execute_admin_product_media_command_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

create table if not exists k2_private.product_media_events (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid not null,
  sku text not null,
  request_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  before_state jsonb not null,
  after_state jsonb not null,
  cleanup_paths text[] not null default '{}'::text[],
  cleanup_status text not null default 'none'
    check (cleanup_status in ('none','pending','completed')),
  cleanup_completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(actor_id, request_id)
);
revoke all on table k2_private.product_media_events from public,anon,authenticated;
alter table k2_private.product_media_events enable row level security;
alter table k2_private.product_media_events force row level security;

create table if not exists k2_private.product_media_orphan_events (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid not null,
  request_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  object_paths text[] not null check (cardinality(object_paths) between 1 and 25),
  cleanup_status text not null default 'pending'
    check (cleanup_status in ('pending','completed')),
  cleanup_completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(actor_id,request_id)
);
revoke all on table k2_private.product_media_orphan_events from public,anon,authenticated;
alter table k2_private.product_media_orphan_events enable row level security;
alter table k2_private.product_media_orphan_events force row level security;

create or replace function k2_private.validate_product_media_item(
  p_actor uuid,
  p_item jsonb,
  p_current_urls text[]
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_path text;
  v_suffix text;
begin
  if jsonb_typeof(p_item)<>'object'
     or not (p_item ?& array['url','objectPath'])
     or (p_item-array['url','objectPath'])<>'{}'::jsonb then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ASSIGNMENT_INVALID';
  end if;
  v_url:=p_item->>'url';
  v_path:=nullif(p_item->>'objectPath','');
  if v_url is null or length(v_url) not between 10 and 2048
     or v_url!~'^https://[^[:space:][:cntrl:]]+$' then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ASSIGNMENT_INVALID';
  end if;
  if v_path is null then
    if not (v_url=any(coalesce(p_current_urls,'{}'::text[]))) then
      raise exception using errcode='22023',message='K2_ADMIN_MEDIA_UNREGISTERED';
    end if;
    return v_url;
  end if;
  if v_path!~('^'||p_actor::text||'/product-media/[0-9a-f-]{36}-[0-9a-f]{16}[.](jpg|png|webp)$')
     or not exists(
       select 1 from k2_private.admin_command_receipts r
       where r.actor_id=p_actor and r.action='product_media_upload'
         and r.completed_at is not null and r.result->>'objectPath'=v_path
     )
     or not exists(
       select 1 from storage.objects o
       where o.bucket_id='product-images' and o.name=v_path
     ) then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_UNREGISTERED';
  end if;
  v_suffix:='/storage/v1/object/public/product-images/'||v_path;
  if right(v_url,length(v_suffix))<>v_suffix then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ASSIGNMENT_INVALID';
  end if;
  return v_url;
end;
$$;
revoke all on function k2_private.validate_product_media_item(uuid,jsonb,text[])
  from public,anon,authenticated;

create or replace function public.execute_admin_product_media_assignment_v1(
  p_action text,
  p_timestamp bigint,
  p_nonce uuid,
  p_idempotency_key uuid,
  p_payload_text text,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid:=auth.uid();
  v_payload jsonb;
  v_hash text;
  v_existing k2_private.admin_command_receipts;
  v_product public.products%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_primary text;
  v_lifestyle text[]:='{}'::text[];
  v_secondary text[]:='{}'::text[];
  v_item jsonb;
  v_reason text;
  v_count integer;
  v_inserted integer;
  v_before_urls text[];
  v_after_urls text[];
  v_removed_url text;
  v_cleanup_path text;
  v_cleanup_paths text[]:='{}'::text[];
begin
  if p_action<>'product_media_assign' then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ACTION_INVALID';
  end if;
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object'
     or not (v_payload ?& array['sku','primary','lifestyle','secondary','reason'])
     or (v_payload-array['sku','primary','lifestyle','secondary','reason'])<>'{}'::jsonb
     or coalesce(v_payload->>'sku','')!~'^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
     or jsonb_typeof(v_payload->'lifestyle')<>'array'
     or jsonb_array_length(v_payload->'lifestyle')>1
     or jsonb_typeof(v_payload->'secondary')<>'array'
     or jsonb_array_length(v_payload->'secondary')>5 then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ASSIGNMENT_INVALID';
  end if;
  v_reason:=trim(v_payload->>'reason');
  if length(v_reason) not between 3 and 500 then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ASSIGNMENT_INVALID';
  end if;

  v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash<>v_hash then
      raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_existing.result is null then
      raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_existing.result;
  end if;
  select count(*)::integer into v_count from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_count>=30 then
    raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED';
  end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';
  end if;

  select * into v_product from public.products
  where sku=v_payload->>'sku' for update;
  if not found then
    raise exception using errcode='P0002',message='K2_ADMIN_PRODUCT_NOT_FOUND';
  end if;
  v_before:=jsonb_build_object(
    'primary',v_product.primary_image_url,
    'lifestyle',coalesce(v_product.lifestyle_images,'{}'::text[]),
    'secondary',coalesce(v_product.secondary_images,'{}'::text[])
  );
  if jsonb_typeof(v_payload->'primary')='null' then
    v_primary:=null;
  else
    v_primary:=k2_private.validate_product_media_item(
      v_actor,v_payload->'primary',array[v_product.primary_image_url]
    );
  end if;
  for v_item in select value from jsonb_array_elements(v_payload->'lifestyle') loop
    v_lifestyle:=array_append(v_lifestyle,k2_private.validate_product_media_item(
      v_actor,v_item,coalesce(v_product.lifestyle_images,'{}'::text[])
    ));
  end loop;
  for v_item in select value from jsonb_array_elements(v_payload->'secondary') loop
    v_secondary:=array_append(v_secondary,k2_private.validate_product_media_item(
      v_actor,v_item,coalesce(v_product.secondary_images,'{}'::text[])
    ));
  end loop;
  if (coalesce(v_product.published,false) or v_product.status::text in ('Live','Published'))
     and v_primary is null then
    raise exception using errcode='23514',message='K2_ADMIN_MEDIA_PRIMARY_REQUIRED';
  end if;
  v_after:=jsonb_build_object('primary',v_primary,'lifestyle',v_lifestyle,'secondary',v_secondary);
  update public.products set
    primary_image_url=v_primary,image_url=v_primary,
    lifestyle_images=v_lifestyle,secondary_images=v_secondary,
    updated_at=clock_timestamp()
  where sku=v_product.sku;
  v_before_urls:=array_remove(
    array[v_product.primary_image_url]
      ||coalesce(v_product.lifestyle_images,'{}'::text[])
      ||coalesce(v_product.secondary_images,'{}'::text[]),null
  );
  v_after_urls:=array_remove(
    array[v_primary]||coalesce(v_lifestyle,'{}'::text[])||coalesce(v_secondary,'{}'::text[]),null
  );
  for v_removed_url in
    select distinct value from unnest(v_before_urls) value
    where not (value=any(v_after_urls))
  loop
    select r.result->>'objectPath' into v_cleanup_path
    from k2_private.admin_command_receipts r
    where r.action='product_media_upload' and r.completed_at is not null
      and r.result ? 'objectPath'
      and right(v_removed_url,length('/storage/v1/object/public/product-images/'||(r.result->>'objectPath')))
        ='/storage/v1/object/public/product-images/'||(r.result->>'objectPath')
    order by r.completed_at desc limit 1;
    if v_cleanup_path is not null and not exists(
      select 1 from public.products p
      where p.primary_image_url=v_removed_url or p.image_url=v_removed_url
        or v_removed_url=any(coalesce(p.lifestyle_images,'{}'::text[]))
        or v_removed_url=any(coalesce(p.secondary_images,'{}'::text[]))
    ) then
      v_cleanup_paths:=array_append(v_cleanup_paths,v_cleanup_path);
    end if;
    v_cleanup_path:=null;
  end loop;
  insert into k2_private.product_media_events(
    actor_id,sku,request_id,reason,before_state,after_state,cleanup_paths,cleanup_status
  ) values(
    v_actor,v_product.sku,p_idempotency_key,v_reason,v_before,v_after,v_cleanup_paths,
    case when cardinality(v_cleanup_paths)>0 then 'pending' else 'none' end
  );
  update k2_private.admin_command_receipts
  set result=jsonb_build_object(
    'sku',v_product.sku,'media',v_after,'cleanupPaths',to_jsonb(v_cleanup_paths)
  ),completed_at=clock_timestamp()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key
  returning result into v_after;
  return v_after;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ASSIGNMENT_INVALID';
end;
$$;
revoke all on function public.execute_admin_product_media_assignment_v1(text,bigint,uuid,uuid,text,text)
  from public,anon;
grant execute on function public.execute_admin_product_media_assignment_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

create or replace function public.complete_admin_product_media_cleanup_v1(
  p_action text,
  p_timestamp bigint,
  p_nonce uuid,
  p_idempotency_key uuid,
  p_payload_text text,
  p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid:=auth.uid();
  v_payload jsonb;
  v_request_id uuid;
  v_paths text[];
  v_event k2_private.product_media_events;
begin
  if p_action<>'product_media_cleanup_complete' then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ACTION_INVALID';
  end if;
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object'
     or not (v_payload ?& array['assignmentRequestId','objectPaths'])
     or (v_payload-array['assignmentRequestId','objectPaths'])<>'{}'::jsonb
     or jsonb_typeof(v_payload->'objectPaths')<>'array'
     or jsonb_array_length(v_payload->'objectPaths')>7 then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_CLEANUP_INVALID';
  end if;
  v_request_id:=(v_payload->>'assignmentRequestId')::uuid;
  select coalesce(array_agg(value order by value),'{}'::text[]) into v_paths
  from jsonb_array_elements_text(v_payload->'objectPaths') value;
  select * into v_event from k2_private.product_media_events
  where actor_id=v_actor and request_id=v_request_id for update;
  if not found or v_paths<>array(select unnest(v_event.cleanup_paths) order by 1) then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_CLEANUP_INVALID';
  end if;
  if exists(
    select 1 from storage.objects o
    where o.bucket_id='product-images' and o.name=any(v_event.cleanup_paths)
  ) then
    raise exception using errcode='55000',message='K2_ADMIN_MEDIA_CLEANUP_INCOMPLETE';
  end if;
  update k2_private.product_media_events
  set cleanup_status=case when cardinality(cleanup_paths)>0 then 'completed' else 'none' end,
      cleanup_completed_at=case when cardinality(cleanup_paths)>0 then clock_timestamp() else null end
  where id=v_event.id;
  return jsonb_build_object(
    'assignmentRequestId',v_request_id,
    'cleanupCompleted',cardinality(v_event.cleanup_paths)>0
  );
exception when invalid_text_representation then
  raise exception using errcode='22023',message='K2_ADMIN_MEDIA_CLEANUP_INVALID';
end;
$$;
revoke all on function public.complete_admin_product_media_cleanup_v1(text,bigint,uuid,uuid,text,text)
  from public,anon;
grant execute on function public.complete_admin_product_media_cleanup_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

create or replace function public.read_admin_product_media_orphans_v1(
  p_minimum_age_minutes integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_items jsonb; v_truncated boolean;
begin
  if not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  if p_minimum_age_minutes not between 60 and 10080 then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ORPHAN_RANGE_INVALID';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'objectPath',candidate.object_path,
    'createdAt',candidate.created_at,
    'contentType',candidate.content_type,
    'size',candidate.size
  ) order by candidate.created_at) filter(where candidate.row_number<=100),'[]'::jsonb),
    count(*)>100 into v_items,v_truncated
  from (
    select o.name object_path,o.created_at,
      coalesce(o.metadata->>'mimetype','application/octet-stream') content_type,
      coalesce((o.metadata->>'size')::bigint,0) size,
      row_number() over(order by o.created_at,o.name) row_number
    from storage.objects o
    join k2_private.admin_command_receipts r
      on r.action='product_media_upload' and r.completed_at is not null
      and r.result->>'objectPath'=o.name
    where o.bucket_id='product-images'
      and o.created_at<=clock_timestamp()-make_interval(mins=>p_minimum_age_minutes)
      and not exists(
        select 1 from public.products p
        where right(coalesce(p.primary_image_url,''),length('/storage/v1/object/public/product-images/'||o.name))
                ='/storage/v1/object/public/product-images/'||o.name
          or right(coalesce(p.image_url,''),length('/storage/v1/object/public/product-images/'||o.name))
                ='/storage/v1/object/public/product-images/'||o.name
          or exists(select 1 from unnest(coalesce(p.lifestyle_images,'{}'::text[])||coalesce(p.secondary_images,'{}'::text[])) u
            where right(u,length('/storage/v1/object/public/product-images/'||o.name))
              ='/storage/v1/object/public/product-images/'||o.name)
      )
    order by o.created_at,o.name
    limit 101
  ) candidate;
  return jsonb_build_object(
    'minimumAgeMinutes',p_minimum_age_minutes,
    'items',v_items,
    'truncated',v_truncated
  );
end;
$$;
revoke all on function public.read_admin_product_media_orphans_v1(integer) from public,anon;
grant execute on function public.read_admin_product_media_orphans_v1(integer) to authenticated;

create or replace function public.prepare_admin_product_media_orphan_cleanup_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid:=auth.uid(); v_payload jsonb; v_hash text;
  v_existing k2_private.admin_command_receipts; v_paths text[]; v_path text;
  v_reason text; v_result jsonb; v_inserted integer;
begin
  if p_action<>'product_media_orphan_cleanup' or not public.is_admin()
     or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_REQUIRED';
  end if;
  if not k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature) then
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' or not (v_payload ?& array['objectPaths','reason'])
     or (v_payload-array['objectPaths','reason'])<>'{}'::jsonb
     or jsonb_typeof(v_payload->'objectPaths')<>'array'
     or jsonb_array_length(v_payload->'objectPaths') not between 1 and 25 then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ORPHAN_INVALID';
  end if;
  v_reason:=trim(v_payload->>'reason');
  if length(v_reason) not between 3 and 500 then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ORPHAN_INVALID';
  end if;
  select array_agg(distinct value order by value) into v_paths
  from jsonb_array_elements_text(v_payload->'objectPaths') value;
  if cardinality(v_paths)<>jsonb_array_length(v_payload->'objectPaths') then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ORPHAN_INVALID';
  end if;
  v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  select * into v_existing from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.payload_hash<>v_hash then raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT'; end if;
    if v_existing.result is null then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS'; end if;
    return v_existing.result;
  end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS'; end if;
  foreach v_path in array v_paths loop
    if v_path!~'^[0-9a-f-]{36}/product-media/[0-9a-f-]{36}-[0-9a-f]{16}[.](jpg|png|webp)$'
       or not exists(select 1 from storage.objects o where o.bucket_id='product-images' and o.name=v_path
         and o.created_at<=clock_timestamp()-interval '1 hour')
       or not exists(select 1 from k2_private.admin_command_receipts r where r.action='product_media_upload'
         and r.completed_at is not null and r.result->>'objectPath'=v_path)
       or exists(select 1 from public.products p where
         right(coalesce(p.primary_image_url,''),length('/storage/v1/object/public/product-images/'||v_path))='/storage/v1/object/public/product-images/'||v_path
         or right(coalesce(p.image_url,''),length('/storage/v1/object/public/product-images/'||v_path))='/storage/v1/object/public/product-images/'||v_path
         or exists(select 1 from unnest(coalesce(p.lifestyle_images,'{}'::text[])||coalesce(p.secondary_images,'{}'::text[])) u
           where right(u,length('/storage/v1/object/public/product-images/'||v_path))='/storage/v1/object/public/product-images/'||v_path)) then
      raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ORPHAN_INVALID';
    end if;
  end loop;
  insert into k2_private.product_media_orphan_events(actor_id,request_id,reason,object_paths)
  values(v_actor,p_idempotency_key,v_reason,v_paths);
  v_result:=jsonb_build_object('objectPaths',to_jsonb(v_paths),'cleanupPending',true);
  update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
exception when invalid_text_representation then
  raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ORPHAN_INVALID';
end;
$$;
revoke all on function public.prepare_admin_product_media_orphan_cleanup_v1(text,bigint,uuid,uuid,text,text) from public,anon;
grant execute on function public.prepare_admin_product_media_orphan_cleanup_v1(text,bigint,uuid,uuid,text,text) to authenticated;

create or replace function public.complete_admin_product_media_orphan_cleanup_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,
  p_payload_text text,p_signature text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_payload jsonb; v_event k2_private.product_media_orphan_events; v_paths text[];
begin
  if p_action<>'product_media_orphan_cleanup_complete' or not public.is_admin()
     or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception using errcode='42501',message='K2_ADMIN_REQUIRED'; end if;
  if not k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature) then
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED'; end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' or not (v_payload ?& array['objectPaths'])
     or (v_payload-array['objectPaths'])<>'{}'::jsonb or jsonb_typeof(v_payload->'objectPaths')<>'array' then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ORPHAN_INVALID'; end if;
  select coalesce(array_agg(value order by value),'{}'::text[]) into v_paths
  from jsonb_array_elements_text(v_payload->'objectPaths') value;
  select * into v_event from k2_private.product_media_orphan_events
  where actor_id=v_actor and request_id=p_idempotency_key for update;
  if not found or v_paths<>array(select unnest(v_event.object_paths) order by 1) then
    raise exception using errcode='22023',message='K2_ADMIN_MEDIA_ORPHAN_INVALID'; end if;
  if exists(select 1 from storage.objects o where o.bucket_id='product-images' and o.name=any(v_event.object_paths)) then
    raise exception using errcode='55000',message='K2_ADMIN_MEDIA_CLEANUP_INCOMPLETE'; end if;
  update k2_private.product_media_orphan_events set cleanup_status='completed',cleanup_completed_at=clock_timestamp()
  where id=v_event.id;
  return jsonb_build_object('cleanupCompleted',true,'objectPaths',to_jsonb(v_event.object_paths));
end;
$$;
revoke all on function public.complete_admin_product_media_orphan_cleanup_v1(text,bigint,uuid,uuid,text,text) from public,anon;
grant execute on function public.complete_admin_product_media_orphan_cleanup_v1(text,bigint,uuid,uuid,text,text) to authenticated;

commit;
