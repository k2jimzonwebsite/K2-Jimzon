import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const source = async (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8').catch(() => '')

test('MAP-017 error-report cutover revokes direct browser writes without changing the authorized phase-one payload', async () => {
  const [migration, applyRunner] = await Promise.all([
    source('supabase/migrations/20260826_map017_error_report_boundary.sql'),
    source('scripts/apply-map017-migration.mjs'),
  ])

  expect(migration).toContain('begin;')
  expect(migration).toContain('public.error_reports')
  expect(migration).toMatch(/drop policy if exists "Anyone can log errors" on public\.error_reports/i)
  expect(migration).toMatch(/drop policy if exists error_reports_public_insert on public\.error_reports/i)
  expect(migration).toMatch(/revoke insert on public\.error_reports from anon, authenticated/i)
  expect(migration).toContain('MAP017_ERROR_REPORT_BOUNDARY_VERIFIED')
  expect(migration).not.toMatch(/grant insert on public\.error_reports to anon/i)

  // OWNER-005 authorizes the existing payload hash only; this cutover remains a
  // separate prepared migration until it receives its own coordinated gate.
  expect(applyRunner).not.toContain('20260826_map017_error_report_boundary.sql')
})

test('portable rehearsal models the vulnerable baseline and proves repeated browser writes retain zero rows', async () => {
  const [bootstrap, authorization, runner] = await Promise.all([
    source('supabase/tests/map017_rehearsal_bootstrap.sql'),
    source('supabase/tests/map017_error_report_boundary_authorization.sql'),
    source('scripts/rehearse-map017-portable.mjs'),
  ])

  expect(bootstrap).toContain('create table public.error_reports')
  expect(bootstrap).toMatch(/grant select, insert on public\.error_reports to anon, authenticated/i)
  expect(bootstrap).toContain('create policy error_reports_public_insert')
  expect(authorization).toContain('generate_series(1, 100)')
  expect(authorization).toContain('MAP017_ERROR_REPORT_FLOOD_DENIED')
  expect(authorization).toContain("values ('anon'), ('authenticated')")
  expect(authorization).toContain('MAP017_ERROR_REPORT_STAFF_READ_PRESERVED')
  expect(authorization).toContain('MAP017_ERROR_REPORT_NON_STAFF_READ_DENIED')
  expect(authorization).toContain("has_table_privilege('anon', 'public.error_reports', 'insert')")
  expect(authorization).toContain("has_table_privilege('authenticated', 'public.error_reports', 'insert')")
  expect(runner).toContain('20260826_map017_error_report_boundary.sql')
  expect(runner).toContain('map017_error_report_boundary_authorization.sql')
  expect(runner).toContain('MAP-017 error-report boundary replay')
})
