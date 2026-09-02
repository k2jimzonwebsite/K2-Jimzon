-- MAP-023 — durable, owner-editable delivery quotation control.
--
-- Until now the delivery fee was a number a staff member typed by hand, and the
-- owner-approved pilot rules lived only in an Excel workbook that no deployed
-- surface could read. This is the storage that workbook was always a stand-in
-- for: courier options, exact-locality rules, and versioned costs that the owner
-- edits from the admin dashboard when prices go up.
--
-- Two boundaries are enforced here rather than in application code:
--
--   1. What a courier costs K2 is commercial data. No client role may read
--      public.delivery_cost_rows at all. The storefront receives a resolved fee
--      from the signed function below and never the costs behind it.
--   2. No client role may write any table here. Every change arrives through the
--      signed admin command, so an "owner approved" rate can only ever mean a
--      member of staff with an authenticated admin session pressed approve.
--
-- Money is integer centavos throughout. A blank amount means unknown; zero is
-- valid only for a confirmed K2 pickup, which is resolved without a cost row.

begin;

do $preflight$
begin
  if to_regprocedure('k2_private.verify_admin_bff_request(text,bigint,uuid,uuid,text,text)') is null
     or to_regclass('k2_private.admin_command_receipts') is null
     or to_regprocedure('public.is_staff()') is null then
    raise exception 'Admin BFF command foundation must be applied first';
  end if;
end
$preflight$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Evidence behind a cost. A rate whose source is no longer current degrades to
-- manual quotation rather than continuing to price orders silently.
create table if not exists public.delivery_rate_sources (
  source_id text not null primary key,
  label text not null,
  source_kind text not null,
  currency text not null default 'PHP',
  freshness text not null default 'CURRENT',
  integrity text not null default 'OK',
  captured_at timestamptz not null default now(),
  captured_by uuid,
  review_due_on date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_rate_sources_id_check
    check (source_id ~ '^[A-Z][A-Z0-9-]{2,63}$'),
  constraint delivery_rate_sources_kind_check
    check (source_kind in ('vip_quick_inquiry', 'contract_card', 'public_reference', 'api_snapshot')),
  constraint delivery_rate_sources_freshness_check
    check (freshness in ('CURRENT', 'REVIEW_DUE', 'SUPERSEDED')),
  constraint delivery_rate_sources_integrity_check
    check (integrity in ('OK', 'DATA_CONFLICT_STOP')),
  constraint delivery_rate_sources_currency_check check (currency = 'PHP'),
  constraint delivery_rate_sources_notes_length_check check (char_length(notes) <= 2000)
);

-- The editable courier list. Marking a courier AUTO_QUOTE_ELIGIBLE without a
-- current cost row for a route removes automatic quoting on that route, by
-- design: the fee is the maximum across every selectable option, so an unpriced
-- selectable option means K2 cannot yet bound its own cost.
create table if not exists public.delivery_courier_options (
  option_id text not null primary key,
  provider_id text not null,
  provider_name text not null,
  service_code text not null,
  service_name text not null,
  origin_id text not null,
  eligibility text not null default 'MANUAL_ONLY',
  approved boolean not null default false,
  integrity text not null default 'OK',
  sort_order integer not null default 100,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_courier_options_id_check
    check (option_id ~ '^[A-Z][A-Z0-9-]{2,63}$'),
  constraint delivery_courier_options_eligibility_check
    check (eligibility in ('AUTO_QUOTE_ELIGIBLE', 'MANUAL_ONLY', 'DISABLED')),
  constraint delivery_courier_options_integrity_check
    check (integrity in ('OK', 'DATA_CONFLICT_STOP')),
  constraint delivery_courier_options_origin_check
    check (origin_id in ('WAREHOUSE_A', 'CEBU_TRANSIT_HUB')),
  constraint delivery_courier_options_names_check
    check (char_length(btrim(provider_name)) between 1 and 120
       and char_length(btrim(service_name)) between 1 and 120),
  constraint delivery_courier_options_notes_length_check check (char_length(notes) <= 2000),
  -- An approved option that nobody may select is a contradiction staff would
  -- have to reason about later; require the two flags to agree.
  constraint delivery_courier_options_approved_selectable_check
    check (eligibility <> 'AUTO_QUOTE_ELIGIBLE' or approved)
);

-- Exact-locality rules. EXACT_PILOT rows may price an order; REFERENCE_ONLY rows
-- (the macro-area planning floors) are recorded for planning and can never be
-- quoted, which is why scope and status are separate columns.
create table if not exists public.delivery_locality_rules (
  locality_id text not null primary key,
  match_key text not null,
  scope text not null default 'REFERENCE_ONLY',
  status text not null default 'DRAFT',
  profile_id text not null default 'PROFILE-STD-1P-UPTO-3KG',
  integrity text not null default 'OK',
  psgc_code text,
  region text not null default '',
  island_group text not null default '',
  province text,
  city_municipality text not null default '',
  barangay text not null default '',
  evidence_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_locality_rules_id_check
    check (locality_id ~ '^[A-Z][A-Z0-9-]{2,63}$'),
  constraint delivery_locality_rules_scope_check
    check (scope in ('EXACT_PILOT', 'REFERENCE_ONLY')),
  constraint delivery_locality_rules_status_check
    check (status in ('DRAFT', 'PILOT_APPROVED', 'PLANNING_FLOOR_NOT_QUOTABLE', 'RETIRED')),
  constraint delivery_locality_rules_integrity_check
    check (integrity in ('OK', 'DATA_CONFLICT_STOP')),
  constraint delivery_locality_rules_match_key_check
    check (match_key ~ '^[A-Z0-9*|.-]{3,160}$'),
  -- Only an exact pilot row may ever hold the quotable status, and a planning
  -- floor may never be one. This is the rule that stops a regional fallback.
  constraint delivery_locality_rules_quotable_scope_check
    check ((status = 'PILOT_APPROVED') = (scope = 'EXACT_PILOT'))
);

create unique index if not exists delivery_locality_rules_match_key_unique
  on public.delivery_locality_rules (match_key)
  where status = 'PILOT_APPROVED';

-- Versioned costs. Effective intervals are half-open [effective_from, effective_to)
-- on Asia/Manila calendar dates, so a replacement row starting on the day the old
-- one ends does not overlap it.
create table if not exists public.delivery_cost_rows (
  cost_id text not null primary key,
  option_id text not null references public.delivery_courier_options (option_id) on delete restrict,
  origin_id text not null,
  locality_id text not null references public.delivery_locality_rules (locality_id) on delete restrict,
  profile_id text not null default 'PROFILE-STD-1P-UPTO-3KG',
  source_id text not null references public.delivery_rate_sources (source_id) on delete restrict,
  currency text not null default 'PHP',
  completeness text not null default 'UNKNOWN',
  amount_minor integer,
  status text not null default 'DRAFT',
  approved_by_owner boolean not null default false,
  approved_by uuid,
  approved_at timestamptz,
  effective_from date not null,
  effective_to date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_cost_rows_id_check
    check (cost_id ~ '^[A-Z][A-Z0-9-]{2,63}$'),
  constraint delivery_cost_rows_currency_check check (currency = 'PHP'),
  constraint delivery_cost_rows_completeness_check
    check (completeness in ('PROVIDER_TOTAL_COMPLETE', 'PARTIAL', 'UNKNOWN')),
  constraint delivery_cost_rows_status_check
    check (status in ('DRAFT', 'ACTIVE_APPROVED', 'SUPERSEDED')),
  constraint delivery_cost_rows_amount_range_check
    check (amount_minor is null or (amount_minor > 0 and amount_minor <= 1000000)),
  constraint delivery_cost_rows_interval_check
    check (effective_to is null or effective_to > effective_from),
  constraint delivery_cost_rows_notes_length_check check (char_length(notes) <= 2000),
  -- An active row must be complete, owner-approved, and carry an amount. A blank
  -- amount means unknown, and unknown must never reach a customer as a charge.
  constraint delivery_cost_rows_active_is_complete_check
    check (
      status <> 'ACTIVE_APPROVED'
      or (completeness = 'PROVIDER_TOTAL_COMPLETE' and approved_by_owner and amount_minor is not null)
    )
);

-- Duplicate active rules stop quotation rather than being resolved by priority,
-- so the database refuses to store the ambiguity in the first place. The partial
-- index covers open-ended rows; overlapping closed intervals are rejected by the
-- admin command, which has the effective dates to compare.
create unique index if not exists delivery_cost_rows_active_open_route_unique
  on public.delivery_cost_rows (option_id, origin_id, locality_id, profile_id)
  where status = 'ACTIVE_APPROVED' and effective_to is null;

create index if not exists delivery_cost_rows_route_idx
  on public.delivery_cost_rows (locality_id, option_id, status);

-- Accepted quotes are frozen here. Reconciliation reads this, never the live
-- table, so a later rate revision can never change what a customer agreed to pay.
create table if not exists public.delivery_quote_snapshots (
  id uuid not null default gen_random_uuid() primary key,
  order_request_id uuid,
  public_reference text,
  outcome text not null,
  fee_minor integer,
  currency text not null default 'PHP',
  snapshot jsonb not null default '{}'::jsonb,
  cost_actual_minor integer,
  reconciled_at timestamptz,
  reconciled_by uuid,
  created_at timestamptz not null default now(),
  constraint delivery_quote_snapshots_outcome_check
    check (outcome in (
      'INPUT_ERROR', 'DATA_CONFLICT_STOP', 'PLATFORM_CHARGED_EXTERNAL', 'PICKUP_ZERO',
      'UNAVAILABLE', 'MANUAL_COURIER_QUOTE', 'STANDARD_FEE'
    )),
  constraint delivery_quote_snapshots_fee_check
    check (fee_minor is null or (fee_minor >= 0 and fee_minor <= 1000000)),
  -- Only these two outcomes carry a number. Everything else must store a blank
  -- fee so a stop can never be mistaken for a free delivery.
  constraint delivery_quote_snapshots_fee_outcome_check
    check ((fee_minor is not null) = (outcome in ('STANDARD_FEE', 'PICKUP_ZERO'))),
  constraint delivery_quote_snapshots_zero_is_pickup_check
    check (fee_minor is null or fee_minor > 0 or outcome = 'PICKUP_ZERO')
);

create index if not exists delivery_quote_snapshots_order_idx
  on public.delivery_quote_snapshots (order_request_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.delivery_rate_sources enable row level security;
alter table public.delivery_courier_options enable row level security;
alter table public.delivery_locality_rules enable row level security;
alter table public.delivery_cost_rows enable row level security;
alter table public.delivery_quote_snapshots enable row level security;

alter table public.delivery_rate_sources force row level security;
alter table public.delivery_courier_options force row level security;
alter table public.delivery_locality_rules force row level security;
alter table public.delivery_cost_rows force row level security;
alter table public.delivery_quote_snapshots force row level security;

revoke all on table public.delivery_rate_sources from public, anon, authenticated;
revoke all on table public.delivery_courier_options from public, anon, authenticated;
revoke all on table public.delivery_locality_rules from public, anon, authenticated;
revoke all on table public.delivery_cost_rows from public, anon, authenticated;
revoke all on table public.delivery_quote_snapshots from public, anon, authenticated;

-- Staff may read the control tables so the dashboard can render them. Note that
-- delivery_cost_rows receives no grant to any client role at all: what a courier
-- charges K2 leaves the database only as a resolved fee.
grant select on table public.delivery_rate_sources to authenticated;
grant select on table public.delivery_courier_options to authenticated;
grant select on table public.delivery_locality_rules to authenticated;
grant select on table public.delivery_quote_snapshots to authenticated;

drop policy if exists delivery_rate_sources_staff_read on public.delivery_rate_sources;
create policy delivery_rate_sources_staff_read
  on public.delivery_rate_sources for select to authenticated using (public.is_staff());

drop policy if exists delivery_courier_options_staff_read on public.delivery_courier_options;
create policy delivery_courier_options_staff_read
  on public.delivery_courier_options for select to authenticated using (public.is_staff());

drop policy if exists delivery_locality_rules_staff_read on public.delivery_locality_rules;
create policy delivery_locality_rules_staff_read
  on public.delivery_locality_rules for select to authenticated using (public.is_staff());

drop policy if exists delivery_quote_snapshots_staff_read on public.delivery_quote_snapshots;
create policy delivery_quote_snapshots_staff_read
  on public.delivery_quote_snapshots for select to authenticated using (public.is_staff());

-- No insert, update or delete policy exists for any client role on any table
-- above, so the signed admin command is the only writer.

-- ---------------------------------------------------------------------------
-- Staff read: the full control set, including costs, for the dashboard
-- ---------------------------------------------------------------------------

create or replace function public.read_delivery_control_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'STAFF_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'sources', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sourceId', s.source_id, 'label', s.label, 'sourceKind', s.source_kind,
        'currency', s.currency, 'freshness', s.freshness, 'integrity', s.integrity,
        'reviewDueOn', s.review_due_on, 'notes', s.notes, 'capturedAt', s.captured_at
      ) order by s.source_id) from public.delivery_rate_sources s
    ), '[]'::jsonb),
    'courierOptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'optionId', o.option_id, 'providerId', o.provider_id, 'providerName', o.provider_name,
        'serviceCode', o.service_code, 'serviceName', o.service_name, 'originId', o.origin_id,
        'eligibility', o.eligibility, 'approved', o.approved, 'integrity', o.integrity,
        'sortOrder', o.sort_order, 'notes', o.notes
      ) order by o.sort_order, o.option_id) from public.delivery_courier_options o
    ), '[]'::jsonb),
    'localityRules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'localityId', l.locality_id, 'matchKey', l.match_key, 'scope', l.scope,
        'status', l.status, 'profileId', l.profile_id, 'integrity', l.integrity,
        'psgcCode', l.psgc_code, 'region', l.region, 'islandGroup', l.island_group,
        'province', l.province, 'cityMunicipality', l.city_municipality,
        'barangay', l.barangay, 'evidenceNote', l.evidence_note
      ) order by l.scope desc, l.locality_id) from public.delivery_locality_rules l
    ), '[]'::jsonb),
    'costRows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'costId', c.cost_id, 'optionId', c.option_id, 'originId', c.origin_id,
        'localityId', c.locality_id, 'profileId', c.profile_id, 'sourceId', c.source_id,
        'currency', c.currency, 'completeness', c.completeness, 'amountMinor', c.amount_minor,
        'status', c.status, 'approvedByOwner', c.approved_by_owner,
        'effectiveFrom', c.effective_from, 'effectiveTo', c.effective_to, 'notes', c.notes
      ) order by c.locality_id, c.option_id, c.effective_from) from public.delivery_cost_rows c
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.read_delivery_control_v1() from public, anon;
grant execute on function public.read_delivery_control_v1() to authenticated;

-- ---------------------------------------------------------------------------
-- Storefront read: quotable localities only, with no cost data whatsoever
-- ---------------------------------------------------------------------------

create or replace function public.read_delivery_pilot_localities_v1()
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'localityId', l.locality_id,
    'region', l.region,
    'province', l.province,
    'cityMunicipality', l.city_municipality,
    'barangay', l.barangay
  ) order by l.city_municipality, l.barangay), '[]'::jsonb)
  from public.delivery_locality_rules l
  where l.scope = 'EXACT_PILOT'
    and l.status = 'PILOT_APPROVED'
    and l.integrity = 'OK'
    -- A locality with no current, complete, approved, open cost row cannot be
    -- quoted, so offering it at checkout would only produce a dead end.
    and exists (
      select 1 from public.delivery_cost_rows c
      join public.delivery_courier_options o on o.option_id = c.option_id
      where c.locality_id = l.locality_id
        and c.status = 'ACTIVE_APPROVED'
        and c.effective_from <= (now() at time zone 'Asia/Manila')::date
        and (c.effective_to is null or c.effective_to > (now() at time zone 'Asia/Manila')::date)
        and o.eligibility = 'AUTO_QUOTE_ELIGIBLE'
        and o.approved
    );
$$;

revoke all on function public.read_delivery_pilot_localities_v1() from public;
grant execute on function public.read_delivery_pilot_localities_v1() to anon, authenticated;

commit;
