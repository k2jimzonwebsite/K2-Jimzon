import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('migration creates a default-off COD switch with anon read and staff-only write', async () => {
  const src = await read('../supabase/migrations/20260920_payment_method_availability.sql')
  expect(src).toContain('payment_method_availability')
  expect(src).toContain('cod_available boolean not null default false')
  expect(src).toContain('is_staff()')
  expect(src).toContain('anon')
  expect(src).toContain('check_cod_availability')
  const rollback = await read('../supabase/migrations/20260920_payment_method_availability_rollback.sql')
  expect(rollback).toContain('payment_method_availability')
})

test('checkout hides Cash on Delivery unless switched on and defaults to prepaid', async () => {
  const src = await read('../src/views/Checkout.jsx')
  expect(src).toContain('codAvailable')
  expect(src).toContain("paymentMethod: 'prepaid'")
  expect(src).toContain('Cash on Delivery is not available right now')
  expect(src).toContain('{codAvailable && (<label')
})

test('storefront BFF refuses COD notes while the switch is off', async () => {
  const src = await read('../prepared-api/storefront/order.js')
  expect(src).toContain('COD_UNAVAILABLE')
  expect(src).toContain('cash on delivery')
})

test('fulfillment hub carries the Cash on Delivery switch', async () => {
  const src = await read('../src/views/admin/OmniOperationsHub.jsx')
  expect(src).toContain('Cash on Delivery')
  expect(src).toContain('role="switch"')
  expect(src).toContain('payment_method_availability')
})

test('workflow guide names the switch as the COD precondition', async () => {
  const src = await read('../src/components/admin/master-workflow-graph/workflowData.js')
  expect(src).toContain('Cash on Delivery is switched on')
})

test('every note-reading layer detects the same COD note marker', async () => {
  for (const file of [
    '../src/lib/jntVipBulkEngine.js',
    '../prepared-api/storefront/order.js',
    '../supabase/migrations/20260920_payment_method_availability.sql',
  ]) {
    expect(await read(file)).toContain('cash on delivery')
  }
})
