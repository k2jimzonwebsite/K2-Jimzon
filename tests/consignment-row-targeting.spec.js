import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  scanRefusalReason,
  selectManifestItem,
} from '../src/views/admin/consignmentScanTarget.js'

/**
 * MAP-028 H-017. Two boxes of the same product are two different physical lots.
 * A row action that carries only the SKU lands on whichever line happens to be
 * first and incomplete, so clicking the second box can increment the first.
 */

const boxA = {
  id: 'item-a', sku: 'SKU-OLIVE', box_code: 'BOX-A', batch_code: 'LOT-1',
  best_before_date: '2027-01-31', expected_qty: 2, italy_packed_qty: 0, manila_scanned_qty: 0,
}
const boxB = {
  id: 'item-b', sku: 'SKU-OLIVE', box_code: 'BOX-B', batch_code: 'LOT-2',
  best_before_date: '2027-06-30', expected_qty: 2, italy_packed_qty: 0, manila_scanned_qty: 0,
}
const items = [boxA, boxB]

test('an exact item id addresses that lot, not the first matching SKU', () => {
  expect(selectManifestItem({ items, code: 'SKU-OLIVE', stage: 'milan', selectedItemId: 'item-b' }).id).toBe('item-b')
  expect(selectManifestItem({ items, code: 'SKU-OLIVE', stage: 'milan', selectedItemId: 'item-a' }).id).toBe('item-a')
})

test('this is the defect: without an id, both boxes resolve to the same line', () => {
  const first = selectManifestItem({ items, code: 'SKU-OLIVE', stage: 'milan' })
  const second = selectManifestItem({ items, code: 'SKU-OLIVE', stage: 'milan' })
  expect(first.id).toBe(second.id)
  expect(first.id).toBe('item-a')
})

test('a scanned barcode still resolves through the product to its SKU lines', () => {
  const products = [{ sku: 'SKU-OLIVE', barcode: '8001234567890' }]
  const found = selectManifestItem({ items, code: '8001234567890', products, stage: 'milan', selectedItemId: 'item-b' })
  expect(found.id).toBe('item-b')
})

test('an unknown code selects nothing rather than guessing a line', () => {
  expect(selectManifestItem({ items, code: 'SKU-OTHER', stage: 'milan' })).toBeNull()
  expect(selectManifestItem({ items, code: '', stage: 'milan' })).toBeNull()
  expect(selectManifestItem({ items, code: 'SKU-OLIVE', stage: 'milan', selectedItemId: 'item-missing' })).toBeNull()
})

test('a full Milan line is refused by name instead of silently moving to another box', () => {
  const packed = { ...boxA, italy_packed_qty: 2 }
  const reason = scanRefusalReason(packed, 'milan')
  expect(reason).toMatch(/BOX-A/)
  expect(reason).toMatch(/expected quantity/i)
  expect(scanRefusalReason(boxA, 'milan')).toBe('')
})

test('Manila receiving cannot exceed what Milan actually packed', () => {
  const received = { ...boxB, italy_packed_qty: 1, manila_scanned_qty: 1 }
  const reason = scanRefusalReason(received, 'manila')
  expect(reason).toMatch(/BOX-B/)
  expect(reason).toMatch(/packed in Milan/i)
  expect(scanRefusalReason({ ...boxB, italy_packed_qty: 2, manila_scanned_qty: 1 }, 'manila')).toBe('')
})

test('a stale row cannot act on quantities that have already changed', () => {
  // The row was rendered when nothing was packed; the server has since filled it.
  const stale = { ...boxA, italy_packed_qty: 0 }
  const current = { ...boxA, italy_packed_qty: 2 }
  expect(scanRefusalReason(stale, 'milan')).toBe('')
  expect(scanRefusalReason(current, 'milan')).not.toBe('')
})

test('every manifest row action carries its exact item id', async () => {
  const source = await readFile(new URL('../src/views/admin/ConsignmentManager.jsx', import.meta.url), 'utf8')

  expect(source).toContain('selectManifestItem')
  expect(source).toContain('scanRefusalReason')
  // The SKU-only call is what let one row increment another.
  expect(source).not.toContain("scan(item.sku, 'milan')")
  expect(source).not.toContain("scan(item.sku, 'manila')")
  expect(source).toContain("scan(item.sku, 'milan', item.id)")
  expect(source).toContain("scan(item.sku, 'manila', item.id)")
  // The box code identifies the lot, so it has to be visible where staff act.
  expect(source).toContain('item.box_code')
})

test('the manifest component still compiles — a string contract cannot prove that', async () => {
  // A source assertion happily passes over a JSX syntax error, so the component
  // is transformed here the way the build transforms it.
  const { transformSync } = await import('esbuild')
  const source = await readFile(new URL('../src/views/admin/ConsignmentManager.jsx', import.meta.url), 'utf8')
  expect(() => transformSync(source, { loader: 'jsx', jsx: 'automatic' })).not.toThrow()
})
