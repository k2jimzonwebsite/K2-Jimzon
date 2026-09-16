import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// MAP-028 K: Catalog stock reconciliation, grants, and publication contract

const FORWARD_MIGRATION = 'supabase/migrations/20260916_catalog_stock_reconciliation_and_grants.sql'
const ROLLBACK_MIGRATION = 'supabase/migrations/20260916_catalog_stock_reconciliation_and_grants_rollback.sql'

test('catalog stock reconciliation migration adheres to transaction and security invariants', async () => {
  const sql = await readFile(FORWARD_MIGRATION, 'utf8')

  expect(sql).toMatch(/^begin;/m)
  expect(sql).toMatch(/commit;\s*$/m)

  // Must set transaction session config for stock write
  expect(sql).toContain("set_config('k2.allow_stock_write', 'on', true)")

  // Must grant permissions on stock projection view and function
  expect(sql).toContain('grant execute on function public.get_public_product_stock() to anon')
  expect(sql).toContain('grant select on public.v_product_stock_from_batches to anon')

  // Must update RLS policies for unlisted product direct access
  expect(sql).toContain("any (array['Live'::text, 'Active'::text, 'Unlisted'::text])")

  // Must retire legacy mock uppercase SKUs
  expect(sql).toContain("'LAV-ORO-1KG'")
  expect(sql).toContain("'MUT-PAS-400'")
  expect(sql).toContain("'NUT-BIS-304'")
  expect(sql).toContain("'PST-GEN-190'")
  expect(sql).toContain("'TRF-OIL-500'")
  expect(sql).toContain("status = 'Discontinued'")
  expect(sql).toContain('published = false')

  // Must verify postflight
  expect(sql).toContain('POSTFLIGHT_FAILED')
})

test('rollback migration cleanly revokes grants and restores status checks', async () => {
  const sql = await readFile(ROLLBACK_MIGRATION, 'utf8')

  expect(sql).toMatch(/^begin;/m)
  expect(sql).toMatch(/commit;\s*$/m)

  expect(sql).toContain('revoke execute on function public.get_public_product_stock() from anon')
  expect(sql).toContain('revoke select on public.v_product_stock_from_batches from anon')
  expect(sql).toContain("any (array['Live'::text, 'Active'::text])")
})
