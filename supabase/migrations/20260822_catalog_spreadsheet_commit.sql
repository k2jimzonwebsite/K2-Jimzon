-- Prepared MAP-023 signed catalog spreadsheet commit boundary.
-- Apply only in the coordinated Admin BFF cutover after the identity migration,
-- server secret, routes, flag, rollback rehearsal, and deployed denials are ready.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('k2_private.admin_command_receipts') is null then
    raise exception 'Admin BFF foundation must be applied first';
  end if;
  if to_regclass('public.products') is null
     or to_regprocedure('public.generate_k2_sku_internal()') is null then
    raise exception 'Product master and server SKU generator must exist';
  end if;
  if not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='products'
      and column_name in ('catalog_id','catalog_record_version')
    group by table_schema,table_name having count(*)=2
  ) then
    raise exception 'Catalog spreadsheet identity migration must be applied first';
  end if;
end
$preflight$;

create table if not exists k2_private.catalog_import_operations (
  operation_id uuid primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  file_sha256 text not null check(file_sha256 ~ '^[0-9a-f]{64}$'),
  template_version text not null check(template_version='k2-catalog-v1'),
  reason text not null check(length(trim(reason)) between 10 and 500),
  status text not null default 'in_progress' check(status in ('in_progress','completed')),
  last_chunk_index integer not null default -1,
  committed_row_count integer not null default 0 check(committed_row_count>=0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists k2_private.catalog_import_row_events (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references k2_private.catalog_import_operations(operation_id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  chunk_index integer not null check(chunk_index>=0),
  row_number integer not null check(row_number>=2),
  catalog_id uuid not null,
  sku text not null,
  outcome text not null check(outcome in ('created','updated')),
  reason text not null check(length(trim(reason)) between 10 and 500),
  before_data jsonb,
  after_data jsonb not null,
  operation_key uuid not null,
  created_at timestamptz not null default now(),
  unique(operation_id,row_number),
  unique(actor_id,operation_key,row_number)
);

create index if not exists catalog_import_operations_actor_created_idx
  on k2_private.catalog_import_operations(actor_id,created_at desc);

alter table k2_private.catalog_import_operations enable row level security;
alter table k2_private.catalog_import_operations force row level security;
alter table k2_private.catalog_import_row_events enable row level security;
alter table k2_private.catalog_import_row_events force row level security;
revoke all on table k2_private.catalog_import_operations from public,anon,authenticated;
revoke all on table k2_private.catalog_import_row_events from public,anon,authenticated;

create or replace function public.execute_admin_catalog_import_v1(
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
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_payload jsonb;
  v_payload_hash text;
  v_receipt k2_private.admin_command_receipts;
  v_operation k2_private.catalog_import_operations;
  v_item jsonb;
  v_values jsonb;
  v_existing public.products;
  v_saved public.products;
  v_before jsonb;
  v_after jsonb;
  v_results jsonb:='[]'::jsonb;
  v_reason text;
  v_file_hash text;
  v_template text;
  v_kind text;
  v_sku text;
  v_name text;
  v_catalog_id uuid;
  v_operation_id uuid;
  v_expected_version bigint;
  v_expected_updated_at timestamptz;
  v_chunk_index integer;
  v_final boolean;
  v_row_number integer;
  v_count integer;
  v_recent integer;
  v_inserted integer;
  v_key text;
begin
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  if p_action<>'catalog_import_chunk' then
    raise exception using errcode='22023',message='K2_ADMIN_ACTION_INVALID';
  end if;
  if v_actor is null or not public.is_staff()
     or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_AAL2_STAFF_REQUIRED';
  end if;

  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object'
     or not (v_payload ?& array[
       'operationId','fileSha256','templateVersion','chunkIndex','finalChunk','reason','rows'
     ])
     or (v_payload-array[
       'operationId','fileSha256','templateVersion','chunkIndex','finalChunk','reason','rows'
     ])<>'{}'::jsonb
     or jsonb_typeof(v_payload->'rows')<>'array'
     or jsonb_typeof(v_payload->'finalChunk')<>'boolean'
     or jsonb_typeof(v_payload->'chunkIndex')<>'number' then
    raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
  end if;

  v_operation_id:=(v_payload->>'operationId')::uuid;
  v_file_hash:=lower(v_payload->>'fileSha256');
  v_template:=v_payload->>'templateVersion';
  v_chunk_index:=(v_payload->>'chunkIndex')::integer;
  v_final:=(v_payload->>'finalChunk')::boolean;
  v_reason:=trim(v_payload->>'reason');
  v_count:=jsonb_array_length(v_payload->'rows');
  if v_file_hash!~'^[0-9a-f]{64}$' or v_template<>'k2-catalog-v1'
     or v_chunk_index not between 0 and 9999
     or length(v_reason) not between 10 and 500
     or v_count not between 1 and 50 then
    raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
  end if;

  v_payload_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  select * into v_receipt from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.payload_hash<>v_payload_hash then
      raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_receipt.result is null then
      raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_receipt.result;
  end if;

  select count(*)::integer into v_recent from k2_private.admin_command_receipts
  where actor_id=v_actor and action=p_action and created_at>now()-interval '1 minute';
  if v_recent>=10 then
    raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED';
  end if;
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash)
  values(v_actor,p_action,p_idempotency_key,v_payload_hash) on conflict do nothing;
  get diagnostics v_inserted=row_count;
  if v_inserted=0 then
    select * into v_receipt from k2_private.admin_command_receipts
    where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
    if v_receipt.payload_hash<>v_payload_hash then
      raise exception using errcode='22023',message='K2_ADMIN_IDEMPOTENCY_CONFLICT';
    end if;
    if v_receipt.result is null then
      raise exception using errcode='55000',message='K2_ADMIN_COMMAND_IN_PROGRESS';
    end if;
    return v_receipt.result;
  end if;

  insert into k2_private.catalog_import_operations(
    operation_id,actor_id,file_sha256,template_version,reason
  ) values(v_operation_id,v_actor,v_file_hash,v_template,v_reason)
  on conflict(operation_id) do nothing;
  select * into v_operation from k2_private.catalog_import_operations
  where operation_id=v_operation_id for update;
  if not found or v_operation.actor_id<>v_actor
     or v_operation.file_sha256<>v_file_hash
     or v_operation.template_version<>v_template
     or v_operation.reason<>v_reason
     or v_operation.status<>'in_progress' then
    raise exception using errcode='23514',message='K2_CATALOG_OPERATION_CONFLICT';
  end if;
  if v_chunk_index<>v_operation.last_chunk_index+1 then
    raise exception using errcode='23514',message='K2_CATALOG_CHUNK_SEQUENCE';
  end if;

  for v_item in select value from jsonb_array_elements(v_payload->'rows') loop
    if jsonb_typeof(v_item)<>'object'
       or not (v_item ?& array[
         'rowNumber','kind','catalogId','sku','expectedVersion','expectedUpdatedAt','values'
       ])
       or (v_item-array[
         'rowNumber','kind','catalogId','sku','expectedVersion','expectedUpdatedAt','values'
       ])<>'{}'::jsonb
       or jsonb_typeof(v_item->'values')<>'object' then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_values:=v_item->'values';
    if not (v_values ?& array[
      'name','description','usage_instructions','storage_instructions','ingredients',
      'allergens','country_of_origin','net_weight','package_type','subcategory',
      'seo_keywords','primary_image_url','product_video_url','internal_notes'
    ]) or (v_values-array[
      'name','description','usage_instructions','storage_instructions','ingredients',
      'allergens','country_of_origin','net_weight','package_type','subcategory',
      'seo_keywords','primary_image_url','product_video_url','internal_notes'
    ])<>'{}'::jsonb then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    for v_key in select jsonb_object_keys(v_values) loop
      if jsonb_typeof(v_values->v_key)<>'string' or length(v_values->>v_key)>4000 then
        raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
      end if;
    end loop;

    v_row_number:=(v_item->>'rowNumber')::integer;
    v_kind:=v_item->>'kind';
    v_name:=trim(v_values->>'name');
    if v_row_number<2 or v_kind not in ('new','update')
       or length(v_name) not between 1 and 140
       or (trim(v_values->>'net_weight')<>'' and
         trim(v_values->>'net_weight')!~'^[0-9]{1,9}([.][0-9]{1,3})?$')
       or (v_values->>'primary_image_url'<>'' and (
         length(v_values->>'primary_image_url')>2048 or v_values->>'primary_image_url'!~'^https://'
       ))
       or (v_values->>'product_video_url'<>'' and (
         length(v_values->>'product_video_url')>2048 or v_values->>'product_video_url'!~'^https://'
       )) then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;

    if v_kind='new' then
      if v_item->'catalogId'<>'null'::jsonb or v_item->'sku'<>'null'::jsonb
         or v_item->'expectedVersion'<>'null'::jsonb
         or v_item->'expectedUpdatedAt'<>'null'::jsonb then
        raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
      end if;
      v_sku:=public.generate_k2_sku_internal();
      insert into public.products(
        sku,name,title,status,published,description,usage_instructions,
        storage_instructions,ingredients,allergens,country_of_origin,net_weight,
        package_type,subcategory,seo_keywords,primary_image_url,
        product_video_url,internal_notes,created_at,updated_at
      ) values(
        v_sku,v_name,v_name,'Draft',false,nullif(trim(v_values->>'description'),''),
        nullif(trim(v_values->>'usage_instructions'),''),
        nullif(trim(v_values->>'storage_instructions'),''),
        nullif(trim(v_values->>'ingredients'),''),nullif(trim(v_values->>'allergens'),''),
        nullif(trim(v_values->>'country_of_origin'),''),nullif(trim(v_values->>'net_weight'),'')::numeric,
        nullif(trim(v_values->>'package_type'),''),nullif(trim(v_values->>'subcategory'),''),
        case when trim(v_values->>'seo_keywords')='' then '{}'::text[]
          else regexp_split_to_array(trim(v_values->>'seo_keywords'),'\s*[|]\s*') end,
        nullif(trim(v_values->>'primary_image_url'),''),
        nullif(trim(v_values->>'product_video_url'),''),
        nullif(trim(v_values->>'internal_notes'),''),now(),now()
      ) returning * into v_saved;
      v_before:=null;
    else
      if coalesce(v_item->>'catalogId','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
         or coalesce(v_item->>'sku','')=''
         or jsonb_typeof(v_item->'expectedVersion')<>'number'
         or coalesce(v_item->>'expectedUpdatedAt','')='' then
        raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
      end if;
      v_catalog_id:=(v_item->>'catalogId')::uuid;
      v_sku:=v_item->>'sku';
      v_expected_version:=(v_item->>'expectedVersion')::bigint;
      v_expected_updated_at:=(v_item->>'expectedUpdatedAt')::timestamptz;
      select * into v_existing from public.products
      where catalog_id=v_catalog_id and sku=v_sku for update;
      if not found or v_existing.catalog_record_version<>v_expected_version
         or v_existing.updated_at<>v_expected_updated_at then
        raise exception using errcode='40001',message='K2_CATALOG_STALE_CONFLICT';
      end if;
      v_before:=to_jsonb(v_existing);
      update public.products set
        name=v_name,title=v_name,
        description=nullif(trim(v_values->>'description'),''),
        usage_instructions=nullif(trim(v_values->>'usage_instructions'),''),
        storage_instructions=nullif(trim(v_values->>'storage_instructions'),''),
        ingredients=nullif(trim(v_values->>'ingredients'),''),
        allergens=nullif(trim(v_values->>'allergens'),''),
        country_of_origin=nullif(trim(v_values->>'country_of_origin'),''),
        net_weight=nullif(trim(v_values->>'net_weight'),'')::numeric,
        package_type=nullif(trim(v_values->>'package_type'),''),
        subcategory=nullif(trim(v_values->>'subcategory'),''),
        seo_keywords=case when trim(v_values->>'seo_keywords')='' then '{}'::text[]
          else regexp_split_to_array(trim(v_values->>'seo_keywords'),'\s*[|]\s*') end,
        primary_image_url=nullif(trim(v_values->>'primary_image_url'),''),
        product_video_url=nullif(trim(v_values->>'product_video_url'),''),
        internal_notes=nullif(trim(v_values->>'internal_notes'),'')
      where catalog_id=v_catalog_id returning * into v_saved;
    end if;

    v_after:=to_jsonb(v_saved);
    insert into k2_private.catalog_import_row_events(
      operation_id,actor_id,chunk_index,row_number,catalog_id,sku,outcome,reason,
      before_data,after_data,operation_key
    ) values(
      v_operation_id,v_actor,v_chunk_index,v_row_number,v_saved.catalog_id,v_saved.sku,
      case when v_kind='new' then 'created' else 'updated' end,v_reason,
      v_before,v_after,p_idempotency_key
    );
    v_results:=v_results||jsonb_build_array(jsonb_build_object(
      'rowNumber',v_row_number,'catalogId',v_saved.catalog_id,'sku',v_saved.sku,
      'outcome',case when v_kind='new' then 'created' else 'updated' end,
      'recordVersion',v_saved.catalog_record_version,'updatedAt',v_saved.updated_at
    ));
  end loop;

  update k2_private.catalog_import_operations set
    last_chunk_index=v_chunk_index,
    committed_row_count=committed_row_count+v_count,
    status=case when v_final then 'completed' else 'in_progress' end,
    updated_at=now(),completed_at=case when v_final then now() else null end
  where operation_id=v_operation_id returning * into v_operation;

  v_after:=jsonb_build_object(
    'operationId',v_operation_id,'chunkIndex',v_chunk_index,
    'status',v_operation.status,'committedRowCount',v_operation.committed_row_count,
    'rows',v_results
  );
  update k2_private.admin_command_receipts set result=v_after,completed_at=now()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_after;
exception
  when unique_violation then
    raise exception using errcode='23505',message='K2_CATALOG_OPERATION_CONFLICT';
end;
$$;

revoke all on function public.execute_admin_catalog_import_v1(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.execute_admin_catalog_import_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

create or replace function public.read_admin_catalog_import_status_v1(p_operation_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_operation k2_private.catalog_import_operations;
  v_rows jsonb;
begin
  if v_actor is null or not public.is_staff()
     or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_AAL2_STAFF_REQUIRED';
  end if;
  select * into v_operation from k2_private.catalog_import_operations
  where operation_id=p_operation_id and actor_id=v_actor;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'rowNumber',row_number,'catalogId',catalog_id,'sku',sku,'outcome',outcome,
    'recordVersion',(after_data->>'catalog_record_version')::bigint,
    'updatedAt',after_data->>'updated_at','chunkIndex',chunk_index
  ) order by chunk_index,row_number),'[]'::jsonb)
  into v_rows from k2_private.catalog_import_row_events
  where operation_id=p_operation_id and actor_id=v_actor;
  return jsonb_build_object(
    'operationId',v_operation.operation_id,'fileSha256',v_operation.file_sha256,
    'status',v_operation.status,'lastChunkIndex',v_operation.last_chunk_index,
    'committedRowCount',v_operation.committed_row_count,
    'createdAt',v_operation.created_at,'updatedAt',v_operation.updated_at,
    'completedAt',v_operation.completed_at,'rows',v_rows
  );
end;
$$;

revoke all on function public.read_admin_catalog_import_status_v1(uuid)
  from public,anon,authenticated;
grant execute on function public.read_admin_catalog_import_status_v1(uuid)
  to authenticated;

-- Coordinated cutover: every browser mutation is removed. BFF security-definer
-- commands remain the only product-write path after this migration is applied.
revoke insert,update,delete on table public.products from authenticated;

notify pgrst,'reload schema';
commit;
