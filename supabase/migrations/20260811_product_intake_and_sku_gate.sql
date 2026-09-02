-- K2 Jimzon MAP-018: secure phone-first product intake and publication gate.
-- Prepared against the live 12 August 2026 schema. Do not apply before the
-- MAP-016 credential-recovery and MAP-017 public-boundary gates are satisfied.

begin;

create sequence if not exists public.k2_sku_seq start with 1001;
revoke all on sequence public.k2_sku_seq from public, anon, authenticated;

alter table public.product_batches add column if not exists unit_cost numeric;
alter table public.product_batches add column if not exists owner_code text;
alter table public.product_batches add column if not exists source_type text;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.product_batches'::regclass
      and conname = 'product_batches_unit_cost_check') then
    alter table public.product_batches add constraint product_batches_unit_cost_check
      check (unit_cost is null or unit_cost >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.product_batches'::regclass
      and conname = 'product_batches_source_type_check') then
    alter table public.product_batches add constraint product_batches_source_type_check
      check (source_type is null or source_type in (
        'consignment', 'supplier_receipt', 'opening_balance', 'legacy'
      ));
  end if;
end $$;

create table if not exists public.product_intake_sessions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  session_code text not null unique
    default ('INT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  barcode text,
  scanned_identity text not null default '',
  checklist_step text not null default 'identify'
    check (checklist_step in (
      'identify', 'packaging_evidence', 'research_handoff', 'field_review',
      'draft_saved', 'first_inventory', 'publication_review', 'completed'
    )),
  category_type text
    check (category_type is null or category_type in ('food', 'beauty', 'household')),
  packaging_images jsonb not null default '[]'::jsonb
    check (jsonb_typeof(packaging_images) = 'array'),
  evidence_checklist jsonb not null default '{}'::jsonb
    check (jsonb_typeof(evidence_checklist) = 'object'),
  draft_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(draft_payload) = 'object'),
  field_decisions jsonb not null default '{}'::jsonb
    check (jsonb_typeof(field_decisions) = 'object'),
  field_provenance jsonb not null default '{}'::jsonb
    check (jsonb_typeof(field_provenance) = 'object'),
  unknown_fields text[] not null default '{}',
  assigned_sku text,
  product_id uuid references public.products(id) on delete restrict,
  inventory_request_id uuid unique,
  inventory_result jsonb,
  status text not null default 'active'
    check (status in ('active', 'completed', 'abandoned')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint product_intake_session_product_pair check (
    (product_id is null and assigned_sku is null)
    or (product_id is not null and assigned_sku is not null)
  )
);

create index if not exists product_intake_sessions_owner_active_idx
  on public.product_intake_sessions (created_by, updated_at desc)
  where status = 'active';
create index if not exists product_intake_sessions_barcode_idx
  on public.product_intake_sessions (barcode)
  where barcode is not null;

create or replace function public.touch_product_intake_session()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_product_intake_session on public.product_intake_sessions;
create trigger trg_touch_product_intake_session
before update on public.product_intake_sessions
for each row execute function public.touch_product_intake_session();

alter table public.product_intake_sessions enable row level security;
alter table public.product_intake_sessions force row level security;

drop policy if exists product_intake_select_owner_or_admin on public.product_intake_sessions;
create policy product_intake_select_owner_or_admin
on public.product_intake_sessions for select to authenticated
using (
  public.is_staff()
  and (created_by = auth.uid() or public.is_admin())
);

drop policy if exists product_intake_insert_owner on public.product_intake_sessions;
create policy product_intake_insert_owner
on public.product_intake_sessions for insert to authenticated
with check (public.is_staff() and created_by = auth.uid());

drop policy if exists product_intake_update_owner_or_admin on public.product_intake_sessions;
create policy product_intake_update_owner_or_admin
on public.product_intake_sessions for update to authenticated
using (
  public.is_staff()
  and (created_by = auth.uid() or public.is_admin())
)
with check (
  public.is_staff()
  and (created_by = auth.uid() or public.is_admin())
);

revoke all on table public.product_intake_sessions from public, anon, authenticated;
grant select on table public.product_intake_sessions to authenticated;
grant insert (
  request_id, barcode, scanned_identity, checklist_step, category_type,
  packaging_images, evidence_checklist, draft_payload, field_decisions,
  field_provenance, unknown_fields
) on public.product_intake_sessions to authenticated;
grant update (
  barcode, scanned_identity, checklist_step, category_type, packaging_images,
  evidence_checklist, draft_payload, field_decisions, field_provenance,
  unknown_fields, updated_at
) on public.product_intake_sessions to authenticated;

-- Private evidence bucket. Browser access is authenticated, staff-scoped, and
-- owner-folder-scoped. MAP-020 adds server-side magic-byte/decode validation.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-intake-evidence',
  'product-intake-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists product_intake_evidence_staff_read on storage.objects;
create policy product_intake_evidence_staff_read
on storage.objects for select to authenticated
using (
  bucket_id = 'product-intake-evidence'
  and public.is_staff()
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists product_intake_evidence_owner_insert on storage.objects;
create policy product_intake_evidence_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-intake-evidence'
  and public.is_staff()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists product_intake_evidence_owner_update on storage.objects;
create policy product_intake_evidence_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'product-intake-evidence'
  and public.is_staff()
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
)
with check (
  bucket_id = 'product-intake-evidence'
  and public.is_staff()
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

drop policy if exists product_intake_evidence_owner_delete on storage.objects;
create policy product_intake_evidence_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-intake-evidence'
  and public.is_staff()
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
);

create or replace function public.generate_k2_sku_internal()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sku text;
begin
  loop
    v_sku := 'K2-SKU-' || lpad(nextval('public.k2_sku_seq'::regclass)::text, 6, '0');
    exit when not exists (
      select 1 from public.products where upper(sku) = upper(v_sku)
    );
  end loop;
  return v_sku;
end;
$$;
revoke all on function public.generate_k2_sku_internal() from public, anon, authenticated;

create or replace function public.sync_product_publication_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is null then new.status := 'Draft'; end if;
  new.published := new.status = 'Live';
  return new;
end;
$$;

drop trigger if exists trg_sync_product_publication_status on public.products;
create trigger trg_sync_product_publication_status
before insert or update of status, published on public.products
for each row execute function public.sync_product_publication_status();

alter table public.products drop constraint if exists products_status_check;
alter table public.products add constraint products_status_check check (
  status::text in ('Live', 'Active', 'Under Review', 'Unlisted', 'Draft', 'Discontinued')
);

create or replace function public.create_product_draft_server(
  p_session_id uuid,
  p_request_id uuid,
  p_reviewed_payload jsonb,
  p_field_decisions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.product_intake_sessions%rowtype;
  v_product jsonb;
  v_name text;
  v_sku text;
  v_slug text;
  v_product_id uuid;
  v_brand_id uuid;
  v_category_id uuid;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception using errcode = '42501', message = 'K2_STAFF_REQUIRED';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception using errcode = '42501', message = 'K2_AAL2_REQUIRED';
  end if;
  if jsonb_typeof(p_reviewed_payload) <> 'object'
     or jsonb_typeof(p_field_decisions) <> 'object' then
    raise exception using errcode = '22023', message = 'K2_INVALID_REVIEW_PAYLOAD';
  end if;

  select * into v_session
  from public.product_intake_sessions
  where id = p_session_id
    and status = 'active'
    and (created_by = auth.uid() or public.is_admin())
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'K2_INTAKE_SESSION_NOT_FOUND';
  end if;
  if v_session.request_id <> p_request_id then
    raise exception using errcode = '22023', message = 'K2_REQUEST_ID_MISMATCH';
  end if;
  if v_session.product_id is not null then
    return jsonb_build_object(
      'success', true, 'idempotent', true,
      'product_id', v_session.product_id, 'sku', v_session.assigned_sku
    );
  end if;
  if v_session.checklist_step <> 'draft_saved'
     or p_reviewed_payload -> 'meta' ->> 'schemaVersion' <> 'k2.product-content.v3'
     or p_field_decisions ->> 'name' <> 'accepted' then
    raise exception using errcode = '23514', message = 'K2_DRAFT_REVIEW_GATE_INCOMPLETE';
  end if;
  if octet_length(p_reviewed_payload::text) > 131072
     or octet_length(p_field_decisions::text) > 32768 then
    raise exception using errcode = '22023', message = 'K2_DRAFT_PAYLOAD_TOO_LARGE';
  end if;
  if (select count(*) from jsonb_array_elements(v_session.packaging_images) image
      where image ->> 'slot' in ('PRIMARY', 'BACK', 'BARCODE')
        and image ->> 'upload_status' = 'uploaded') <> 3
     or coalesce(v_session.evidence_checklist ->> 'ingredients', '') <> 'true'
     or coalesce(v_session.evidence_checklist ->> 'allergens', '') <> 'true'
     or coalesce(v_session.evidence_checklist ->> 'storage', '') <> 'true'
     or coalesce(v_session.evidence_checklist ->> 'expiry', '') <> 'true' then
    raise exception using errcode = '23514', message = 'K2_EVIDENCE_GATE_INCOMPLETE';
  end if;

  v_product := p_reviewed_payload -> 'product';
  if jsonb_typeof(v_product) <> 'object' then
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
  if exists (
    select 1 from public.products
    where barcode is not null
      and lower(barcode) = lower(coalesce(v_product ->> 'barcode', v_session.barcode))
  ) then
    raise exception using errcode = '23505', message = 'K2_DUPLICATE_BARCODE';
  end if;
  if exists (select 1 from public.products where lower(name) = lower(v_name))
     and not (
       v_session.field_provenance -> 'duplicate_resolution' ->> 'decision' = 'confirmed_distinct_variant'
       and length(trim(coalesce(v_session.field_provenance -> 'duplicate_resolution' ->> 'reason', ''))) >= 10
     ) then
    raise exception using errcode = '23505', message = 'K2_DUPLICATE_NAME_REQUIRES_RESOLUTION';
  end if;

  select id into v_brand_id from public.brands
  where lower(name) = lower(nullif(trim(v_product ->> 'brand'), ''))
  order by created_at nulls last, id limit 1;
  select id into v_category_id from public.categories
  where lower(name) = lower(nullif(trim(v_product ->> 'category'), ''))
  order by created_at nulls last, id limit 1;

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
    nullif(trim(coalesce(v_product ->> 'barcode', v_session.barcode)), ''),
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

  insert into public.audit_logs (
    table_name, record_id, action, old_data, new_data, user_id
  ) values (
    'products', v_product_id::text, 'CREATE_PRODUCT_DRAFT', null,
    jsonb_build_object(
      'sku', v_sku, 'status', 'Draft', 'intake_session_id', p_session_id,
      'brand_resolved', v_brand_id is not null,
      'category_resolved', v_category_id is not null
    ),
    auth.uid()
  );

  return jsonb_build_object(
    'success', true, 'idempotent', false,
    'product_id', v_product_id, 'sku', v_sku, 'status', 'Draft'
  );
end;
$$;

revoke all on function public.create_product_draft_server(uuid, uuid, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_product_draft_server(uuid, uuid, jsonb, jsonb)
  to authenticated;

create or replace function public.create_product_first_inventory_server(
  p_session_id uuid,
  p_request_id uuid,
  p_source text,
  p_inventory jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.product_intake_sessions%rowtype;
  v_quantity integer;
  v_expiry date;
  v_unit_cost numeric;
  v_result jsonb;
  v_batches jsonb;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception using errcode = '42501', message = 'K2_STAFF_REQUIRED';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception using errcode = '42501', message = 'K2_AAL2_REQUIRED';
  end if;
  if p_source not in ('flight', 'receipt', 'reconciliation')
     or jsonb_typeof(p_inventory) <> 'object' then
    raise exception using errcode = '22023', message = 'K2_INVENTORY_SOURCE_INVALID';
  end if;

  select * into v_session
  from public.product_intake_sessions
  where id = p_session_id
    and status = 'active'
    and product_id is not null
    and (created_by = auth.uid() or public.is_admin())
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'K2_INTAKE_PRODUCT_NOT_FOUND';
  end if;
  if v_session.inventory_request_id = p_request_id and v_session.inventory_result is not null then
    return v_session.inventory_result || jsonb_build_object('idempotent', true);
  end if;
  if v_session.inventory_request_id is not null then
    raise exception using errcode = '23505', message = 'K2_FIRST_INVENTORY_ALREADY_RECORDED';
  end if;
  if v_session.checklist_step <> 'first_inventory' then
    raise exception using errcode = '23514', message = 'K2_INVENTORY_GATE_INCOMPLETE';
  end if;

  begin
    v_quantity := (p_inventory ->> 'quantity')::integer;
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'K2_QUANTITY_INVALID';
  end;
  if coalesce(v_quantity, 0) < 1 or v_quantity > 100000 then
    raise exception using errcode = '22023', message = 'K2_QUANTITY_INVALID';
  end if;
  begin
    v_expiry := nullif(p_inventory ->> 'expiryDate', '')::date;
  exception when invalid_datetime_format then
    raise exception using errcode = '22023', message = 'K2_EXPIRY_INVALID';
  end;
  begin
    v_unit_cost := coalesce(nullif(p_inventory ->> 'unitCost', '')::numeric, 0);
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'K2_UNIT_COST_INVALID';
  end;
  if v_unit_cost < 0 or v_unit_cost > 10000000 then
    raise exception using errcode = '22023', message = 'K2_UNIT_COST_INVALID';
  end if;

  if p_source = 'flight' then
    if nullif(p_inventory ->> 'consignmentId', '') is null
       or nullif(trim(p_inventory ->> 'boxCode'), '') is null
       or nullif(trim(p_inventory ->> 'batchCode'), '') is null
       or v_expiry is null then
      raise exception using errcode = '22023', message = 'K2_FLIGHT_FIELDS_REQUIRED';
    end if;
    select to_jsonb(public.add_consignment_item_v2(
      (p_inventory ->> 'consignmentId')::uuid,
      v_session.assigned_sku,
      trim(p_inventory ->> 'batchCode'),
      trim(p_inventory ->> 'boxCode'),
      v_expiry,
      v_quantity
    )) into v_result;
    v_result := jsonb_build_object(
      'success', true, 'idempotent', false, 'action', 'flight_manifest_line_added',
      'manifest_line', v_result
    );
  elsif p_source = 'reconciliation' then
    if not public.is_admin() then
      raise exception using errcode = '42501', message = 'K2_ADMIN_RECONCILIATION_REQUIRED';
    end if;
    if nullif(trim(p_inventory ->> 'reason'), '') is null
       or nullif(trim(p_inventory ->> 'boxCode'), '') is null
       or nullif(trim(p_inventory ->> 'batchCode'), '') is null
       or nullif(trim(p_inventory ->> 'ownerCode'), '') is null then
      raise exception using errcode = '22023', message = 'K2_RECONCILIATION_FIELDS_REQUIRED';
    end if;
    if not exists (
         select 1 from public.hubs h
         where h.id = trim(p_inventory ->> 'hubLocation')
       ) or not exists (
         select 1 from public.custodians c
         where c.id = trim(p_inventory ->> 'custodian')
           and c.hub_id = trim(p_inventory ->> 'hubLocation')
       ) then
      raise exception using errcode = '22023', message = 'K2_RECONCILIATION_IDENTITY_INVALID';
    end if;
    v_batches := jsonb_build_array(jsonb_build_object(
      'box_code', trim(p_inventory ->> 'boxCode'),
      'batch_code', trim(p_inventory ->> 'batchCode'),
      'quantity', v_quantity,
      'expiry_date', case when coalesce(p_inventory ->> 'isNonExpiry', '') = 'true'
        then null else v_expiry end,
      'hub', nullif(trim(p_inventory ->> 'hubLocation'), ''),
      'custodian', nullif(trim(p_inventory ->> 'custodian'), ''),
      'channel', 'opening_balance',
      'inventory_status', case
        when coalesce(p_inventory ->> 'isNonExpiry', '') = 'true' then 'quarantine'
        when v_expiry >= current_date + 90 then 'available'
        else 'quarantine' end
    ));
    perform public.reconcile_product_batches(
      v_session.assigned_sku, v_batches, trim(p_inventory ->> 'reason')
    );
    update public.product_batches set
      unit_cost = v_unit_cost,
      owner_code = trim(p_inventory ->> 'ownerCode'),
      source_type = 'opening_balance',
      updated_at = now()
    where id = (
      select id from public.product_batches
      where sku = v_session.assigned_sku
        and box_code = trim(p_inventory ->> 'boxCode')
        and batch_code = trim(p_inventory ->> 'batchCode')
      order by created_at desc, id desc limit 1
    );
    v_result := jsonb_build_object(
      'success', true, 'idempotent', false, 'action', 'opening_balance_reconciled',
      'quantity', v_quantity
    );
  else
    raise exception using errcode = '0A000', message = 'K2_SUPPLIER_RECEIPT_WORKFLOW_UNAVAILABLE';
  end if;

  update public.product_intake_sessions set
    inventory_request_id = p_request_id,
    inventory_result = v_result,
    checklist_step = 'publication_review'
  where id = p_session_id;

  insert into public.audit_logs (
    table_name, record_id, action, old_data, new_data, user_id
  ) values (
    'product_intake_sessions', p_session_id::text, 'CREATE_FIRST_INVENTORY_SOURCE',
    null,
    jsonb_build_object('product_id', v_session.product_id, 'sku', v_session.assigned_sku,
      'source', p_source, 'result', v_result),
    auth.uid()
  );
  return v_result;
end;
$$;

revoke all on function public.create_product_first_inventory_server(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_product_first_inventory_server(uuid, uuid, text, jsonb)
  to authenticated;

create or replace function public.transition_product_publication_server(
  p_session_id uuid,
  p_requested_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.product_intake_sessions%rowtype;
  v_product public.products%rowtype;
  v_target text;
  v_old_status text;
  v_missing text[] := '{}';
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception using errcode = '42501', message = 'K2_STAFF_REQUIRED';
  end if;
  if coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then
    raise exception using errcode = '42501', message = 'K2_AAL2_REQUIRED';
  end if;
  v_target := case lower(trim(coalesce(p_requested_status, '')))
    when 'draft' then 'Draft'
    when 'under_review' then 'Under Review'
    when 'live' then 'Live'
    when 'unlisted' then 'Unlisted'
    when 'discontinued' then 'Discontinued'
    else null end;
  if v_target is null then
    raise exception using errcode = '22023', message = 'K2_PUBLICATION_STATUS_INVALID';
  end if;

  select * into v_session
  from public.product_intake_sessions
  where id = p_session_id
    and product_id is not null
    and (created_by = auth.uid() or public.is_admin())
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'K2_INTAKE_PRODUCT_NOT_FOUND';
  end if;
  select * into v_product from public.products where id = v_session.product_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'K2_PRODUCT_NOT_FOUND';
  end if;
  v_old_status := v_product.status;

  if v_target = 'Under Review' and not exists (
    select 1
    from jsonb_array_elements(v_session.packaging_images) image
    where image ->> 'slot' = 'PRIMARY' and image ->> 'upload_status' = 'uploaded'
  ) then
    v_missing := array_append(v_missing, 'verified_primary_evidence');
  end if;
  if v_target = 'Live' then
    if nullif(trim(v_product.name), '') is null then v_missing := array_append(v_missing, 'name'); end if;
    if v_product.brand_id is null then v_missing := array_append(v_missing, 'brand'); end if;
    if v_product.category_id is null then v_missing := array_append(v_missing, 'category'); end if;
    if coalesce(v_product.srp, v_product.retail_price, 0) <= 0 then v_missing := array_append(v_missing, 'price'); end if;
    if nullif(trim(v_product.primary_image_url), '') is null then v_missing := array_append(v_missing, 'primary_image'); end if;
    if not coalesce(v_product.is_human_reviewed, false) then v_missing := array_append(v_missing, 'human_review'); end if;
    if v_product.status <> 'Under Review' then v_missing := array_append(v_missing, 'under_review_state'); end if;
  end if;
  if cardinality(v_missing) > 0 then
    raise exception using errcode = '23514',
      message = 'K2_PUBLICATION_NOT_READY', detail = array_to_string(v_missing, ',');
  end if;
  if (v_product.status, v_target) not in (
    ('Draft', 'Draft'), ('Draft', 'Under Review'),
    ('Under Review', 'Under Review'), ('Under Review', 'Draft'),
    ('Under Review', 'Live'), ('Under Review', 'Unlisted'),
    ('Live', 'Live'), ('Live', 'Unlisted'), ('Live', 'Discontinued'),
    ('Unlisted', 'Unlisted'), ('Unlisted', 'Live'), ('Unlisted', 'Discontinued'),
    ('Discontinued', 'Discontinued')
  ) then
    raise exception using errcode = '23514', message = 'K2_PUBLICATION_TRANSITION_INVALID';
  end if;

  update public.products set status = v_target, updated_at = now()
  where id = v_product.id;
  update public.product_intake_sessions set
    checklist_step = 'publication_review',
    status = case when v_target in ('Live', 'Discontinued') then 'completed' else status end,
    completed_at = case when v_target in ('Live', 'Discontinued') then now() else completed_at end
  where id = p_session_id;
  insert into public.audit_logs (
    table_name, record_id, action, old_data, new_data, user_id
  ) values (
    'products', v_product.id::text, 'TRANSITION_PUBLICATION',
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', v_target, 'intake_session_id', p_session_id),
    auth.uid()
  );
  return jsonb_build_object('success', true, 'product_id', v_product.id, 'status', v_target);
end;
$$;

revoke all on function public.transition_product_publication_server(uuid, text)
  from public, anon, authenticated;
grant execute on function public.transition_product_publication_server(uuid, text)
  to authenticated;

notify pgrst, 'reload schema';
commit;
