-- MAP-023 — seed the owner-approved controlled pilot.
--
-- These are the eight verified Warehouse A J&T VIP observations from
-- docs/specs/SHIPPING_AND_COURIER_LOGIC_SPEC.md section 1.1, and nothing more.
-- The four macro-area values are seeded as REFERENCE_ONLY planning floors so the
-- dashboard can show them while the schema forbids them from pricing an order.
--
-- Re-running this file restores the approved baseline. It deliberately does not
-- touch rows the owner has since edited beyond those identifiers.

begin;

insert into public.delivery_rate_sources
  (source_id, label, source_kind, currency, freshness, integrity, review_due_on, notes)
values
  ('SRC-JNT-VIP-20260901', 'J&T VIP quick inquiry, 1 September 2026', 'vip_quick_inquiry',
   'PHP', 'CURRENT', 'OK', '2026-12-01',
   'Eight observed provider totals for the controlled non-exception profile from Warehouse A.'),
  ('SRC-JNT-PUBLIC-20260901', 'J&T public rate reference, 1 September 2026', 'public_reference',
   'PHP', 'CURRENT', 'OK', '2026-12-01',
   'Comparison reference only. Never used to price a customer order.')
on conflict (source_id) do nothing;

insert into public.delivery_courier_options
  (option_id, provider_id, provider_name, service_code, service_name, origin_id,
   eligibility, approved, integrity, sort_order, notes)
values
  ('OPT-JNT-EZ-WHA', 'PRV-JNT', 'J&T Express', 'JNT_EZ_ORDINARY', 'J&T EZ ordinary',
   'WAREHOUSE_A', 'AUTO_QUOTE_ELIGIBLE', true, 'OK', 10,
   'One parcel, no pouch, no declared value, no COD, no premium service.')
on conflict (option_id) do nothing;

-- The eight exact pilot localities.
insert into public.delivery_locality_rules
  (locality_id, match_key, scope, status, profile_id, integrity,
   psgc_code, region, island_group, province, city_municipality, barangay, evidence_note)
values
  ('LOC-SJDM-MUZON-E', 'BULACAN|SAN-JOSE-DEL-MONTE-CITY|MUZON-EAST', 'EXACT_PILOT',
   'PILOT_APPROVED', 'PROFILE-STD-1P-UPTO-3KG', 'OK', '030000000',
   'Region III (Central Luzon)', 'Luzon', 'Bulacan', 'San Jose del Monte City', 'Muzon East',
   'Exact locality only'),
  ('LOC-ANGELES-AGAPITO', 'PAMPANGA|ANGELES-CITY|AGAPITO-DEL-ROSARIO', 'EXACT_PILOT',
   'PILOT_APPROVED', 'PROFILE-STD-1P-UPTO-3KG', 'OK', '030000000',
   'Region III (Central Luzon)', 'Luzon', 'Pampanga', 'Angeles City', 'Agapito del Rosario',
   'Exact locality only'),
  ('LOC-CALAMBA-BAGONG-K', 'LAGUNA|CALAMBA-CITY|BAGONG-KALSADA', 'EXACT_PILOT',
   'PILOT_APPROVED', 'PROFILE-STD-1P-UPTO-3KG', 'OK', '040000000',
   'Region IV-A (CALABARZON)', 'Luzon', 'Laguna', 'Calamba City', 'Bagong Kalsada',
   'Exact locality only'),
  ('LOC-DAGUPAN-BACAYAO-N', 'PANGASINAN|DAGUPAN-CITY|BACAYAO-NORTE', 'EXACT_PILOT',
   'PILOT_APPROVED', 'PROFILE-STD-1P-UPTO-3KG', 'OK', '010000000',
   'Region I (Ilocos Region)', 'Luzon', 'Pangasinan', 'Dagupan City', 'Bacayao Norte',
   'Exact locality only'),
  ('LOC-BAGUIO-ABCR', 'BENGUET|BAGUIO-CITY|ABCR', 'EXACT_PILOT',
   'PILOT_APPROVED', 'PROFILE-STD-1P-UPTO-3KG', 'OK', '140000000',
   'Cordillera Administrative Region', 'Luzon', 'Benguet (geographic)', 'Baguio City',
   'A. Bonifacio-Caguioa-Rimando (ABCR)', 'Exact locality only'),
  ('LOC-CALOOCAN-BRGY-1', 'NCR|CALOOCAN|BARANGAY-1', 'EXACT_PILOT',
   'PILOT_APPROVED', 'PROFILE-STD-1P-UPTO-3KG', 'OK', '130000000',
   'National Capital Region', 'Luzon', null, 'Caloocan', 'Barangay 1',
   'Exact locality only'),
  ('LOC-CEBU-APAS', 'CEBU|CEBU-CITY|APAS', 'EXACT_PILOT',
   'PILOT_APPROVED', 'PROFILE-STD-1P-UPTO-3KG', 'OK', '070000000',
   'Region VII (Central Visayas)', 'Visayas', 'Cebu', 'Cebu City', 'Apas',
   'Exact locality only'),
  ('LOC-DAVAO-AGDAO', 'DAVAO-DEL-SUR|DAVAO-CITY|AGDAO', 'EXACT_PILOT',
   'PILOT_APPROVED', 'PROFILE-STD-1P-UPTO-3KG', 'OK', '110000000',
   'Region XI (Davao Region)', 'Mindanao', 'Davao del Sur (geographic)', 'Davao City', 'Agdao',
   'Exact locality only')
on conflict (locality_id) do nothing;

-- The four macro-area planning floors. The quotable-scope constraint guarantees a
-- REFERENCE_ONLY row can never hold PILOT_APPROVED, so these can never price an
-- order no matter what the dashboard sends.
insert into public.delivery_locality_rules
  (locality_id, match_key, scope, status, profile_id, integrity,
   region, island_group, city_municipality, barangay, evidence_note)
values
  ('LOC-FLOOR-LUZON', 'FLOOR|LUZON', 'REFERENCE_ONLY', 'PLANNING_FLOOR_NOT_QUOTABLE',
   'PROFILE-STD-1P-UPTO-3KG', 'OK', 'Luzon', 'Luzon', '', '',
   'Planning floor PHP 85. Not a coverage claim and never quotable.'),
  ('LOC-FLOOR-NCR', 'FLOOR|NCR', 'REFERENCE_ONLY', 'PLANNING_FLOOR_NOT_QUOTABLE',
   'PROFILE-STD-1P-UPTO-3KG', 'OK', 'National Capital Region', 'Luzon', '', '',
   'Planning floor PHP 95. Not a coverage claim and never quotable.'),
  ('LOC-FLOOR-VISAYAS', 'FLOOR|VISAYAS', 'REFERENCE_ONLY', 'PLANNING_FLOOR_NOT_QUOTABLE',
   'PROFILE-STD-1P-UPTO-3KG', 'OK', 'Visayas', 'Visayas', '', '',
   'Planning floor PHP 100. Not a coverage claim and never quotable.'),
  ('LOC-FLOOR-MINDANAO', 'FLOOR|MINDANAO', 'REFERENCE_ONLY', 'PLANNING_FLOOR_NOT_QUOTABLE',
   'PROFILE-STD-1P-UPTO-3KG', 'OK', 'Mindanao', 'Mindanao', '', '',
   'Planning floor PHP 105. Not a coverage claim and never quotable.')
on conflict (locality_id) do nothing;

-- Observed provider totals. Effective from the observation date, open-ended.
insert into public.delivery_cost_rows
  (cost_id, option_id, origin_id, locality_id, profile_id, source_id, currency,
   completeness, amount_minor, status, approved_by_owner, approved_at,
   effective_from, effective_to, notes)
select
  row_data.cost_id, 'OPT-JNT-EZ-WHA', 'WAREHOUSE_A', row_data.locality_id,
  'PROFILE-STD-1P-UPTO-3KG', 'SRC-JNT-VIP-20260901', 'PHP',
  'PROVIDER_TOTAL_COMPLETE', row_data.amount_minor, 'ACTIVE_APPROVED', true, now(),
  date '2026-09-01', null,
  'Observed provider total for the controlled non-exception profile.'
from (values
  ('COST-JNT-SJDM',     'LOC-SJDM-MUZON-E',      8500),
  ('COST-JNT-ANGELES',  'LOC-ANGELES-AGAPITO',   8500),
  ('COST-JNT-CALAMBA',  'LOC-CALAMBA-BAGONG-K',  8500),
  ('COST-JNT-DAGUPAN',  'LOC-DAGUPAN-BACAYAO-N', 8500),
  ('COST-JNT-BAGUIO',   'LOC-BAGUIO-ABCR',       8500),
  ('COST-JNT-CALOOCAN', 'LOC-CALOOCAN-BRGY-1',   9500),
  ('COST-JNT-CEBU',     'LOC-CEBU-APAS',        10000),
  ('COST-JNT-DAVAO',    'LOC-DAVAO-AGDAO',      10500)
) as row_data(cost_id, locality_id, amount_minor)
on conflict (cost_id) do nothing;

commit;
