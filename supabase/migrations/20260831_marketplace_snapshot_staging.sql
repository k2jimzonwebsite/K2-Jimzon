-- Prepared MAP-023 / MAP-026 inbound-first marketplace snapshot boundary.
--
-- This migration is additive and inactive until the coordinated Admin BFF
-- cutover. It stages customer-free shop listing observations, keeps product
-- matching human-reviewed, and creates no physical inventory. Provider-specific
-- dictionaries and production activation remain separately gated.

begin;

do $preflight$
begin
  if to_regclass('k2_private.admin_command_receipts') is null
     or to_regclass('k2_private.admin_request_nonces') is null
     or to_regclass('k2_private.admin_request_rate_buckets') is null
     or to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null then
    raise exception 'Admin BFF signed-command foundation must be applied first';
  end if;
  if to_regclass('public.channel_shops') is null
     or to_regclass('public.products') is null
     or to_regclass('public.pasabuy_requests') is null
     or to_regprocedure('public.generate_k2_sku_internal()') is null then
    raise exception 'Channel shops and server product identity must exist first';
  end if;
  if to_regprocedure('public.is_staff()') is null
     or to_regprocedure('public.is_admin()') is null then
    raise exception 'Staff/Admin authorization functions must exist first';
  end if;
end
$preflight$;

create table if not exists k2_private.marketplace_snapshot_imports (
  id uuid primary key,
  shop_id uuid not null references public.channel_shops(id) on delete restrict,
  provider text not null check (provider in ('shopee','lazada','tiktok')),
  source_identity text not null check (char_length(source_identity) between 1 and 200),
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  schema_version text not null check (schema_version = 'k2.marketplace-snapshot.v1'),
  period_start date not null,
  period_end date not null check (period_end >= period_start and period_end <= period_start + 366),
  reason text not null check (char_length(trim(reason)) between 10 and 500),
  status text not null default 'staged' check (status in ('staged','reviewing','resolved')),
  accepted_row_count integer not null default 0 check (accepted_row_count >= 0),
  duplicate_row_count integer not null default 0 check (duplicate_row_count >= 0),
  conflict_row_count integer not null default 0 check (conflict_row_count >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (shop_id, source_identity)
);

create table if not exists k2_private.marketplace_snapshot_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references k2_private.marketplace_snapshot_imports(id) on delete restrict,
  row_number integer not null check (row_number >= 2),
  source_row_id text not null check (char_length(source_row_id) between 1 and 200),
  external_item_id text not null check (char_length(external_item_id) between 1 and 200),
  external_variant_id text,
  marketplace_sku text,
  barcode text,
  title text not null check (char_length(title) between 1 and 240),
  size text,
  concentration text,
  flavor text,
  shade text,
  formulation text,
  pack_count integer check (pack_count between 1 and 10000),
  unit_price numeric(14,2) not null check (unit_price between 0 and 100000000),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  listing_status text not null check (listing_status in ('active','inactive','draft','deleted','out_of_stock','unknown')),
  reported_quantity integer not null check (reported_quantity between 0 and 1000000),
  observed_at timestamptz not null,
  outcome text not null check (outcome in ('accepted','duplicate','conflict')),
  duplicate_of_row_number integer,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  source_data jsonb not null check (jsonb_typeof(source_data) = 'object'),
  normalized_data jsonb not null check (jsonb_typeof(normalized_data) = 'object'),
  errors jsonb not null default '[]'::jsonb check (jsonb_typeof(errors) = 'array'),
  suggestions jsonb not null default '[]'::jsonb check (jsonb_typeof(suggestions) = 'array'),
  match_status text not null default 'pending'
    check (match_status in ('pending','linked','created_draft','unresolved','duplicate','conflict')),
  linked_product_id uuid references public.products(id) on delete restrict,
  decision_reason text,
  decided_by uuid references auth.users(id) on delete restrict,
  decided_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  unique (import_id, row_number),
  check (external_variant_id is not null or marketplace_sku is not null),
  check ((outcome = 'accepted' and match_status in ('pending','linked','created_draft','unresolved'))
      or (outcome = 'duplicate' and match_status = 'duplicate')
      or (outcome = 'conflict' and match_status = 'conflict'))
);

create table if not exists k2_private.marketplace_product_aliases (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.channel_shops(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  external_item_id text not null check (char_length(external_item_id) between 1 and 200),
  external_variant_id text,
  marketplace_sku text,
  barcode_evidence text,
  approved_from_row_id uuid not null references k2_private.marketplace_snapshot_rows(id) on delete restrict,
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default clock_timestamp(),
  active boolean not null default true
);

create unique index if not exists marketplace_product_alias_external_unique
  on k2_private.marketplace_product_aliases (
    shop_id, external_item_id, coalesce(external_variant_id, '')
  );
create unique index if not exists marketplace_product_alias_sku_unique
  on k2_private.marketplace_product_aliases (shop_id, marketplace_sku)
  where marketplace_sku is not null;
create index if not exists marketplace_product_alias_product_idx
  on k2_private.marketplace_product_aliases (product_id, shop_id);

create table if not exists k2_private.marketplace_listing_observations (
  id bigint generated always as identity primary key,
  snapshot_row_id uuid not null unique references k2_private.marketplace_snapshot_rows(id) on delete restrict,
  alias_id uuid not null references k2_private.marketplace_product_aliases(id) on delete restrict,
  shop_id uuid not null references public.channel_shops(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  reported_quantity integer not null check (reported_quantity between 0 and 1000000),
  unit_price numeric(14,2) not null check (unit_price between 0 and 100000000),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  listing_status text not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp()
);

create index if not exists marketplace_listing_observation_freshness_idx
  on k2_private.marketplace_listing_observations (shop_id, product_id, observed_at desc);

create table if not exists k2_private.marketplace_snapshot_events (
  id bigint generated always as identity primary key,
  import_id uuid not null references k2_private.marketplace_snapshot_imports(id) on delete restrict,
  row_id uuid references k2_private.marketplace_snapshot_rows(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in (
    'snapshot_staged','product_linked','product_draft_created','left_unresolved'
  )),
  reason text not null check (char_length(trim(reason)) between 10 and 500),
  before_data jsonb,
  after_data jsonb not null check (jsonb_typeof(after_data) = 'object'),
  operation_key uuid not null,
  created_at timestamptz not null default clock_timestamp()
);

create unique index if not exists marketplace_snapshot_events_operation_idx
  on k2_private.marketplace_snapshot_events (
    actor_id,
    operation_key,
    event_type,
    coalesce(row_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table if not exists k2_private.owner_close_sessions (
  id uuid primary key,
  period_start date not null,
  period_end date not null check (period_end >= period_start and period_end <= period_start + 366),
  timezone text not null check (timezone = 'Asia/Manila'),
  current_step text not null check (current_step in (
    'source_selection','source_import','product_matching','sales_reconciliation',
    'fee_estimates','stock_count','coverage_review','pasabuy_boxing','bookkeeping_handoff'
  )),
  status text not null default 'in_progress' check (status in ('in_progress','blocked','completed','cancelled')),
  version bigint not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table if not exists k2_private.owner_close_session_shops (
  session_id uuid not null references k2_private.owner_close_sessions(id) on delete restrict,
  shop_id uuid not null references public.channel_shops(id) on delete restrict,
  primary key (session_id, shop_id)
);

create index if not exists owner_close_session_shops_shop_idx
  on k2_private.owner_close_session_shops (shop_id, session_id);

create table if not exists k2_private.marketplace_coverage_overrides (
  session_id uuid not null references k2_private.owner_close_sessions(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  shop_id uuid not null references public.channel_shops(id) on delete restrict,
  action text not null check (action in ('include','thin','skip')),
  priority integer check (priority between 1 and 50),
  reason text not null check (char_length(trim(reason)) between 10 and 500),
  version bigint not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (session_id,product_id,shop_id)
);

create table if not exists k2_private.marketplace_coverage_override_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references k2_private.owner_close_sessions(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  shop_id uuid not null references public.channel_shops(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('include','thin','skip')),
  priority integer check (priority between 1 and 50),
  reason text not null check (char_length(trim(reason)) between 10 and 500),
  before_data jsonb,
  after_data jsonb not null check (jsonb_typeof(after_data)='object'),
  operation_key uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (actor_id,operation_key)
);

create table if not exists k2_private.owner_close_order_imports (
  id uuid primary key,
  session_id uuid not null references k2_private.owner_close_sessions(id) on delete restrict,
  shop_id uuid not null references public.channel_shops(id) on delete restrict,
  source_identity text not null check (char_length(source_identity) between 1 and 200),
  file_sha256 text not null check (file_sha256 ~ '^[0-9a-f]{64}$'),
  schema_version text not null check (schema_version='k2.marketplace-orders.v1'),
  accepted_count integer not null check (accepted_count between 0 and 5000),
  duplicate_count integer not null check (duplicate_count between 0 and 5000),
  conflict_count integer not null check (conflict_count between 0 and 5000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  unique (session_id,shop_id,source_identity)
);

create table if not exists k2_private.owner_close_order_facts (
  id bigint generated always as identity primary key,
  import_id uuid not null references k2_private.owner_close_order_imports(id) on delete restrict,
  session_id uuid not null references k2_private.owner_close_sessions(id) on delete restrict,
  shop_id uuid not null references public.channel_shops(id) on delete restrict,
  row_number integer not null check (row_number between 1 and 5000),
  external_order_id text not null check (char_length(external_order_id) between 1 and 200),
  external_line_id text not null check (char_length(external_line_id) between 1 and 200),
  marketplace_sku text not null check (char_length(marketplace_sku) between 1 and 200),
  alias_id uuid references k2_private.marketplace_product_aliases(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  fact_data jsonb not null check (jsonb_typeof(fact_data) = 'object'),
  outcome text not null check (outcome in ('accepted','duplicate','conflict')),
  duplicate_of_row_number integer,
  conflict_with_row_number integer,
  match_status text not null check (match_status in ('linked','unresolved','duplicate','conflict')),
  recorded_at timestamptz not null default clock_timestamp(),
  unique (import_id,row_number)
);

create table if not exists k2_private.owner_close_fee_estimates (
  id uuid primary key,
  session_id uuid not null references k2_private.owner_close_sessions(id) on delete restrict,
  shop_id uuid not null references public.channel_shops(id) on delete restrict,
  estimate_version bigint not null check (estimate_version > 0),
  policy_version text not null check (char_length(trim(policy_version)) between 3 and 120),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  commission_basis_points integer not null check (commission_basis_points between 0 and 9999),
  payment_basis_points integer not null check (payment_basis_points between 0 and 9999),
  withholding_basis_points integer not null check (withholding_basis_points between 0 and 9999),
  fixed_fee_minor_per_order bigint not null check (fixed_fee_minor_per_order between 0 and 10000000),
  gross_minor bigint not null check (gross_minor >= 0),
  accepted_line_count integer not null check (accepted_line_count between 0 and 5000),
  accepted_order_count integer not null check (accepted_order_count between 0 and 5000),
  excluded_line_count integer not null check (excluded_line_count between 0 and 5000),
  commission_minor bigint not null check (commission_minor >= 0),
  payment_minor bigint not null check (payment_minor >= 0),
  withholding_minor bigint not null check (withholding_minor >= 0),
  fixed_minor bigint not null check (fixed_minor >= 0),
  estimated_fee_minor bigint not null check (estimated_fee_minor >= 0),
  estimated_net_minor bigint not null,
  reason text not null check (char_length(trim(reason)) between 10 and 500),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  unique (session_id,shop_id,estimate_version),
  check (commission_basis_points + payment_basis_points + withholding_basis_points < 10000)
);

create table if not exists k2_private.owner_close_stock_reviews (
  session_id uuid not null references k2_private.owner_close_sessions(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  expected_canonical_before integer not null check (expected_canonical_before between 0 and 100000000),
  physical_count integer not null check (physical_count between 0 and 100000000),
  discrepancy integer not null,
  outcome text not null check (outcome in ('matched','reconciled')),
  reason text not null check (char_length(trim(reason)) between 10 and 500),
  version bigint not null default 1 check (version > 0),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (session_id,product_id)
);

create table if not exists k2_private.owner_close_pasabuy_reviews (
  session_id uuid not null references k2_private.owner_close_sessions(id) on delete restrict,
  request_id uuid not null references public.pasabuy_requests(id) on delete restrict,
  readiness text not null check (readiness in ('ready','not_ready','not_applicable')),
  reason text not null check (char_length(trim(reason)) between 10 and 500),
  version bigint not null default 1 check (version > 0),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default clock_timestamp(),
  primary key (session_id,request_id)
);

create table if not exists k2_private.owner_close_bookkeeping_handoffs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references k2_private.owner_close_sessions(id) on delete restrict,
  handoff_data jsonb not null check (jsonb_typeof(handoff_data)='object'),
  reason text not null check (char_length(trim(reason)) between 10 and 500),
  version bigint not null default 1 check (version > 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table if not exists k2_private.owner_close_session_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references k2_private.owner_close_sessions(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in (
    'session_started','session_resumed','order_import_staged','fee_estimate_saved',
    'stock_count_recorded','pasabuy_boxing_reviewed','bookkeeping_handoff_completed'
  )),
  reason text not null check (char_length(trim(reason)) between 10 and 500),
  before_data jsonb,
  after_data jsonb not null check (jsonb_typeof(after_data) = 'object'),
  operation_key uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (actor_id, operation_key, event_type)
);

create index if not exists marketplace_snapshot_import_shop_created_idx
  on k2_private.marketplace_snapshot_imports (shop_id, created_at desc);
create index if not exists marketplace_snapshot_row_import_status_idx
  on k2_private.marketplace_snapshot_rows (import_id, match_status, row_number);
create index if not exists marketplace_snapshot_row_product_idx
  on k2_private.marketplace_snapshot_rows (linked_product_id)
  where linked_product_id is not null;
create index if not exists owner_close_session_period_idx
  on k2_private.owner_close_sessions (period_end desc, status);

do $private_tables$
declare v_table text;
begin
  foreach v_table in array array[
    'marketplace_snapshot_imports','marketplace_snapshot_rows',
    'marketplace_product_aliases','marketplace_listing_observations',
    'marketplace_snapshot_events','owner_close_sessions',
    'owner_close_session_shops','marketplace_coverage_overrides',
    'marketplace_coverage_override_events','owner_close_order_imports',
    'owner_close_order_facts','owner_close_fee_estimates','owner_close_stock_reviews',
    'owner_close_pasabuy_reviews','owner_close_bookkeeping_handoffs',
    'owner_close_session_events'
  ] loop
    execute format('alter table k2_private.%I enable row level security', v_table);
    execute format('alter table k2_private.%I force row level security', v_table);
    execute format('revoke all on table k2_private.%I from public, anon, authenticated', v_table);
  end loop;
end
$private_tables$;

-- Extend the current shared signature verifier without removing any existing
-- action. The stage action receives a larger payload because it carries the
-- already bounded 512 KiB CSV normalization result.
create or replace function k2_private.verify_admin_bff_request(
  p_action text,
  p_timestamp bigint,
  p_nonce uuid,
  p_idempotency_key uuid,
  p_payload_text text,
  p_signature text
)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_secret bytea;
  v_payload_hash text;
  v_expected text;
  v_message text;
  v_bucket_start timestamptz;
  v_actor_hits integer;
  v_global_hits integer;
begin
  if v_actor is null or not public.is_staff() then
    raise exception using errcode='42501',message='K2_ADMIN_ACCESS_REQUIRED';
  end if;
  if coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_ADMIN_AAL2_REQUIRED';
  end if;
  if p_action not in (
    'confirm_order', 'packing_scan', 'payment_status', 'delivery_details',
    'fulfill_order', 'transfer_lot', 'assign_box',
    'inbox_internal_note', 'inbox_mark_read', 'inbox_workflow',
    'pasabuy_transition', 'pasabuy_quote',
    'intake_session_create', 'intake_session_step', 'intake_draft',
    'intake_inventory', 'intake_publication', 'intake_evidence_register',
    'consignment_create', 'consignment_add_line', 'consignment_scan',
    'consignment_advance', 'consignment_finalize',
    'lots_reconcile', 'lot_clearance',
    'coupon_create', 'coupon_state', 'coupon_archive',
    'admin_session_register', 'admin_session_validate',
    'admin_session_revoke_current', 'admin_session_revoke_one', 'admin_session_revoke_all',
    'admin_session_list', 'catalog_import_chunk', 'wholesale_inquiry_review',
    'admin_mfa_replacement_requested', 'admin_mfa_replacement_completed',
    'product_media_upload', 'product_media_assign', 'product_media_cleanup_complete',
    'product_media_orphan_cleanup', 'product_media_orphan_cleanup_complete',
    'globe_config_update', 'review_create', 'review_update', 'review_publish', 'review_withdraw',
    'supplier_create', 'channel_internal_event_verify',
    'staff_role_change', 'admin_delete_pin_set',
    'product_master_update', 'product_master_status', 'product_master_delete',
    'inbox_send_reply', 'product_knowledge_save', 'ai_spend_controls_update',
    'marketplace_snapshot_stage', 'marketplace_order_fact_stage', 'marketplace_match_decision',
    'marketplace_coverage_override', 'marketplace_fee_estimate_save',
    'owner_close_stock_review_save', 'owner_close_pasabuy_review_save',
    'owner_close_bookkeeping_handoff_save',
    'owner_close_session_save'
  ) then
    raise exception using errcode='22023',message='K2_ADMIN_ACTION_INVALID';
  end if;
  if p_payload_text is null or octet_length(convert_to(p_payload_text,'UTF8')) >
       (case when p_action in ('marketplace_snapshot_stage','marketplace_order_fact_stage') then 4194304
             when p_action='catalog_import_chunk' then 1048576 else 65536 end)
     or p_signature !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='K2_ADMIN_REQUEST_INVALID';
  end if;
  if abs(extract(epoch from clock_timestamp())::bigint-p_timestamp)>300 then
    raise exception using errcode='28000',message='K2_ADMIN_SIGNATURE_EXPIRED';
  end if;
  select request_secret into v_secret
  from k2_private.admin_bff_secrets where singleton=true;
  if v_secret is null then
    raise exception using errcode='55000',message='K2_ADMIN_BOUNDARY_NOT_CONFIGURED';
  end if;
  v_payload_hash:=encode(extensions.digest(convert_to(p_payload_text,'UTF8'),'sha256'),'hex');
  v_message:=p_action||E'\n'||p_timestamp::text||E'\n'||p_nonce::text||E'\n'
    ||v_actor::text||E'\n'||p_idempotency_key::text||E'\n'||v_payload_hash;
  v_expected:=encode(extensions.hmac(convert_to(v_message,'UTF8'),v_secret,'sha256'),'hex');
  if extensions.digest(convert_to(v_expected,'UTF8'),'sha256')
     <>extensions.digest(convert_to(p_signature,'UTF8'),'sha256') then
    raise exception using errcode='28000',message='K2_ADMIN_SIGNATURE_INVALID';
  end if;
  v_bucket_start:=date_trunc('minute',clock_timestamp());
  delete from k2_private.admin_request_rate_buckets
  where bucket_start<v_bucket_start-interval '1 day';
  insert into k2_private.admin_request_rate_buckets(scope,subject,bucket_start,hit_count)
  values('actor',v_actor::text,v_bucket_start,1)
  on conflict(scope,subject,bucket_start) do update
    set hit_count=k2_private.admin_request_rate_buckets.hit_count+1
  returning hit_count into v_actor_hits;
  if v_actor_hits>360 then raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED'; end if;
  insert into k2_private.admin_request_rate_buckets(scope,subject,bucket_start,hit_count)
  values('global','all_admin_requests',v_bucket_start,1)
  on conflict(scope,subject,bucket_start) do update
    set hit_count=k2_private.admin_request_rate_buckets.hit_count+1
  returning hit_count into v_global_hits;
  if v_global_hits>6000 then raise exception using errcode='54000',message='K2_ADMIN_RATE_LIMITED'; end if;
  delete from k2_private.admin_request_nonces where expires_at<=now();
  insert into k2_private.admin_request_nonces(actor_id,action,nonce,expires_at)
  values(v_actor,p_action,p_nonce,now()+interval '10 minutes') on conflict do nothing;
  return found;
end;
$$;
revoke all on function k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;

create or replace function public.execute_admin_marketplace_snapshot_v1(
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
  v_result jsonb;
  v_recent integer;
  v_inserted integer;
  v_import k2_private.marketplace_snapshot_imports;
  v_row k2_private.marketplace_snapshot_rows;
  v_item jsonb;
  v_source jsonb;
  v_normalized jsonb;
  v_suggestion jsonb;
  v_alias k2_private.marketplace_product_aliases;
  v_product public.products;
  v_session k2_private.owner_close_sessions;
  v_override k2_private.marketplace_coverage_overrides;
  v_order_import k2_private.owner_close_order_imports;
  v_prior_order k2_private.owner_close_order_facts;
  v_fee_estimate k2_private.owner_close_fee_estimates;
  v_stock_review k2_private.owner_close_stock_reviews;
  v_pasabuy_review k2_private.owner_close_pasabuy_reviews;
  v_handoff k2_private.owner_close_bookkeeping_handoffs;
  v_alias_found boolean;
  v_before jsonb;
  v_after jsonb;
  v_import_id uuid;
  v_row_id uuid;
  v_shop_id uuid;
  v_product_id uuid;
  v_session_id uuid;
  v_provider text;
  v_reason text;
  v_decision text;
  v_reviewed jsonb;
  v_sku text;
  v_name text;
  v_event_type text;
  v_count integer;
  v_shop_count integer;
  v_expected_version bigint;
  v_fee_version bigint;
  v_commission_bps integer;
  v_payment_bps integer;
  v_withholding_bps integer;
  v_fixed_fee_minor bigint;
  v_gross_minor bigint;
  v_accepted_lines integer;
  v_accepted_orders integer;
  v_excluded_lines integer;
  v_commission_minor bigint;
  v_payment_minor bigint;
  v_withholding_minor bigint;
  v_fixed_minor bigint;
  v_blocked_lines integer;
  v_current_physical integer;
  v_expected_physical integer;
  v_physical_count integer;
  v_priority integer;
begin
  if not k2_private.verify_admin_bff_request(
    p_action,p_timestamp,p_nonce,p_idempotency_key,p_payload_text,p_signature
  ) then
    raise exception using errcode='28000',message='K2_ADMIN_REQUEST_REPLAYED';
  end if;
  if v_actor is null or not public.is_staff() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_AAL2_STAFF_REQUIRED';
  end if;
  v_payload:=p_payload_text::jsonb;
  if jsonb_typeof(v_payload)<>'object' then
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
  if v_recent >= (case when p_action='marketplace_match_decision' then 60 else 20 end) then
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

  if p_action='marketplace_snapshot_stage' then
    if not (v_payload ?& array[
      'importId','provider','shopId','sourceIdentity','fileSha256','schemaVersion',
      'periodStart','periodEnd','reason','rows'
    ]) or (v_payload-array[
      'importId','provider','shopId','sourceIdentity','fileSha256','schemaVersion',
      'periodStart','periodEnd','reason','rows'
    ])<>'{}'::jsonb or jsonb_typeof(v_payload->'rows')<>'array' then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_import_id:=(v_payload->>'importId')::uuid;
    v_shop_id:=(v_payload->>'shopId')::uuid;
    v_provider:=v_payload->>'provider';
    v_reason:=trim(v_payload->>'reason');
    v_count:=jsonb_array_length(v_payload->'rows');
    if v_provider not in ('shopee','lazada','tiktok')
       or coalesce(v_payload->>'fileSha256','')!~'^[0-9a-f]{64}$'
       or v_payload->>'schemaVersion'<>'k2.marketplace-snapshot.v1'
       or char_length(v_payload->>'sourceIdentity') not between 1 and 200
       or char_length(v_reason) not between 10 and 500
       or v_count not between 1 and 1000
       or (v_payload->>'periodEnd')::date<(v_payload->>'periodStart')::date
       or (v_payload->>'periodEnd')::date>(v_payload->>'periodStart')::date+366 then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    if not exists(
      select 1 from public.channel_shops
      where id=v_shop_id and channel_code=v_provider
    ) then
      raise exception using errcode='23514',message='K2_MARKETPLACE_SHOP_INVALID';
    end if;

    select * into v_import from k2_private.marketplace_snapshot_imports
    where shop_id=v_shop_id and source_identity=v_payload->>'sourceIdentity' for update;
    if found then
      if v_import.file_sha256<>v_payload->>'fileSha256' then
        raise exception using errcode='23514',message='K2_MARKETPLACE_SNAPSHOT_CONFLICT';
      end if;
      v_result:=jsonb_build_object(
        'importId',v_import.id,'status','replayed','acceptedRows',v_import.accepted_row_count,
        'duplicateRows',v_import.duplicate_row_count,'conflictRows',v_import.conflict_row_count
      );
      update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
      where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
      return v_result;
    end if;

    insert into k2_private.marketplace_snapshot_imports(
      id,shop_id,provider,source_identity,file_sha256,schema_version,period_start,
      period_end,reason,accepted_row_count,duplicate_row_count,conflict_row_count,created_by
    ) values(
      v_import_id,v_shop_id,v_provider,v_payload->>'sourceIdentity',v_payload->>'fileSha256',
      v_payload->>'schemaVersion',(v_payload->>'periodStart')::date,(v_payload->>'periodEnd')::date,
      v_reason,
      (select count(*) from jsonb_array_elements(v_payload->'rows') x where x->>'outcome'='accepted'),
      (select count(*) from jsonb_array_elements(v_payload->'rows') x where x->>'outcome'='duplicate'),
      (select count(*) from jsonb_array_elements(v_payload->'rows') x where x->>'outcome'='conflict'),
      v_actor
    ) returning * into v_import;

    for v_item in select value from jsonb_array_elements(v_payload->'rows') loop
      if not (v_item ?& array[
        'rowNumber','source','normalized','payloadSha256','outcome','duplicateOfRowNumber','errors','suggestions'
      ]) or (v_item-array[
        'rowNumber','source','normalized','payloadSha256','outcome','duplicateOfRowNumber','errors','suggestions'
      ])<>'{}'::jsonb or jsonb_typeof(v_item->'source')<>'object'
         or jsonb_typeof(v_item->'normalized')<>'object'
         or jsonb_typeof(v_item->'errors')<>'array'
         or jsonb_typeof(v_item->'suggestions')<>'array' then
        raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
      end if;
      v_source:=v_item->'source';
      v_normalized:=v_item->'normalized';
      if (v_item->>'rowNumber')::integer<2
         or v_item->>'outcome' not in ('accepted','duplicate','conflict')
         or coalesce(v_item->>'payloadSha256','')!~'^[0-9a-f]{64}$'
         or v_source->>'schema_version'<>'k2.marketplace-snapshot.v1'
         or char_length(coalesce(v_source->>'source_row_id','')) not between 1 and 200
         or char_length(coalesce(v_source->>'external_item_id','')) not between 1 and 200
         or coalesce(v_source->>'external_variant_id',v_source->>'marketplace_sku','')=''
         or char_length(coalesce(v_source->>'title','')) not between 1 and 240
         or (v_normalized->>'reportedQuantity')::integer not between 0 and 1000000
         or (v_normalized->>'unitPrice')::numeric not between 0 and 100000000 then
        raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
      end if;
      insert into k2_private.marketplace_snapshot_rows(
        import_id,row_number,source_row_id,external_item_id,external_variant_id,
        marketplace_sku,barcode,title,size,concentration,flavor,shade,formulation,
        pack_count,unit_price,currency,listing_status,reported_quantity,observed_at,
        outcome,duplicate_of_row_number,payload_sha256,source_data,normalized_data,
        errors,suggestions,match_status
      ) values(
        v_import_id,(v_item->>'rowNumber')::integer,v_source->>'source_row_id',
        v_source->>'external_item_id',nullif(v_source->>'external_variant_id',''),
        nullif(v_source->>'marketplace_sku',''),nullif(v_source->>'barcode',''),
        v_source->>'title',nullif(v_source->>'size',''),nullif(v_source->>'concentration',''),
        nullif(v_source->>'flavor',''),nullif(v_source->>'shade',''),
        nullif(v_source->>'formulation',''),nullif(v_source->>'pack_count','')::integer,
        (v_normalized->>'unitPrice')::numeric,v_normalized->>'currency',
        v_normalized->>'listingStatus',(v_normalized->>'reportedQuantity')::integer,
        (v_normalized->>'observedAt')::timestamptz,v_item->>'outcome',
        nullif(v_item->>'duplicateOfRowNumber','')::integer,v_item->>'payloadSha256',
        v_source,v_normalized,v_item->'errors',v_item->'suggestions',
        case v_item->>'outcome' when 'accepted' then 'pending'
          when 'duplicate' then 'duplicate' else 'conflict' end
      );
    end loop;
    v_after:=jsonb_build_object(
      'importId',v_import.id,'status','staged','acceptedRows',v_import.accepted_row_count,
      'duplicateRows',v_import.duplicate_row_count,'conflictRows',v_import.conflict_row_count
    );
    insert into k2_private.marketplace_snapshot_events(
      import_id,actor_id,event_type,reason,after_data,operation_key
    ) values(v_import.id,v_actor,'snapshot_staged',v_reason,v_after,p_idempotency_key);
    v_result:=v_after;

  elsif p_action='marketplace_match_decision' then
    if not public.is_admin() then
      raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
    end if;
    if not (v_payload ?& array[
      'importId','rowId','decision','productId','reviewedProduct','reason'
    ]) or (v_payload-array[
      'importId','rowId','decision','productId','reviewedProduct','reason'
    ])<>'{}'::jsonb then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_import_id:=(v_payload->>'importId')::uuid;
    v_row_id:=(v_payload->>'rowId')::uuid;
    v_decision:=v_payload->>'decision';
    v_reason:=trim(v_payload->>'reason');
    if v_decision not in ('link_existing','create_new_draft','leave_unresolved')
       or char_length(v_reason) not between 10 and 500 then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select r.* into v_row from k2_private.marketplace_snapshot_rows r
    where r.id=v_row_id and r.import_id=v_import_id for update;
    if not found then raise exception using errcode='P0002',message='K2_MARKETPLACE_ROW_NOT_FOUND'; end if;
    if v_row.outcome<>'accepted' or v_row.match_status<>'pending' then
      raise exception using errcode='23514',message='K2_MARKETPLACE_DECISION_CONFLICT';
    end if;
    select * into v_import from k2_private.marketplace_snapshot_imports where id=v_import_id for update;
    v_before:=jsonb_build_object('matchStatus',v_row.match_status,'linkedProductId',v_row.linked_product_id);

    if v_decision='link_existing' then
      if jsonb_typeof(v_payload->'productId')<>'string' or v_payload->'reviewedProduct'<>'null'::jsonb then
        raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
      end if;
      v_product_id:=(v_payload->>'productId')::uuid;
      select value into v_suggestion from jsonb_array_elements(v_row.suggestions)
      where value->>'productId'=v_product_id::text limit 1;
      if v_suggestion is null or coalesce((v_suggestion->>'eligible')::boolean,false)=false
         or coalesce((v_suggestion->>'variantConflict')::boolean,false)=true then
        raise exception using errcode='23514',message='K2_MARKETPLACE_VARIANT_CONFLICT';
      end if;
      select * into v_product from public.products where id=v_product_id for update;
      if not found then raise exception using errcode='P0002',message='K2_MARKETPLACE_PRODUCT_NOT_FOUND'; end if;
      v_event_type:='product_linked';

    elsif v_decision='create_new_draft' then
      if v_payload->'productId'<>'null'::jsonb or jsonb_typeof(v_payload->'reviewedProduct')<>'object' then
        raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
      end if;
      v_reviewed:=v_payload->'reviewedProduct';
      if not (v_reviewed ?& array['name','barcode','description','size','packageType','subcategory'])
         or (v_reviewed-array['name','barcode','description','size','packageType','subcategory'])<>'{}'::jsonb
         or char_length(trim(coalesce(v_reviewed->>'name',''))) not between 1 and 140 then
        raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
      end if;
      if nullif(trim(v_reviewed->>'barcode'),'') is not null and exists(
        select 1 from public.products where lower(barcode)=lower(trim(v_reviewed->>'barcode'))
      ) then
        raise exception using errcode='23505',message='K2_MARKETPLACE_BARCODE_CONFLICT';
      end if;
      v_sku:=public.generate_k2_sku_internal();
      v_name:=trim(v_reviewed->>'name');
      insert into public.products(
        sku,name,status,published,barcode,description,size,package_type,subcategory,created_at,updated_at
      ) values(
        v_sku,v_name,'Draft',false,nullif(trim(v_reviewed->>'barcode'),''),
        nullif(trim(v_reviewed->>'description'),''),nullif(trim(v_reviewed->>'size'),''),
        nullif(trim(v_reviewed->>'packageType'),''),nullif(trim(v_reviewed->>'subcategory'),''),
        clock_timestamp(),clock_timestamp()
      ) returning * into v_product;
      v_product_id:=v_product.id;
      v_event_type:='product_draft_created';
    else
      if v_payload->'productId'<>'null'::jsonb or v_payload->'reviewedProduct'<>'null'::jsonb then
        raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
      end if;
      update k2_private.marketplace_snapshot_rows set
        match_status='unresolved',decision_reason=v_reason,decided_by=v_actor,decided_at=clock_timestamp()
      where id=v_row.id returning * into v_row;
      v_after:=jsonb_build_object('matchStatus','unresolved','linkedProductId',null);
      v_event_type:='left_unresolved';
      insert into k2_private.marketplace_snapshot_events(
        import_id,row_id,actor_id,event_type,reason,before_data,after_data,operation_key
      ) values(v_import_id,v_row.id,v_actor,v_event_type,v_reason,v_before,v_after,p_idempotency_key);
      v_result:=jsonb_build_object(
        'importId',v_import_id,'rowId',v_row.id,'decision','leave_unresolved',
        'matchStatus','unresolved','productId',null,'sku',null
      );
    end if;

    if v_decision in ('link_existing','create_new_draft') then
      select * into v_alias from k2_private.marketplace_product_aliases
      where shop_id=v_import.shop_id and external_item_id=v_row.external_item_id
        and coalesce(external_variant_id,'')=coalesce(v_row.external_variant_id,'') for update;
      if found and v_alias.product_id<>v_product_id then
        raise exception using errcode='23514',message='K2_MARKETPLACE_ALIAS_CONFLICT';
      end if;
      if not found then
        insert into k2_private.marketplace_product_aliases(
          shop_id,product_id,external_item_id,external_variant_id,marketplace_sku,
          barcode_evidence,approved_from_row_id,approved_by
        ) values(
          v_import.shop_id,v_product_id,v_row.external_item_id,v_row.external_variant_id,
          v_row.marketplace_sku,v_row.barcode,v_row.id,v_actor
        ) returning * into v_alias;
      end if;
      insert into k2_private.marketplace_listing_observations(
        snapshot_row_id,alias_id,shop_id,product_id,reported_quantity,unit_price,
        currency,listing_status,observed_at
      ) values(
        v_row.id,v_alias.id,v_import.shop_id,v_product_id,v_row.reported_quantity,
        v_row.unit_price,v_row.currency,v_row.listing_status,v_row.observed_at
      );
      update k2_private.marketplace_snapshot_rows set
        match_status=case when v_decision='link_existing' then 'linked' else 'created_draft' end,
        linked_product_id=v_product_id,decision_reason=v_reason,decided_by=v_actor,
        decided_at=clock_timestamp()
      where id=v_row.id returning * into v_row;
      v_after:=jsonb_build_object(
        'matchStatus',v_row.match_status,'linkedProductId',v_product_id,
        'sku',v_product.sku,'reportedQuantity',v_row.reported_quantity,
        'physicalInventoryChanged',false
      );
      insert into k2_private.marketplace_snapshot_events(
        import_id,row_id,actor_id,event_type,reason,before_data,after_data,operation_key
      ) values(v_import_id,v_row.id,v_actor,v_event_type,v_reason,v_before,v_after,p_idempotency_key);
      v_result:=jsonb_build_object(
        'importId',v_import_id,'rowId',v_row.id,'decision',v_decision,
        'matchStatus',v_row.match_status,'productId',v_product_id,'sku',v_product.sku,
        'productStatus',v_product.status,'reportedQuantity',v_row.reported_quantity,
        'physicalInventoryChanged',false
      );
    end if;

    update k2_private.marketplace_snapshot_imports set
      status=case when exists(
        select 1 from k2_private.marketplace_snapshot_rows
        where import_id=v_import_id and match_status='pending'
      ) then 'reviewing' else 'resolved' end,
      updated_at=clock_timestamp()
    where id=v_import_id;

  elsif p_action='marketplace_order_fact_stage' then
    if not public.is_admin() then
      raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
    end if;
    if not (v_payload ?& array[
      'importId','sessionId','shopId','sourceIdentity','fileSha256','schemaVersion','reason','facts'
    ]) or (v_payload-array[
      'importId','sessionId','shopId','sourceIdentity','fileSha256','schemaVersion','reason','facts'
    ])<>'{}'::jsonb or jsonb_typeof(v_payload->'facts')<>'array' then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_import_id:=(v_payload->>'importId')::uuid;
    v_session_id:=(v_payload->>'sessionId')::uuid;
    v_shop_id:=(v_payload->>'shopId')::uuid;
    v_reason:=trim(v_payload->>'reason');
    v_count:=jsonb_array_length(v_payload->'facts');
    select * into v_session from k2_private.owner_close_sessions where id=v_session_id;
    if v_payload->>'schemaVersion'<>'k2.marketplace-orders.v1'
       or v_payload->>'fileSha256' !~ '^[0-9a-f]{64}$'
       or char_length(v_payload->>'sourceIdentity') not between 1 and 200
       or not found or char_length(v_reason) not between 10 and 500 or v_count not between 0 and 5000
       or not exists(
         select 1 from k2_private.owner_close_session_shops
         where session_id=v_session_id and shop_id=v_shop_id
       ) then
      raise exception using errcode='23514',message='K2_MARKETPLACE_ORDER_IMPORT_INVALID';
    end if;
    select * into v_order_import from k2_private.owner_close_order_imports
    where session_id=v_session_id and shop_id=v_shop_id
      and source_identity=v_payload->>'sourceIdentity';
    if found then
      if v_order_import.file_sha256<>v_payload->>'fileSha256' then
        raise exception using errcode='23505',message='K2_MARKETPLACE_ORDER_IMPORT_CONFLICT';
      end if;
      v_result:=jsonb_build_object(
        'importId',v_order_import.id,'sessionId',v_order_import.session_id,
        'shopId',v_order_import.shop_id,'accepted',v_order_import.accepted_count,
        'duplicates',v_order_import.duplicate_count,'conflicts',v_order_import.conflict_count,
        'exactReplay',true,'canonicalInventoryChanged',false
      );
    else
      insert into k2_private.owner_close_order_imports(
        id,session_id,shop_id,source_identity,file_sha256,schema_version,
        accepted_count,duplicate_count,conflict_count,created_by
      ) values(
        v_import_id,v_session_id,v_shop_id,v_payload->>'sourceIdentity',
        v_payload->>'fileSha256',v_payload->>'schemaVersion',
        (select count(*) from jsonb_array_elements(v_payload->'facts') f where f->>'outcome'='accepted'),
        (select count(*) from jsonb_array_elements(v_payload->'facts') f where f->>'outcome'='duplicate'),
        (select count(*) from jsonb_array_elements(v_payload->'facts') f where f->>'outcome'='conflict'),
        v_actor
      ) returning * into v_order_import;
      for v_item in select value from jsonb_array_elements(v_payload->'facts') loop
        if not (v_item ?& array[
          'rowNumber','shopId','externalOrderId','externalLineId','marketplaceSku',
          'quantity','grossAmount','currency','orderedAt','orderStatus','paymentStatus',
          'payloadSha256','outcome','duplicateOfRowNumber','conflictWithRowNumber'
        ]) or (v_item-array[
          'rowNumber','shopId','externalOrderId','externalLineId','marketplaceSku',
          'quantity','grossAmount','currency','orderedAt','orderStatus','paymentStatus',
          'payloadSha256','outcome','duplicateOfRowNumber','conflictWithRowNumber'
        ])<>'{}'::jsonb or (v_item->>'shopId')::uuid<>v_shop_id
           or (v_item->>'rowNumber')::integer not between 1 and 5000
           or (v_item->>'quantity')::integer not between 1 and 100000
           or (v_item->>'grossAmount')::numeric not between 0 and 100000000000
           or (v_item->>'orderedAt')::timestamptz<v_session.period_start::timestamptz
           or (v_item->>'orderedAt')::timestamptz>=(v_session.period_end+1)::timestamptz
           or v_item->>'currency' !~ '^[A-Z]{3}$'
           or v_item->>'payloadSha256' !~ '^[0-9a-f]{64}$'
           or v_item->>'outcome' not in ('accepted','duplicate','conflict')
           or char_length(v_item->>'externalOrderId') not between 1 and 200
           or char_length(v_item->>'externalLineId') not between 1 and 200
           or char_length(v_item->>'marketplaceSku') not between 1 and 200 then
          raise exception using errcode='23514',message='K2_MARKETPLACE_ORDER_IMPORT_INVALID';
        end if;
        select * into v_alias from k2_private.marketplace_product_aliases
        where shop_id=v_shop_id and marketplace_sku=v_item->>'marketplaceSku';
        v_alias_found:=found;
        if v_item->>'outcome'='accepted' then
          select * into v_prior_order from k2_private.owner_close_order_facts
          where session_id=v_session_id and shop_id=v_shop_id
            and external_order_id=v_item->>'externalOrderId'
            and external_line_id=v_item->>'externalLineId' and outcome='accepted'
          order by recorded_at,id limit 1;
          if found then
            if v_prior_order.payload_sha256=v_item->>'payloadSha256' then
              v_item:=jsonb_set(v_item,'{outcome}','"duplicate"'::jsonb)
                ||jsonb_build_object('duplicateOfRowNumber',v_prior_order.row_number);
            else
              v_item:=jsonb_set(v_item,'{outcome}','"conflict"'::jsonb)
                ||jsonb_build_object('conflictWithRowNumber',v_prior_order.row_number);
            end if;
          end if;
        end if;
        insert into k2_private.owner_close_order_facts(
          import_id,session_id,shop_id,row_number,external_order_id,external_line_id,
          marketplace_sku,alias_id,product_id,payload_sha256,fact_data,outcome,
          duplicate_of_row_number,conflict_with_row_number,match_status
        ) values(
          v_import_id,v_session_id,v_shop_id,(v_item->>'rowNumber')::integer,
          v_item->>'externalOrderId',v_item->>'externalLineId',v_item->>'marketplaceSku',
          case when v_alias_found then v_alias.id else null end,
          case when v_alias_found then v_alias.product_id else null end,
          v_item->>'payloadSha256',v_item,v_item->>'outcome',
          nullif(v_item->>'duplicateOfRowNumber','')::integer,
          nullif(v_item->>'conflictWithRowNumber','')::integer,
          case when v_item->>'outcome'='duplicate' then 'duplicate'
               when v_item->>'outcome'='conflict' then 'conflict'
               when v_alias_found then 'linked' else 'unresolved' end
        );
      end loop;
      update k2_private.owner_close_order_imports i set
        accepted_count=(select count(*) from k2_private.owner_close_order_facts f
          where f.import_id=v_import_id and f.outcome='accepted'),
        duplicate_count=(select count(*) from k2_private.owner_close_order_facts f
          where f.import_id=v_import_id and f.outcome='duplicate'),
        conflict_count=(select count(*) from k2_private.owner_close_order_facts f
          where f.import_id=v_import_id and f.outcome='conflict')
      where i.id=v_import_id returning * into v_order_import;
      v_after:=jsonb_build_object(
        'importId',v_order_import.id,'shopId',v_order_import.shop_id,
        'accepted',v_order_import.accepted_count,'duplicates',v_order_import.duplicate_count,
        'conflicts',v_order_import.conflict_count,'canonicalInventoryChanged',false
      );
      insert into k2_private.owner_close_session_events(
        session_id,actor_id,event_type,reason,before_data,after_data,operation_key
      ) values(v_session_id,v_actor,'order_import_staged',v_reason,null,v_after,p_idempotency_key);
      v_result:=v_after||jsonb_build_object('sessionId',v_session_id,'exactReplay',false);
    end if;

  elsif p_action='marketplace_fee_estimate_save' then
    if not public.is_admin() then
      raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
    end if;
    if not (v_payload ?& array[
      'estimateId','sessionId','shopId','policyVersion','currency',
      'commissionBasisPoints','paymentBasisPoints','withholdingBasisPoints',
      'fixedFeeMinorPerOrder','reason'
    ]) or (v_payload-array[
      'estimateId','sessionId','shopId','policyVersion','currency',
      'commissionBasisPoints','paymentBasisPoints','withholdingBasisPoints',
      'fixedFeeMinorPerOrder','reason'
    ])<>'{}'::jsonb then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_session_id:=(v_payload->>'sessionId')::uuid;
    v_shop_id:=(v_payload->>'shopId')::uuid;
    v_reason:=trim(v_payload->>'reason');
    v_commission_bps:=(v_payload->>'commissionBasisPoints')::integer;
    v_payment_bps:=(v_payload->>'paymentBasisPoints')::integer;
    v_withholding_bps:=(v_payload->>'withholdingBasisPoints')::integer;
    v_fixed_fee_minor:=(v_payload->>'fixedFeeMinorPerOrder')::bigint;
    select * into v_session from k2_private.owner_close_sessions where id=v_session_id;
    if not found or not exists(
      select 1 from k2_private.owner_close_session_shops
      where session_id=v_session_id and shop_id=v_shop_id
    ) or char_length(v_reason) not between 10 and 500
      or char_length(trim(v_payload->>'policyVersion')) not between 3 and 120
      or v_payload->>'currency' !~ '^[A-Z]{3}$'
      or v_commission_bps not between 0 and 9999
      or v_payment_bps not between 0 and 9999
      or v_withholding_bps not between 0 and 9999
      or v_commission_bps+v_payment_bps+v_withholding_bps>=10000
      or v_fixed_fee_minor not between 0 and 10000000 then
      raise exception using errcode='23514',message='K2_MARKETPLACE_FEE_POLICY_INVALID';
    end if;
    select id into v_row_id from k2_private.owner_close_order_imports
    where session_id=v_session_id and shop_id=v_shop_id
    order by created_at desc,id desc limit 1;
    if v_row_id is null then
      raise exception using errcode='23514',message='K2_MARKETPLACE_FEE_FACTS_INVALID';
    end if;
    select count(*)::integer into v_blocked_lines
    from k2_private.owner_close_order_facts
    where import_id=v_row_id
      and (outcome='conflict' or (outcome='accepted' and match_status<>'linked'));
    if v_blocked_lines>0 then
      raise exception using errcode='23514',message='K2_MARKETPLACE_FEE_FACTS_BLOCKED';
    end if;
    select count(*)::integer,count(distinct external_order_id)::integer,
      coalesce(sum(round((fact_data->>'grossAmount')::numeric*100)),0)::bigint
    into v_accepted_lines,v_accepted_orders,v_gross_minor
    from k2_private.owner_close_order_facts
    where import_id=v_row_id
      and outcome='accepted' and match_status='linked';
    if exists(
      select 1 from k2_private.owner_close_order_facts
      where import_id=v_row_id
        and outcome='accepted' and match_status='linked'
        and fact_data->>'currency'<>v_payload->>'currency'
    ) then
      raise exception using errcode='23514',message='K2_MARKETPLACE_FEE_FACTS_INVALID';
    end if;
    select count(*)::integer-v_accepted_lines into v_excluded_lines
    from k2_private.owner_close_order_facts
    where import_id=v_row_id;
    v_commission_minor:=round(v_gross_minor::numeric*v_commission_bps/10000)::bigint;
    v_payment_minor:=round(v_gross_minor::numeric*v_payment_bps/10000)::bigint;
    v_withholding_minor:=round(v_gross_minor::numeric*v_withholding_bps/10000)::bigint;
    v_fixed_minor:=v_fixed_fee_minor*v_accepted_orders;
    select coalesce(max(estimate_version),0)+1 into v_fee_version
    from k2_private.owner_close_fee_estimates
    where session_id=v_session_id and shop_id=v_shop_id;
    insert into k2_private.owner_close_fee_estimates(
      id,session_id,shop_id,estimate_version,policy_version,currency,
      commission_basis_points,payment_basis_points,withholding_basis_points,
      fixed_fee_minor_per_order,gross_minor,accepted_line_count,accepted_order_count,
      excluded_line_count,commission_minor,payment_minor,withholding_minor,fixed_minor,
      estimated_fee_minor,estimated_net_minor,reason,created_by
    ) values(
      (v_payload->>'estimateId')::uuid,v_session_id,v_shop_id,v_fee_version,
      trim(v_payload->>'policyVersion'),v_payload->>'currency',v_commission_bps,
      v_payment_bps,v_withholding_bps,v_fixed_fee_minor,v_gross_minor,
      v_accepted_lines,v_accepted_orders,v_excluded_lines,v_commission_minor,
      v_payment_minor,v_withholding_minor,v_fixed_minor,
      v_commission_minor+v_payment_minor+v_withholding_minor+v_fixed_minor,
      v_gross_minor-v_commission_minor-v_payment_minor-v_withholding_minor-v_fixed_minor,
      v_reason,v_actor
    ) returning * into v_fee_estimate;
    v_after:=jsonb_build_object(
      'estimateId',v_fee_estimate.id,'sessionId',v_session_id,'shopId',v_shop_id,
      'estimateVersion',v_fee_version,'policyVersion',v_fee_estimate.policy_version,
      'currency',v_fee_estimate.currency,'commissionBasisPoints',v_commission_bps,
      'paymentBasisPoints',v_payment_bps,'withholdingBasisPoints',v_withholding_bps,
      'fixedFeeMinorPerOrder',v_fixed_fee_minor,'grossMinor',v_gross_minor,
      'acceptedLines',v_accepted_lines,'acceptedOrders',v_accepted_orders,
      'excludedLines',v_excluded_lines,'commissionMinor',v_commission_minor,
      'paymentMinor',v_payment_minor,'withholdingMinor',v_withholding_minor,
      'fixedMinor',v_fixed_minor,
      'estimatedFeeMinor',v_fee_estimate.estimated_fee_minor,
      'estimatedNetMinor',v_fee_estimate.estimated_net_minor,
      'estimateOnly',true,'settlementReconciled',false,
      'officialBooks',false,'actualProfit',false
    );
    insert into k2_private.owner_close_session_events(
      session_id,actor_id,event_type,reason,before_data,after_data,operation_key
    ) values(v_session_id,v_actor,'fee_estimate_saved',v_reason,null,v_after,p_idempotency_key);
    v_result:=v_after;

  elsif p_action='owner_close_stock_review_save' then
    if not public.is_admin() then
      raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
    end if;
    if not (v_payload ?& array[
      'sessionId','productId','expectedCanonicalBefore','physicalCount','reason'
    ]) or (v_payload-array[
      'sessionId','productId','expectedCanonicalBefore','physicalCount','reason'
    ])<>'{}'::jsonb then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_session_id:=(v_payload->>'sessionId')::uuid;
    v_product_id:=(v_payload->>'productId')::uuid;
    v_expected_physical:=(v_payload->>'expectedCanonicalBefore')::integer;
    v_physical_count:=(v_payload->>'physicalCount')::integer;
    v_reason:=trim(v_payload->>'reason');
    select * into v_product from public.products where id=v_product_id;
    if not found or v_expected_physical not between 0 and 100000000
      or v_physical_count not between 0 and 100000000
      or char_length(v_reason) not between 10 and 500
      or not exists(
        select 1 from k2_private.marketplace_product_aliases a
        join k2_private.owner_close_session_shops cs
          on cs.session_id=v_session_id and cs.shop_id=a.shop_id
        where a.product_id=v_product_id
      ) then
      raise exception using errcode='23514',message='K2_OWNER_CLOSE_STOCK_REVIEW_INVALID';
    end if;
    select coalesce(sum(quantity),0)::integer into v_current_physical
    from public.product_batches where sku=v_product.sku;
    if v_current_physical<>v_physical_count then
      raise exception using errcode='40001',message='K2_OWNER_CLOSE_STOCK_NOT_RECONCILED';
    end if;
    select to_jsonb(r) into v_before from k2_private.owner_close_stock_reviews r
    where session_id=v_session_id and product_id=v_product_id;
    insert into k2_private.owner_close_stock_reviews(
      session_id,product_id,expected_canonical_before,physical_count,discrepancy,
      outcome,reason,recorded_by
    ) values(
      v_session_id,v_product_id,v_expected_physical,v_physical_count,
      v_physical_count-v_expected_physical,
      case when v_physical_count=v_expected_physical then 'matched' else 'reconciled' end,
      v_reason,v_actor
    ) on conflict(session_id,product_id) do update set
      expected_canonical_before=excluded.expected_canonical_before,
      physical_count=excluded.physical_count,discrepancy=excluded.discrepancy,
      outcome=excluded.outcome,reason=excluded.reason,version=k2_private.owner_close_stock_reviews.version+1,
      recorded_by=excluded.recorded_by,recorded_at=clock_timestamp()
    returning * into v_stock_review;
    v_after:=jsonb_build_object(
      'sessionId',v_session_id,'productId',v_product_id,'sku',v_product.sku,
      'expectedCanonicalBefore',v_expected_physical,'physicalCount',v_physical_count,
      'discrepancy',v_stock_review.discrepancy,'outcome',v_stock_review.outcome,
      'version',v_stock_review.version,'canonicalInventoryChanged',
      v_stock_review.outcome='reconciled'
    );
    insert into k2_private.owner_close_session_events(
      session_id,actor_id,event_type,reason,before_data,after_data,operation_key
    ) values(v_session_id,v_actor,'stock_count_recorded',v_reason,v_before,v_after,p_idempotency_key);
    v_result:=v_after;

  elsif p_action='owner_close_pasabuy_review_save' then
    if not public.is_admin() then
      raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
    end if;
    if not (v_payload ?& array['sessionId','requestId','readiness','reason'])
       or (v_payload-array['sessionId','requestId','readiness','reason'])<>'{}'::jsonb then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_session_id:=(v_payload->>'sessionId')::uuid;
    v_row_id:=(v_payload->>'requestId')::uuid;
    v_decision:=v_payload->>'readiness';
    v_reason:=trim(v_payload->>'reason');
    select * into v_session from k2_private.owner_close_sessions where id=v_session_id;
    if not found or v_decision not in ('ready','not_ready','not_applicable')
       or char_length(v_reason) not between 10 and 500
       or not exists(
         select 1 from public.pasabuy_requests
         where id=v_row_id and status not in ('delivered','expired','cancelled')
           and created_at<(v_session.period_end+1)::timestamptz
       ) then
      raise exception using errcode='23514',message='K2_OWNER_CLOSE_PASABUY_REVIEW_INVALID';
    end if;
    select to_jsonb(r) into v_before from k2_private.owner_close_pasabuy_reviews r
    where session_id=v_session_id and request_id=v_row_id;
    insert into k2_private.owner_close_pasabuy_reviews(
      session_id,request_id,readiness,reason,recorded_by
    ) values(v_session_id,v_row_id,v_decision,v_reason,v_actor)
    on conflict(session_id,request_id) do update set
      readiness=excluded.readiness,reason=excluded.reason,
      version=k2_private.owner_close_pasabuy_reviews.version+1,
      recorded_by=excluded.recorded_by,recorded_at=clock_timestamp()
    returning * into v_pasabuy_review;
    v_after:=jsonb_build_object(
      'sessionId',v_session_id,'requestId',v_row_id,'readiness',v_pasabuy_review.readiness,
      'version',v_pasabuy_review.version,'canonicalPasabuyStatusChanged',false
    );
    insert into k2_private.owner_close_session_events(
      session_id,actor_id,event_type,reason,before_data,after_data,operation_key
    ) values(v_session_id,v_actor,'pasabuy_boxing_reviewed',v_reason,v_before,v_after,p_idempotency_key);
    v_result:=v_after;

  elsif p_action='owner_close_bookkeeping_handoff_save' then
    if not public.is_admin() then
      raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
    end if;
    if not (v_payload ?& array['sessionId','expectedSessionVersion','reason'])
       or (v_payload-array['sessionId','expectedSessionVersion','reason'])<>'{}'::jsonb then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_session_id:=(v_payload->>'sessionId')::uuid;
    v_expected_version:=(v_payload->>'expectedSessionVersion')::bigint;
    v_reason:=trim(v_payload->>'reason');
    select * into v_session from k2_private.owner_close_sessions
    where id=v_session_id for update;
    if not found or v_session.status<>'in_progress'
       or v_session.current_step<>'bookkeeping_handoff'
       or v_expected_version<>v_session.version
       or char_length(v_reason) not between 10 and 500 then
      raise exception using errcode='40001',message='K2_OWNER_CLOSE_HANDOFF_INVALID';
    end if;
    v_before:=to_jsonb(v_session);
    v_result:=public.read_admin_owner_close_bookkeeping_handoff_v1(v_session_id);
    if not coalesce((v_result->>'readyToClose')::boolean,false) then
      raise exception using errcode='23514',message='K2_OWNER_CLOSE_HANDOFF_BLOCKED';
    end if;
    insert into k2_private.owner_close_bookkeeping_handoffs(
      session_id,handoff_data,reason,created_by,updated_by
    ) values(v_session_id,v_result,v_reason,v_actor,v_actor)
    on conflict(session_id) do update set
      handoff_data=excluded.handoff_data,reason=excluded.reason,
      version=k2_private.owner_close_bookkeeping_handoffs.version+1,
      updated_by=excluded.updated_by,updated_at=clock_timestamp()
    returning * into v_handoff;
    update k2_private.owner_close_sessions set
      status='completed',version=version+1,updated_by=v_actor,updated_at=clock_timestamp()
    where id=v_session_id returning * into v_session;
    v_after:=jsonb_build_object(
      'sessionId',v_session_id,'artifactId',v_handoff.id,'artifactVersion',v_handoff.version,
      'status',v_session.status,'sessionVersion',v_session.version,
      'customerMinimized',true,'estimateOnly',true,'officialBooks',false,
      'settlementReconciled',false,'actualProfit',false
    );
    insert into k2_private.owner_close_session_events(
      session_id,actor_id,event_type,reason,before_data,after_data,operation_key
    ) values(v_session_id,v_actor,'bookkeeping_handoff_completed',v_reason,v_before,v_after,p_idempotency_key);
    v_result:=v_after;

  elsif p_action='marketplace_coverage_override' then
    if not public.is_admin() then
      raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
    end if;
    if not (v_payload ?& array['sessionId','productId','shopId','action','priority','reason'])
       or (v_payload-array['sessionId','productId','shopId','action','priority','reason'])<>'{}'::jsonb then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_session_id:=(v_payload->>'sessionId')::uuid;
    v_product_id:=(v_payload->>'productId')::uuid;
    v_shop_id:=(v_payload->>'shopId')::uuid;
    v_decision:=v_payload->>'action';
    v_priority:=nullif(v_payload->>'priority','')::integer;
    v_reason:=trim(v_payload->>'reason');
    if v_decision not in ('include','thin','skip') or char_length(v_reason) not between 10 and 500
       or (v_priority is not null and v_priority not between 1 and 50)
       or not exists(
         select 1 from k2_private.owner_close_session_shops
         where session_id=v_session_id and shop_id=v_shop_id
       ) or not exists(
         select 1 from k2_private.marketplace_product_aliases a
         join k2_private.owner_close_session_shops cs
           on cs.session_id=v_session_id and cs.shop_id=a.shop_id
         where a.product_id=v_product_id
       ) then
      raise exception using errcode='23514',message='K2_MARKETPLACE_COVERAGE_OVERRIDE_INVALID';
    end if;
    select * into v_override from k2_private.marketplace_coverage_overrides
    where session_id=v_session_id and product_id=v_product_id and shop_id=v_shop_id for update;
    v_before:=case when found then to_jsonb(v_override) else null end;
    if v_before is null then
      insert into k2_private.marketplace_coverage_overrides(
        session_id,product_id,shop_id,action,priority,reason,created_by,updated_by
      ) values(v_session_id,v_product_id,v_shop_id,v_decision,v_priority,v_reason,v_actor,v_actor)
      returning * into v_override;
    else
      update k2_private.marketplace_coverage_overrides set
        action=v_decision,priority=v_priority,reason=v_reason,version=version+1,
        updated_by=v_actor,updated_at=clock_timestamp()
      where session_id=v_session_id and product_id=v_product_id and shop_id=v_shop_id
      returning * into v_override;
    end if;
    v_after:=to_jsonb(v_override);
    insert into k2_private.marketplace_coverage_override_events(
      session_id,product_id,shop_id,actor_id,action,priority,reason,before_data,after_data,operation_key
    ) values(v_session_id,v_product_id,v_shop_id,v_actor,v_decision,v_priority,v_reason,v_before,v_after,p_idempotency_key);
    v_result:=jsonb_build_object(
      'sessionId',v_session_id,'productId',v_product_id,'shopId',v_shop_id,
      'action',v_override.action,'priority',v_override.priority,
      'reason',v_override.reason,'version',v_override.version,
      'effect','proposal_only','providerWrite',false,'custodyTransfer',false
    );

  elsif p_action='owner_close_session_save' then
    if not public.is_admin() then
      raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
    end if;
    if not (v_payload ?& array[
      'sessionId','periodStart','periodEnd','timezone','shopIds','currentStep','expectedVersion','reason'
    ]) or (v_payload-array[
      'sessionId','periodStart','periodEnd','timezone','shopIds','currentStep','expectedVersion','reason'
    ])<>'{}'::jsonb or jsonb_typeof(v_payload->'shopIds')<>'array' then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    v_session_id:=(v_payload->>'sessionId')::uuid;
    v_expected_version:=(v_payload->>'expectedVersion')::bigint;
    v_reason:=trim(v_payload->>'reason');
    v_count:=jsonb_array_length(v_payload->'shopIds');
    if v_payload->>'timezone'<>'Asia/Manila'
       or v_payload->>'currentStep' not in (
         'source_selection','source_import','product_matching','sales_reconciliation',
         'fee_estimates','stock_count','coverage_review','pasabuy_boxing','bookkeeping_handoff'
       ) or v_expected_version<1 or v_count not between 1 and 50
       or char_length(v_reason) not between 10 and 500
       or (v_payload->>'periodEnd')::date<(v_payload->>'periodStart')::date
       or (v_payload->>'periodEnd')::date>(v_payload->>'periodStart')::date+366 then
      raise exception using errcode='22023',message='K2_ADMIN_PAYLOAD_INVALID';
    end if;
    select count(distinct value::text)::integer into v_shop_count
    from jsonb_array_elements_text(v_payload->'shopIds') value
    join public.channel_shops s on s.id=value::text::uuid;
    if v_shop_count<>v_count then
      raise exception using errcode='23514',message='K2_OWNER_CLOSE_SHOP_INVALID';
    end if;
    select * into v_session from k2_private.owner_close_sessions
    where id=v_session_id for update;
    if not found then
      if v_expected_version<>1 then
        raise exception using errcode='40001',message='K2_OWNER_CLOSE_VERSION_CONFLICT';
      end if;
      insert into k2_private.owner_close_sessions(
        id,period_start,period_end,timezone,current_step,version,created_by,updated_by
      ) values(
        v_session_id,(v_payload->>'periodStart')::date,(v_payload->>'periodEnd')::date,
        'Asia/Manila',v_payload->>'currentStep',1,v_actor,v_actor
      ) returning * into v_session;
      v_before:=null;
      v_event_type:='session_started';
    else
      if v_session.version<>v_expected_version then
        raise exception using errcode='40001',message='K2_OWNER_CLOSE_VERSION_CONFLICT';
      end if;
      v_before:=to_jsonb(v_session);
      update k2_private.owner_close_sessions set
        period_start=(v_payload->>'periodStart')::date,
        period_end=(v_payload->>'periodEnd')::date,
        current_step=v_payload->>'currentStep',
        version=version+1,updated_by=v_actor,updated_at=clock_timestamp()
      where id=v_session_id returning * into v_session;
      v_event_type:='session_resumed';
    end if;
    delete from k2_private.owner_close_session_shops where session_id=v_session_id;
    insert into k2_private.owner_close_session_shops(session_id,shop_id)
    select v_session_id,value::text::uuid from jsonb_array_elements_text(v_payload->'shopIds') value;
    v_after:=to_jsonb(v_session)||jsonb_build_object('shopIds',v_payload->'shopIds');
    insert into k2_private.owner_close_session_events(
      session_id,actor_id,event_type,reason,before_data,after_data,operation_key
    ) values(v_session_id,v_actor,v_event_type,v_reason,v_before,v_after,p_idempotency_key);
    v_result:=jsonb_build_object(
      'sessionId',v_session.id,'periodStart',v_session.period_start,
      'periodEnd',v_session.period_end,'timezone',v_session.timezone,
      'shopIds',v_payload->'shopIds','currentStep',v_session.current_step,
      'status',v_session.status,'version',v_session.version,'updatedAt',v_session.updated_at
    );
  else
    raise exception using errcode='22023',message='K2_ADMIN_ACTION_INVALID';
  end if;

  update k2_private.admin_command_receipts set result=v_result,completed_at=clock_timestamp()
  where actor_id=v_actor and action=p_action and idempotency_key=p_idempotency_key;
  return v_result;
exception
  when unique_violation then
    if p_action='marketplace_order_fact_stage' then
      raise exception using errcode='23505',message='K2_MARKETPLACE_ORDER_IMPORT_CONFLICT';
    end if;
    raise exception using errcode='23505',message='K2_MARKETPLACE_DECISION_CONFLICT';
end;
$$;

revoke all on function public.execute_admin_marketplace_snapshot_v1(text,bigint,uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.execute_admin_marketplace_snapshot_v1(text,bigint,uuid,uuid,text,text)
  to authenticated;

create or replace function public.read_admin_marketplace_snapshot_row_v1(
  p_import_id uuid,
  p_row_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare v_actor uuid:=auth.uid(); v_row k2_private.marketplace_snapshot_rows;
begin
  if v_actor is null or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
  end if;
  select r.* into v_row from k2_private.marketplace_snapshot_rows r
  where r.id=p_row_id and r.import_id=p_import_id;
  if not found then return null; end if;
  return jsonb_build_object(
    'id',v_row.id,'importId',v_row.import_id,'rowNumber',v_row.row_number,
    'outcome',v_row.outcome,'matchStatus',v_row.match_status,
    'source',v_row.source_data,'normalized',v_row.normalized_data,
    'suggestions',v_row.suggestions,'errors',v_row.errors
  );
end;
$$;

create or replace function public.read_admin_marketplace_snapshot_status_v1(p_import_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_import k2_private.marketplace_snapshot_imports;
  v_rows jsonb;
begin
  if v_actor is null or not public.is_staff() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_AAL2_STAFF_REQUIRED';
  end if;
  select * into v_import from k2_private.marketplace_snapshot_imports
  where id=p_import_id and (created_by=v_actor or public.is_admin());
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'rowNumber',row_number,'sourceRowId',source_row_id,
    'externalItemId',external_item_id,'marketplaceSku',marketplace_sku,
    'title',title,'reportedQuantity',reported_quantity,'unitPrice',unit_price,
    'currency',currency,'listingStatus',listing_status,'observedAt',observed_at,
    'outcome',outcome,'matchStatus',match_status,'linkedProductId',linked_product_id,
    'suggestions',suggestions,'errors',errors
  ) order by row_number),'[]'::jsonb) into v_rows
  from k2_private.marketplace_snapshot_rows where import_id=p_import_id;
  return jsonb_build_object(
    'importId',v_import.id,'shopId',v_import.shop_id,'provider',v_import.provider,
    'sourceIdentity',v_import.source_identity,'fileSha256',v_import.file_sha256,
    'schemaVersion',v_import.schema_version,'periodStart',v_import.period_start,
    'periodEnd',v_import.period_end,'status',v_import.status,
    'acceptedRows',v_import.accepted_row_count,'duplicateRows',v_import.duplicate_row_count,
    'conflictRows',v_import.conflict_row_count,'createdAt',v_import.created_at,
    'updatedAt',v_import.updated_at,'rows',v_rows
  );
end;
$$;

create or replace function public.read_admin_owner_close_session_v1(p_session_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare v_session k2_private.owner_close_sessions; v_shops jsonb; v_order_import_id uuid;
begin
  if auth.uid() is null or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
  end if;
  select * into v_session from k2_private.owner_close_sessions where id=p_session_id;
  if not found then return null; end if;
  select coalesce(jsonb_agg(shop_id order by shop_id),'[]'::jsonb) into v_shops
  from k2_private.owner_close_session_shops where session_id=p_session_id;
  select id into v_order_import_id from k2_private.owner_close_order_imports
  where session_id=p_session_id order by created_at desc,id desc limit 1;
  return jsonb_build_object(
    'sessionId',v_session.id,'periodStart',v_session.period_start,
    'periodEnd',v_session.period_end,'timezone',v_session.timezone,
    'shopIds',v_shops,'currentStep',v_session.current_step,'status',v_session.status,
    'version',v_session.version,'latestOrderImportId',v_order_import_id,
    'createdAt',v_session.created_at,'updatedAt',v_session.updated_at
  );
end;
$$;

create or replace function public.read_admin_owner_close_order_import_v1(p_import_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare v_import k2_private.owner_close_order_imports; v_facts jsonb;
begin
  if auth.uid() is null or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
  end if;
  select * into v_import from k2_private.owner_close_order_imports where id=p_import_id;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'rowNumber',row_number,'externalOrderId',external_order_id,
    'externalLineId',external_line_id,'marketplaceSku',marketplace_sku,
    'productId',product_id,'outcome',outcome,'matchStatus',match_status,
    'duplicateOfRowNumber',duplicate_of_row_number,
    'conflictWithRowNumber',conflict_with_row_number,'fact',fact_data
  ) order by row_number),'[]'::jsonb) into v_facts
  from k2_private.owner_close_order_facts where import_id=p_import_id;
  return jsonb_build_object(
    'importId',v_import.id,'sessionId',v_import.session_id,'shopId',v_import.shop_id,
    'sourceIdentity',v_import.source_identity,'fileSha256',v_import.file_sha256,
    'schemaVersion',v_import.schema_version,'accepted',v_import.accepted_count,
    'duplicates',v_import.duplicate_count,'conflicts',v_import.conflict_count,
    'createdAt',v_import.created_at,'facts',v_facts,
    'canonicalInventoryChanged',false
  );
end;
$$;

create or replace function public.read_admin_marketplace_shop_options_v1()
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
begin
  if auth.uid() is null or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',id,'shopCode',shop_code,'channelCode',channel_code,
      'displayName',display_name,'status',status
    ) order by channel_code,display_name,id)
    from public.channel_shops
    where channel_code in ('shopee','lazada','tiktok')
      and status<>'suspended'
  ),'[]'::jsonb);
end;
$$;

create or replace function public.read_admin_owner_close_fee_input_v1(p_session_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare v_session k2_private.owner_close_sessions; v_shops jsonb; v_imports jsonb; v_facts jsonb; v_estimates jsonb;
begin
  if auth.uid() is null or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
  end if;
  select * into v_session from k2_private.owner_close_sessions where id=p_session_id;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',s.id,'shopCode',s.shop_code,'channelCode',s.channel_code,'displayName',s.display_name
  ) order by s.channel_code,s.display_name,s.id),'[]'::jsonb) into v_shops
  from k2_private.owner_close_session_shops cs
  join public.channel_shops s on s.id=cs.shop_id where cs.session_id=p_session_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'importId',id,'shopId',shop_id,'sourceIdentity',source_identity,
    'accepted',accepted_count,'duplicates',duplicate_count,'conflicts',conflict_count,
    'createdAt',created_at
  ) order by shop_id,created_at,id),'[]'::jsonb) into v_imports
  from k2_private.owner_close_order_imports where session_id=p_session_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,'shopId',f.shop_id,'externalOrderId',f.external_order_id,
    'externalLineId',f.external_line_id,'marketplaceSku',f.marketplace_sku,
    'grossAmount',f.fact_data->>'grossAmount','currency',f.fact_data->>'currency',
    'outcome',f.outcome,'matchStatus',f.match_status
  ) order by f.shop_id,f.external_order_id,f.external_line_id,f.id),'[]'::jsonb) into v_facts
  from k2_private.owner_close_order_facts f where f.session_id=p_session_id;
  with latest as (
    select distinct on (e.shop_id) e.* from k2_private.owner_close_fee_estimates e
    where e.session_id=p_session_id order by e.shop_id,e.estimate_version desc
  ) select coalesce(jsonb_agg(jsonb_build_object(
    'estimateId',id,'shopId',shop_id,'estimateVersion',estimate_version,
    'policyVersion',policy_version,'currency',currency,
    'commissionBasisPoints',commission_basis_points,'paymentBasisPoints',payment_basis_points,
    'withholdingBasisPoints',withholding_basis_points,'fixedFeeMinorPerOrder',fixed_fee_minor_per_order,
    'grossMinor',gross_minor,'acceptedLines',accepted_line_count,'acceptedOrders',accepted_order_count,
    'excludedLines',excluded_line_count,'commissionMinor',commission_minor,
    'paymentMinor',payment_minor,'withholdingMinor',withholding_minor,'fixedMinor',fixed_minor,
    'estimatedFeeMinor',estimated_fee_minor,'estimatedNetMinor',estimated_net_minor,
    'reason',reason,'createdAt',created_at,'estimateOnly',true,
    'settlementReconciled',false,'officialBooks',false,'actualProfit',false
  ) order by shop_id),'[]'::jsonb) into v_estimates from latest;
  return jsonb_build_object(
    'sessionId',p_session_id,'shops',v_shops,'orderImports',v_imports,
    'orderFacts',v_facts,'latestEstimates',v_estimates,
    'estimateOnly',true,'settlementReconciled',false,'officialBooks',false,'actualProfit',false
  );
end;
$$;

create or replace function public.read_admin_owner_close_stock_input_v1(p_session_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare v_session k2_private.owner_close_sessions; v_products jsonb; v_lots jsonb; v_observations jsonb; v_sales jsonb; v_reviews jsonb;
begin
  if auth.uid() is null or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
  end if;
  select * into v_session from k2_private.owner_close_sessions where id=p_session_id;
  if not found then return null; end if;
  with linked as (
    select distinct p.id,p.sku,p.name from k2_private.marketplace_product_aliases a
    join k2_private.owner_close_session_shops cs on cs.session_id=p_session_id and cs.shop_id=a.shop_id
    join public.products p on p.id=a.product_id
  ) select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'sku',sku,'name',name
  ) order by sku),'[]'::jsonb) into v_products from linked;
  with linked as (
    select distinct p.id,p.sku from k2_private.marketplace_product_aliases a
    join k2_private.owner_close_session_shops cs on cs.session_id=p_session_id and cs.shop_id=a.shop_id
    join public.products p on p.id=a.product_id
  ) select coalesce(jsonb_agg(jsonb_build_object(
    'id',b.id,'productId',p.id,'sku',b.sku,'quantity',b.quantity,
    'reservedQuantity',coalesce(b.reserved_quantity,0),'boxCode',b.box_code,
    'batchCode',b.batch_code,'expiryDate',b.expiry_date,'landedDate',b.landed_date,
    'hub',b.hub,'custodian',b.custodian,'channel',b.channel,
    'pinned',coalesce(b.is_pinned,false),'status',b.inventory_status
  ) order by b.sku,b.expiry_date nulls last,b.id),'[]'::jsonb) into v_lots
  from public.product_batches b join linked p on p.sku=b.sku;
  with latest as (
    select distinct on (o.product_id,o.shop_id) o.product_id,o.shop_id,
      o.reported_quantity,o.observed_at
    from k2_private.marketplace_listing_observations o
    join k2_private.owner_close_session_shops cs on cs.session_id=p_session_id and cs.shop_id=o.shop_id
    order by o.product_id,o.shop_id,o.observed_at desc,o.recorded_at desc
  ) select coalesce(jsonb_agg(jsonb_build_object(
    'productId',product_id,'shopId',shop_id,'reportedQuantity',reported_quantity,
    'observedAt',observed_at
  ) order by product_id,shop_id),'[]'::jsonb) into v_observations from latest;
  select coalesce(jsonb_agg(jsonb_build_object(
    'productId',product_id,'shopId',shop_id,'units',units
  ) order by product_id,shop_id),'[]'::jsonb) into v_sales from (
    select product_id,shop_id,sum((fact_data->>'quantity')::integer)::integer units
    from k2_private.owner_close_order_facts
    where session_id=p_session_id and outcome='accepted' and match_status='linked'
    group by product_id,shop_id
  ) s;
  select coalesce(jsonb_agg(jsonb_build_object(
    'productId',product_id,'expectedCanonicalBefore',expected_canonical_before,
    'physicalCount',physical_count,'discrepancy',discrepancy,'outcome',outcome,
    'reason',reason,'version',version,'recordedAt',recorded_at
  ) order by product_id),'[]'::jsonb) into v_reviews
  from k2_private.owner_close_stock_reviews where session_id=p_session_id;
  return jsonb_build_object(
    'sessionId',p_session_id,'asOf',statement_timestamp(),'products',v_products,
    'lots',v_lots,'observations',v_observations,'acceptedSales',v_sales,
    'reviews',v_reviews,
    'observationOnly',true,'canonicalMutationRoute','/api/admin/lots/reconcile'
  );
end;
$$;

create or replace function public.read_admin_owner_close_pasabuy_input_v1(p_session_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare v_session k2_private.owner_close_sessions; v_requests jsonb; v_reviews jsonb;
begin
  if auth.uid() is null or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
  end if;
  select * into v_session from k2_private.owner_close_sessions where id=p_session_id;
  if not found then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'publicReference',public_reference,'itemTitle',item_title,
    'quantity',quantity,'status',status,'createdAt',created_at,'updatedAt',updated_at
  ) order by created_at,id),'[]'::jsonb) into v_requests
  from public.pasabuy_requests
  where status not in ('delivered','expired','cancelled')
    and created_at<(v_session.period_end+1)::timestamptz;
  select coalesce(jsonb_agg(jsonb_build_object(
    'requestId',request_id,'readiness',readiness,'reason',reason,
    'version',version,'recordedAt',recorded_at
  ) order by request_id),'[]'::jsonb) into v_reviews
  from k2_private.owner_close_pasabuy_reviews where session_id=p_session_id;
  return jsonb_build_object(
    'sessionId',p_session_id,'requests',v_requests,'reviews',v_reviews,
    'customerMinimized',true,'canonicalPasabuyStatusChanged',false,
    'canonicalPasabuyRoute','/api/admin/pasabuy'
  );
end;
$$;

create or replace function public.read_admin_owner_close_bookkeeping_handoff_v1(p_session_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare
  v_session k2_private.owner_close_sessions;
  v_shops jsonb;
  v_handoff jsonb;
  v_blockers jsonb:='[]'::jsonb;
  v_shop_count integer:=0;
  v_missing_import integer:=0;
  v_conflict_import integer:=0;
  v_unresolved_order integer:=0;
  v_missing_fee integer:=0;
  v_linked_products integer:=0;
  v_stock_reviews integer:=0;
  v_stock_matched integer:=0;
  v_stock_reconciled integer:=0;
  v_total_physical bigint:=0;
  v_net_discrepancy bigint:=0;
  v_open_pasabuy integer:=0;
  v_pasabuy_reviews integer:=0;
  v_pasabuy_ready integer:=0;
  v_pasabuy_not_ready integer:=0;
  v_pasabuy_not_applicable integer:=0;
  v_coverage_include integer:=0;
  v_coverage_thin integer:=0;
  v_coverage_skip integer:=0;
begin
  if auth.uid() is null or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
  end if;
  select * into v_session from k2_private.owner_close_sessions where id=p_session_id;
  if not found then return null; end if;

  with latest_import as (
    select distinct on (i.shop_id) i.*
    from k2_private.owner_close_order_imports i
    where i.session_id=p_session_id order by i.shop_id,i.created_at desc,i.id desc
  ), latest_fee as (
    select distinct on (e.shop_id) e.*
    from k2_private.owner_close_fee_estimates e
    where e.session_id=p_session_id order by e.shop_id,e.estimate_version desc
  ), shop_facts as (
    select s.id,s.shop_code,s.display_name,s.channel_code,
      i.id as import_id,i.source_identity,i.accepted_count,i.duplicate_count,i.conflict_count,
      coalesce((select count(*) from k2_private.owner_close_order_facts f
        where f.import_id=i.id and f.outcome='accepted' and f.match_status<>'linked'),0)::integer as unresolved_count,
      e.id as estimate_id,e.estimate_version,e.policy_version,e.currency,e.gross_minor,
      e.estimated_fee_minor,e.estimated_net_minor
    from k2_private.owner_close_session_shops cs
    join public.channel_shops s on s.id=cs.shop_id
    left join latest_import i on i.shop_id=s.id
    left join latest_fee e on e.shop_id=s.id
    where cs.session_id=p_session_id
  )
  select count(*)::integer,
    count(*) filter(where import_id is null)::integer,
    count(*) filter(where coalesce(conflict_count,0)>0)::integer,
    coalesce(sum(unresolved_count),0)::integer,
    count(*) filter(where estimate_id is null)::integer,
    coalesce(jsonb_agg(jsonb_build_object(
      'shopId',id,'shopCode',shop_code,'displayName',display_name,'channelCode',channel_code,
      'orderImportId',import_id,
      'acceptedLines',coalesce(accepted_count,0),'duplicateLines',coalesce(duplicate_count,0),
      'conflictLines',coalesce(conflict_count,0),'unresolvedLines',unresolved_count,
      'feeEstimateId',estimate_id,'feeEstimateVersion',estimate_version,
      'feePolicyVersion',policy_version,'currency',currency,'grossMinor',gross_minor,
      'estimatedFeeMinor',estimated_fee_minor,'estimatedNetMinor',estimated_net_minor
    ) order by shop_code),'[]'::jsonb)
  into v_shop_count,v_missing_import,v_conflict_import,v_unresolved_order,v_missing_fee,v_shops
  from shop_facts;

  with linked as (
    select distinct a.product_id
    from k2_private.marketplace_product_aliases a
    join k2_private.owner_close_session_shops cs
      on cs.session_id=p_session_id and cs.shop_id=a.shop_id
    where a.active
  )
  select count(*)::integer,
    count(r.product_id)::integer,
    count(*) filter(where r.outcome='matched')::integer,
    count(*) filter(where r.outcome='reconciled')::integer,
    coalesce(sum(r.physical_count),0)::bigint,
    coalesce(sum(r.discrepancy),0)::bigint
  into v_linked_products,v_stock_reviews,v_stock_matched,v_stock_reconciled,
    v_total_physical,v_net_discrepancy
  from linked l left join k2_private.owner_close_stock_reviews r
    on r.session_id=p_session_id and r.product_id=l.product_id;

  select count(*)::integer,
    count(r.request_id)::integer,
    count(*) filter(where r.readiness='ready')::integer,
    count(*) filter(where r.readiness='not_ready')::integer,
    count(*) filter(where r.readiness='not_applicable')::integer
  into v_open_pasabuy,v_pasabuy_reviews,v_pasabuy_ready,
    v_pasabuy_not_ready,v_pasabuy_not_applicable
  from public.pasabuy_requests p
  left join k2_private.owner_close_pasabuy_reviews r
    on r.session_id=p_session_id and r.request_id=p.id
  where p.status not in ('delivered','expired','cancelled')
    and p.created_at<(v_session.period_end+1)::timestamptz;

  select count(*) filter(where action='include')::integer,
    count(*) filter(where action='thin')::integer,
    count(*) filter(where action='skip')::integer
  into v_coverage_include,v_coverage_thin,v_coverage_skip
  from k2_private.marketplace_coverage_overrides where session_id=p_session_id;

  if v_session.current_step<>'bookkeeping_handoff' then
    v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','HANDOFF_STEP_NOT_REACHED','count',1));
  end if;
  if v_session.status not in ('in_progress','completed') then
    v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','SESSION_NOT_CLOSABLE','count',1));
  end if;
  if v_missing_import>0 then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','MISSING_ORDER_IMPORT','count',v_missing_import)); end if;
  if v_conflict_import>0 then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','ORDER_CONFLICTS','count',v_conflict_import)); end if;
  if v_unresolved_order>0 then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','UNRESOLVED_ORDER_LINES','count',v_unresolved_order)); end if;
  if v_missing_fee>0 then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','MISSING_FEE_ESTIMATE','count',v_missing_fee)); end if;
  if v_stock_reviews<v_linked_products then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','MISSING_STOCK_REVIEW','count',v_linked_products-v_stock_reviews)); end if;
  if v_pasabuy_reviews<v_open_pasabuy then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','MISSING_PASABUY_REVIEW','count',v_open_pasabuy-v_pasabuy_reviews)); end if;
  if v_pasabuy_not_ready>0 then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','PASABUY_NOT_READY','count',v_pasabuy_not_ready)); end if;

  select jsonb_build_object(
    'artifactId',id,'artifactVersion',version,'createdAt',created_at,'updatedAt',updated_at
  ) into v_handoff from k2_private.owner_close_bookkeeping_handoffs where session_id=p_session_id;

  return jsonb_build_object(
    'sessionId',p_session_id,'periodStart',v_session.period_start,'periodEnd',v_session.period_end,
    'timezone',v_session.timezone,'status',v_session.status,'currentStep',v_session.current_step,
    'sessionVersion',v_session.version,'readyToClose',jsonb_array_length(v_blockers)=0,
    'blockers',v_blockers,'handoff',v_handoff,
    'summary',jsonb_build_object(
      'shopCount',v_shop_count,'shops',v_shops,
      'stock',jsonb_build_object('linkedProducts',v_linked_products,'reviewedProducts',v_stock_reviews,
        'matchedProducts',v_stock_matched,'reconciledProducts',v_stock_reconciled,
        'totalPhysicalCount',v_total_physical,'netDiscrepancy',v_net_discrepancy),
      'coverageOverrides',jsonb_build_object('include',v_coverage_include,'thin',v_coverage_thin,'skip',v_coverage_skip),
      'pasabuy',jsonb_build_object('openRequests',v_open_pasabuy,'reviewedRequests',v_pasabuy_reviews,
        'ready',v_pasabuy_ready,'notReady',v_pasabuy_not_ready,'notApplicable',v_pasabuy_not_applicable)
    ),
    'customerMinimized',true,'estimateOnly',true,'officialBooks',false,
    'settlementReconciled',false,'actualProfit',false
  );
end;
$$;

create or replace function public.read_admin_marketplace_coverage_input_v1(p_session_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path=''
as $$
declare
  v_session k2_private.owner_close_sessions;
  v_shops jsonb;
  v_products jsonb;
  v_observations jsonb;
  v_sales jsonb;
begin
  if auth.uid() is null or not public.is_admin() or coalesce(auth.jwt()->>'aal','')<>'aal2' then
    raise exception using errcode='42501',message='K2_MARKETPLACE_ADMIN_REQUIRED';
  end if;
  select * into v_session from k2_private.owner_close_sessions where id=p_session_id;
  if not found then return null; end if;

  with selected_shops as (
    select s.id,s.shop_code,s.display_name
    from k2_private.owner_close_session_shops cs
    join public.channel_shops s on s.id=cs.shop_id
    where cs.session_id=p_session_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'shopCode',shop_code,'displayName',display_name
  ) order by shop_code),'[]'::jsonb) into v_shops from selected_shops;

  with linked_products as (
    select distinct p.id,p.sku
    from k2_private.marketplace_product_aliases a
    join k2_private.owner_close_session_shops cs
      on cs.session_id=p_session_id and cs.shop_id=a.shop_id
    join public.products p on p.id=a.product_id
  ), available as (
    select sku,coalesce(sum(available),0)::integer as eligible_quantity
    from public.inventory_balances group by sku
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'sku',p.sku,'eligibleQuantity',coalesce(a.eligible_quantity,0)
  ) order by p.sku),'[]'::jsonb) into v_products
  from linked_products p left join available a on a.sku=p.sku;

  with latest as (
    select distinct on (o.product_id,o.shop_id)
      o.product_id,o.shop_id,o.reported_quantity,o.observed_at
    from k2_private.marketplace_listing_observations o
    join k2_private.owner_close_session_shops cs
      on cs.session_id=p_session_id and cs.shop_id=o.shop_id
    order by o.product_id,o.shop_id,o.observed_at desc,o.recorded_at desc
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'productId',product_id,'shopId',shop_id,'reportedQuantity',reported_quantity,
    'observedAt',observed_at,'needsReview',false
  ) order by product_id,shop_id),'[]'::jsonb) into v_observations from latest;

  with linked_products as (
    select distinct p.id,p.sku
    from k2_private.marketplace_product_aliases a
    join k2_private.owner_close_session_shops cs
      on cs.session_id=p_session_id and cs.shop_id=a.shop_id
    join public.products p on p.id=a.product_id
  ), verified_sales as (
    select p.id as product_id,o.shop_id,sum(i.quantity)::integer as verified_units
    from public.order_requests o
    join public.order_request_items i on i.order_request_id=o.id
    join linked_products p on p.sku=i.sku
    join k2_private.owner_close_session_shops cs
      on cs.session_id=p_session_id and cs.shop_id=o.shop_id
    where o.status in ('confirmed','fulfilled')
      and o.created_at>=v_session.period_start::timestamptz
      and o.created_at<(v_session.period_end+1)::timestamptz
    group by p.id,o.shop_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'productId',product_id,'shopId',shop_id,'verifiedUnits',verified_units
  ) order by product_id,shop_id),'[]'::jsonb) into v_sales from verified_sales;

  return jsonb_build_object(
    'sessionId',v_session.id,'asOf',statement_timestamp(),
    'targetPerShop',2,'freshnessHours',72,
    'shops',v_shops,'products',v_products,'observations',v_observations,
    'recentSales',v_sales,'overrides',coalesce((select jsonb_agg(jsonb_build_object(
      'productId',product_id,'shopId',shop_id,'action',action,'priority',priority,'reason',reason
    ) order by product_id,shop_id) from k2_private.marketplace_coverage_overrides
      where session_id=p_session_id),'[]'::jsonb),
    'effect','proposal_only','providerWrite',false,'custodyTransfer',false
  );
end;
$$;

revoke all on function public.read_admin_marketplace_snapshot_row_v1(uuid,uuid)
  from public,anon,authenticated;
revoke all on function public.read_admin_marketplace_snapshot_status_v1(uuid)
  from public,anon,authenticated;
revoke all on function public.read_admin_owner_close_session_v1(uuid)
  from public,anon,authenticated;
revoke all on function public.read_admin_owner_close_order_import_v1(uuid)
  from public,anon,authenticated;
revoke all on function public.read_admin_marketplace_shop_options_v1()
  from public,anon,authenticated;
revoke all on function public.read_admin_owner_close_fee_input_v1(uuid)
  from public,anon,authenticated;
revoke all on function public.read_admin_owner_close_stock_input_v1(uuid)
  from public,anon,authenticated;
revoke all on function public.read_admin_owner_close_pasabuy_input_v1(uuid)
  from public,anon,authenticated;
revoke all on function public.read_admin_owner_close_bookkeeping_handoff_v1(uuid)
  from public,anon,authenticated;
revoke all on function public.read_admin_marketplace_coverage_input_v1(uuid)
  from public,anon,authenticated;
grant execute on function public.read_admin_marketplace_snapshot_row_v1(uuid,uuid) to authenticated;
grant execute on function public.read_admin_marketplace_snapshot_status_v1(uuid) to authenticated;
grant execute on function public.read_admin_owner_close_session_v1(uuid) to authenticated;
grant execute on function public.read_admin_owner_close_order_import_v1(uuid) to authenticated;
grant execute on function public.read_admin_marketplace_shop_options_v1() to authenticated;
grant execute on function public.read_admin_owner_close_fee_input_v1(uuid) to authenticated;
grant execute on function public.read_admin_owner_close_stock_input_v1(uuid) to authenticated;
grant execute on function public.read_admin_owner_close_pasabuy_input_v1(uuid) to authenticated;
grant execute on function public.read_admin_owner_close_bookkeeping_handoff_v1(uuid) to authenticated;
grant execute on function public.read_admin_marketplace_coverage_input_v1(uuid) to authenticated;

notify pgrst,'reload schema';
commit;
