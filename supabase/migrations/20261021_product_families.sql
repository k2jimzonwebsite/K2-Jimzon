-- MAP-023 / IDEA-20261021-03. Prepared only: requires exact K2 apply authorization.
-- Grouping never writes products, inventory, prices, publication or orders.
begin;

do $$ begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
    or to_regclass('k2_private.admin_command_receipts') is null
    or to_regclass('public.v_storefront_visible_skus') is null then
    raise exception 'K2_FAMILY_FOUNDATION_MISSING';
  end if;
end $$;

-- Admit exactly this new domain in the existing verifier; preserve its payload
-- ceiling, owner, grants, null/signature/AAL/rate/nonce logic byte for byte.
-- Refuse drift from the captured 21 October authority rather than guessing.
do $admit_action$ declare
  v_oid oid:='k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)'::regprocedure;
  v_before pg_catalog.pg_proc%rowtype;
  v_after pg_catalog.pg_proc%rowtype;
  v_definition text;
  v_changed text;
begin
  select * into v_before from pg_catalog.pg_proc where oid=v_oid;
  v_definition:=replace(pg_catalog.pg_get_functiondef(v_oid),E'\r\n',E'\n');
  if encode(extensions.digest(convert_to(v_definition,'UTF8'),'sha256'),'hex')<>'2a0eb828f53de5d9125fa18a38bbae7e503a60836597097dc3ba4d6a22f9c067' then
    raise exception 'K2_FAMILY_VERIFIER_DRIFT';
  end if;
  v_changed:=replace(v_definition,'''inbox_send_reply'', ''product_knowledge_save'',','''inbox_send_reply'', ''product_knowledge_save'', ''product_family_save'',');
  if v_changed=v_definition then raise exception 'K2_FAMILY_VERIFIER_DRIFT'; end if;
  execute v_changed;
  select * into v_after from pg_catalog.pg_proc where oid=v_oid;
  if replace(pg_catalog.pg_get_functiondef(v_oid),E'\r\n',E'\n')<>v_changed
    or v_before.proowner<>v_after.proowner or v_before.proacl is distinct from v_after.proacl
    or v_before.proconfig is distinct from v_after.proconfig then raise exception 'K2_FAMILY_VERIFIER_DRIFT'; end if;
end $admit_action$;

create table public.product_families (
  id uuid primary key,
  name text not null check (char_length(name) between 1 and 120),
  axes text[] not null check (cardinality(axes) between 0 and 6),
  version integer not null check (version > 0),
  updated_at timestamptz not null default now()
);
create table public.product_family_members (
  product_id uuid primary key references public.products(id) on delete cascade,
  family_id uuid not null references public.product_families(id),
  options jsonb not null check (jsonb_typeof(options)='object'),
  combination_key jsonb not null,
  unique(family_id,combination_key)
);
create index product_family_members_family_idx on public.product_family_members(family_id);
create table k2_private.product_family_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.product_families(id),
  actor_id uuid not null,
  before_state jsonb,
  after_state jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.product_families enable row level security;
alter table public.product_families force row level security;
alter table public.product_family_members enable row level security;
alter table public.product_family_members force row level security;
alter table k2_private.product_family_events enable row level security;
alter table k2_private.product_family_events force row level security;
revoke all on public.product_families,public.product_family_members,k2_private.product_family_events from public,anon,authenticated;
-- No client table policy or DML grant: all reads and writes use scoped routines.

create function public.read_storefront_product_families_v1(p_skus text[])
returns table(family_id uuid,family_name text,axes text[],sku text,options jsonb)
language plpgsql stable security definer set search_path=''
as $$ begin
  if coalesce(cardinality(p_skus),0)>1000 then raise exception 'K2_FAMILY_INVALID'; end if;
  return query
  select f.id,f.name,f.axes,p.sku,m.options
  from public.product_families f
  join public.product_family_members m on m.family_id=f.id
  join public.products p on p.id=m.product_id
  where p.sku=any(p_skus) and p.published is true and p.status::text in ('Live','Active')
    and exists(select 1 from public.v_storefront_visible_skus w where w.sku=p.sku)
    -- Recheck even hidden members: later initial-taxonomy assignment must not
    -- leave a cross-brand/category family visible under stale grouping metadata.
    and not exists(select 1 from public.product_family_members x join public.products other on other.id=x.product_id
      where x.family_id=f.id and (other.brand_id,other.category_id) is distinct from (p.brand_id,p.category_id))
  order by f.id,p.sku;
end $$;

create function public.read_admin_product_families_v1(p_skus text[],p_family_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=''
as $$ declare
  v_ids uuid[];
  v_id uuid;
  v_family jsonb;
  v_products jsonb;
begin
  if auth.uid() is null or not coalesce(public.is_admin(),false) or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception 'K2_FAMILY_ADMIN_REQUIRED';
  end if;
  if coalesce(cardinality(p_skus),0)>100 or (p_family_id is null and coalesce(cardinality(p_skus),0)=0) then raise exception 'K2_FAMILY_INVALID'; end if;
  if (select count(*) from public.products p where p.sku=any(p_skus))<>coalesce(cardinality(p_skus),0) then raise exception 'K2_FAMILY_PRODUCT_MISSING'; end if;
  select array_agg(distinct m.family_id) into v_ids from public.product_family_members m join public.products p on p.id=m.product_id where p.sku=any(p_skus);
  if coalesce(cardinality(v_ids),0)>1 or (p_family_id is not null and exists(select 1 from unnest(v_ids) x where x<>p_family_id)) then raise exception 'K2_FAMILY_MIXED'; end if;
  v_id:=coalesce(p_family_id,v_ids[1]);
  select jsonb_build_object('id',f.id,'name',f.name,'axes',f.axes,'version',f.version,
    'taxonomyConsistent',(select count(distinct (p.brand_id,p.category_id))<=1 from public.product_family_members m join public.products p on p.id=m.product_id where m.family_id=f.id),
    'members',coalesce((select jsonb_agg(jsonb_build_object('sku',p.sku,'name',p.name,'options',m.options) order by p.sku)
      from public.product_family_members m join public.products p on p.id=m.product_id where m.family_id=f.id),'[]'::jsonb)) into v_family
  from public.product_families f where f.id=v_id;
  select coalesce(jsonb_agg(jsonb_build_object('sku',p.sku,'name',p.name) order by p.sku),'[]'::jsonb) into v_products from public.products p where p.sku=any(p_skus);
  return jsonb_build_object('family',v_family,'products',v_products);
end $$;

create function public.execute_admin_product_family_v1(
  p_action text,p_timestamp bigint,p_nonce uuid,p_idempotency_key uuid,p_payload_text text,p_signature text
) returns jsonb language plpgsql security definer set search_path=''
as $$ declare
  v_actor uuid:=auth.uid();
  v_payload jsonb;
  v_hash text;
  v_receipt k2_private.admin_command_receipts;
  v_id uuid;
  v_expected integer;
  v_version integer;
  v_name text;
  v_axes text[];
  v_skus text[];
  v_member jsonb;
  v_axis text;
  v_value text;
  v_product uuid;
  v_combination jsonb;
  v_before jsonb;
  v_after jsonb;
  v_result jsonb;
begin
  if v_actor is null or not coalesce(public.is_admin(),false) or coalesce(auth.jwt()->>'aal','')<>'aal2' then raise exception 'K2_FAMILY_ADMIN_REQUIRED'; end if;
  if p_action is distinct from 'product_family_save' or not coalesce(k2_private.verify_admin_bff_request(p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature),false) then
    raise exception 'K2_ADMIN_REQUEST_REPLAYED';
  end if;
  -- Low-volume staff grouping shares one lock before product locks or receipts.
  -- This also serializes simultaneous claims of the same ungrouped SKU.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('k2-product-families-v1',0));
  v_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  select * into v_receipt from k2_private.admin_command_receipts where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.payload_hash is distinct from v_hash then raise exception 'K2_ADMIN_IDEMPOTENCY_CONFLICT'; end if;
    if v_receipt.result is null then raise exception 'K2_ADMIN_COMMAND_IN_PROGRESS'; end if;
    return v_receipt.result;
  end if;
  v_payload:=p_payload_text::jsonb;
  if octet_length(p_payload_text)>16000 or jsonb_typeof(v_payload) is distinct from 'object'
    or (v_payload-array['familyId','expectedVersion','name','axes','members'])<>'{}'::jsonb
    or not (v_payload ?& array['familyId','expectedVersion','name','axes','members'])
    or jsonb_typeof(v_payload->'axes') is distinct from 'array' or jsonb_typeof(v_payload->'members') is distinct from 'array'
    or jsonb_typeof(v_payload->'name') is distinct from 'string' or jsonb_typeof(v_payload->'familyId') is distinct from 'string'
    or jsonb_typeof(v_payload->'expectedVersion') is distinct from 'number'
    or coalesce(v_payload->>'expectedVersion','') !~ '^(0|[1-9][0-9]{0,9})$' then raise exception 'K2_FAMILY_INVALID'; end if;
  if (v_payload->>'expectedVersion')::bigint>2147483646 then raise exception 'K2_FAMILY_INVALID'; end if;
  v_expected:=(v_payload->>'expectedVersion')::integer;
  begin v_id:=(v_payload->>'familyId')::uuid; exception when invalid_text_representation then raise exception 'K2_FAMILY_INVALID'; end;
  v_name:=v_payload->>'name';
  if v_id is null or char_length(v_name) not between 1 and 120 or v_name<>btrim(v_name) or v_name<>normalize(v_name,NFC) or v_name~'[[:cntrl:]]' then raise exception 'K2_FAMILY_INVALID'; end if;
  if jsonb_array_length(v_payload->'axes')>6 or jsonb_array_length(v_payload->'members')>100 then raise exception 'K2_FAMILY_INVALID'; end if;
  if exists(select 1 from jsonb_array_elements(v_payload->'axes') x where jsonb_typeof(x)<>'string') then raise exception 'K2_FAMILY_INVALID'; end if;
  select coalesce(array_agg(x),'{}'::text[]) into v_axes from jsonb_array_elements_text(v_payload->'axes') x;
  if exists(select 1 from unnest(v_axes) x where char_length(x) not between 1 and 40 or x<>btrim(x) or x<>normalize(x,NFC) or x~'[[:cntrl:]]')
    or (select count(distinct lower(x)) from unnest(v_axes) x)<>cardinality(v_axes)
    or (jsonb_array_length(v_payload->'members')>0 and cardinality(v_axes)=0) then raise exception 'K2_FAMILY_INVALID'; end if;
  select coalesce(array_agg(x->>'sku'),'{}'::text[]) into v_skus from jsonb_array_elements(v_payload->'members') x;
  if exists(select 1 from unnest(v_skus) x where x is null or x!~'^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$')
    or (select count(distinct x) from unnest(v_skus) x)<>cardinality(v_skus) then raise exception 'K2_FAMILY_INVALID'; end if;
  select version into v_version from public.product_families where id=v_id;
  if coalesce(v_version,0)<>v_expected then raise exception 'K2_FAMILY_VERSION_CONFLICT'; end if;
  perform 1 from public.products p where p.sku=any(v_skus) or p.id in(select product_id from public.product_family_members where family_id=v_id) order by p.id for share;
  if (select count(*) from public.products where sku=any(v_skus))<>cardinality(v_skus) then raise exception 'K2_FAMILY_PRODUCT_MISSING'; end if;
  if (select count(distinct (brand_id,category_id)) from public.products where sku=any(v_skus))>1 then raise exception 'K2_FAMILY_TAXONOMY'; end if;
  if exists(select 1 from public.product_family_members m join public.products p on p.id=m.product_id where p.sku=any(v_skus) and m.family_id<>v_id) then raise exception 'K2_FAMILY_MEMBERSHIP_CONFLICT'; end if;
  v_before:=public.read_admin_product_families_v1('{}',v_id)->'family';
  insert into public.product_families(id,name,axes,version) values(v_id,v_name,v_axes,1)
  on conflict(id) do update set name=excluded.name,axes=excluded.axes,version=product_families.version+1,updated_at=now();
  delete from public.product_family_members where family_id=v_id;
  for v_member in select * from jsonb_array_elements(v_payload->'members') loop
    if jsonb_typeof(v_member) is distinct from 'object' or not(v_member ?& array['sku','options']) or (v_member-array['sku','options'])<>'{}'::jsonb
      or jsonb_typeof(v_member->'sku') is distinct from 'string' or jsonb_typeof(v_member->'options') is distinct from 'object' then raise exception 'K2_FAMILY_INVALID'; end if;
    if (select count(*) from jsonb_object_keys(v_member->'options'))<>cardinality(v_axes) or not((v_member->'options') ?& v_axes) then raise exception 'K2_FAMILY_INVALID'; end if;
    v_combination:='[]'::jsonb;
    foreach v_axis in array v_axes loop
      v_value:=v_member->'options'->>v_axis;
      if jsonb_typeof(v_member->'options'->v_axis) is distinct from 'string' or char_length(v_value) not between 1 and 80
        or v_value<>btrim(v_value) or v_value<>normalize(v_value,NFC) or v_value~'[[:cntrl:]]' then raise exception 'K2_FAMILY_INVALID'; end if;
      if exists(select 1 from public.product_family_members m where m.family_id=v_id and lower(m.options->>v_axis)=lower(v_value) and m.options->>v_axis<>v_value) then raise exception 'K2_FAMILY_INVALID'; end if;
      v_combination:=v_combination || jsonb_build_array(lower(v_value));
    end loop;
    if exists(select 1 from public.product_family_members where family_id=v_id and combination_key=v_combination) then raise exception 'K2_FAMILY_INVALID'; end if;
    select id into strict v_product from public.products where sku=v_member->>'sku';
    insert into public.product_family_members(product_id,family_id,options,combination_key) values(v_product,v_id,v_member->'options',v_combination);
  end loop;
  v_after:=public.read_admin_product_families_v1('{}',v_id)->'family';
  insert into k2_private.product_family_events(family_id,actor_id,before_state,after_state) values(v_id,v_actor,v_before,v_after);
  v_result:=jsonb_build_object('familyId',v_id,'version',v_expected+1,'memberCount',cardinality(v_skus));
  insert into k2_private.admin_command_receipts(actor_id,action,idempotency_key,payload_hash,result,completed_at) values(v_actor,p_action,p_idempotency_key,v_hash,v_result,now());
  return v_result;
end $$;

revoke all on function public.read_storefront_product_families_v1(text[]) from public,anon,authenticated;
revoke all on function public.read_admin_product_families_v1(text[],uuid) from public,anon,authenticated;
revoke all on function public.execute_admin_product_family_v1(text,bigint,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.read_storefront_product_families_v1(text[]) to anon,authenticated;
grant execute on function public.read_admin_product_families_v1(text[],uuid) to authenticated;
grant execute on function public.execute_admin_product_family_v1(text,bigint,uuid,uuid,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
