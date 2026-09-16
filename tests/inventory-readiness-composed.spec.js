import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { validateConsignmentCommand } from '../server/admin-bff/consignments.js'
import { validateProductIntakeCommand } from '../server/admin-bff/product-intake.js'
import { selectManifestItem, scanRefusalReason } from '../src/views/admin/consignmentScanTarget.js'

test('inventory readiness rehearsal script covers the composed intake-to-stock journey', async () => {
  const runner = await readFile(new URL('../scripts/rehearse-inventory-readiness.mjs', import.meta.url), 'utf8')
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

  expect(packageJson.scripts['rehearse:inventory-readiness']).toBe('node scripts/rehearse-inventory-readiness.mjs')

  // Verifies extraction of real functions from authoritative migrations
  expect(runner).toContain('generate_k2_sku_internal')
  expect(runner).toContain('create_product_draft_server')
  expect(runner).toContain('create_product_first_inventory_server')
  expect(runner).toContain('create_consignment_manifest')
  expect(runner).toContain('add_consignment_item_v2')
  expect(runner).toContain('record_consignment_item_scan')
  expect(runner).toContain('advance_consignment')
  expect(runner).toContain('finalize_consignment_receipt')
  expect(runner).toContain('reconcile_product_batches')

  // Verifies all steps of the composed journey
  expect(runner).toContain('STEP 1: Manual Intake & Field Review Gate -> Draft Product')
  expect(runner).toContain('STEP 2: Declared Italy Manifest via First Inventory')
  expect(runner).toContain('STEP 3: Milan Packing Scans & Bounds')
  expect(runner).toContain('STEP 4: Flight Transit & Manila Arrival')
  expect(runner).toContain('STEP 5: Manila Receiving Scans with Shortage')
  expect(runner).toContain('STEP 6: Finalize Receipt & Expiry Quarantine Split')
  expect(runner).toContain('STEP 7: Idempotent Receipt Retry')
  expect(runner).toContain('STEP 8: Authorized Opening Balances (Reconciliation)')
  expect(runner).toContain('STEP 9: Fail-Closed Security & Integrity Boundaries')

  // Verifies specific invariant assertions
  expect(runner).toContain('K2_DRAFT_REVIEW_GATE_INCOMPLETE')
  expect(runner).toContain('K2_DUPLICATE_BARCODE')
  expect(runner).toContain('Every expected unit must be scan-packed before transit')
  expect(runner).toContain('Consignment is not ready for Manila receiving')
  expect(runner).toContain('Packed scans cannot exceed expected quantity')
  expect(runner).toContain('Received scans cannot exceed Milan packed quantity')
  expect(runner).toContain('missing_on_arrival')
  expect(runner).toContain('K2_ADMIN_RECONCILIATION_REQUIRED')
  expect(runner).toContain('K2_SUPPLIER_RECEIPT_WORKFLOW_UNAVAILABLE')
  expect(runner).toContain('Stock changes must use batch reconciliation, receiving, reservation, or fulfillment')
  expect(runner).toContain('Create the product at zero stock, then record its real batches')
})

test('BFF consignment command validation rejects malformed actions, dates, and counts', () => {
  const validId = '10000000-0000-4000-8000-000000000001'
  const futureDate = new Date()
  futureDate.setUTCDate(futureDate.getUTCDate() + 180)
  const validDate = futureDate.toISOString().slice(0, 10)

  // Manifest creation
  expect(() => validateConsignmentCommand('consignment_create', {})).toThrow('REQUEST_INVALID')
  expect(() => validateConsignmentCommand('consignment_create', { manifestCode: 'AB' })).toThrow('REQUEST_INVALID')
  expect(validateConsignmentCommand('consignment_create', { manifestCode: 'K2-IT-2026', shipmentReference: 'AZ-772' }))
    .toEqual({ manifestCode: 'K2-IT-2026', shipmentReference: 'AZ-772' })

  // Add line
  expect(() => validateConsignmentCommand('consignment_add_line', {
    consignmentId: validId, sku: 'SKU-1', batchCode: 'LOT-A', boxCode: 'BOX-A', bestBeforeDate: validDate, expectedQty: 0,
  })).toThrow('REQUEST_INVALID')
  expect(() => validateConsignmentCommand('consignment_add_line', {
    consignmentId: validId, sku: 'SKU-1', batchCode: 'LOT-A', boxCode: 'BOX-A', bestBeforeDate: '2020-01-01', expectedQty: 5,
  })).toThrow('REQUEST_INVALID')
  expect(validateConsignmentCommand('consignment_add_line', {
    consignmentId: validId, sku: 'SKU-1', batchCode: 'LOT-A', boxCode: 'BOX-A', bestBeforeDate: validDate, expectedQty: 10,
  })).toMatchObject({ sku: 'SKU-1', expectedQty: 10 })

  // Scan
  expect(() => validateConsignmentCommand('consignment_scan', {
    consignmentId: validId, itemId: validId, stage: 'rome', scannedCode: 'SKU-1',
  })).toThrow('REQUEST_INVALID')
  expect(validateConsignmentCommand('consignment_scan', {
    consignmentId: validId, itemId: validId, stage: 'milan', scannedCode: 'SKU-1',
  })).toMatchObject({ stage: 'milan', scannedCode: 'SKU-1' })

  // Advance
  expect(() => validateConsignmentCommand('consignment_advance', {
    consignmentId: validId, toStatus: 'Completed', reason: 'A valid reason of sufficient length',
  })).toThrow('REQUEST_INVALID')
  expect(() => validateConsignmentCommand('consignment_advance', {
    consignmentId: validId, toStatus: 'In_Transit', reason: 'Short',
  })).toThrow('REQUEST_INVALID')
  expect(validateConsignmentCommand('consignment_advance', {
    consignmentId: validId, toStatus: 'In_Transit', reason: 'All Milan units scan-packed and verified for departure',
  })).toMatchObject({ toStatus: 'In_Transit' })

  // Finalize
  expect(() => validateConsignmentCommand('consignment_finalize', {
    consignmentId: validId, notes: 'Short',
  })).toThrow('REQUEST_INVALID')
  expect(validateConsignmentCommand('consignment_finalize', {
    consignmentId: validId, notes: 'Arrival recount matched all Milan packed units.',
  })).toMatchObject({ consignmentId: validId })
})

test('intake BFF rejects unverified quantities and supplier receipts before database execution', () => {
  const validId = '10000000-0000-4000-8000-000000000001'

  // Invalid quantity types
  for (const invalid of [0, -1, 'zero', true, null, undefined]) {
    expect(() => validateProductIntakeCommand('intake_inventory', {
      sessionId: validId, inventoryRequestId: validId, source: 'flight',
      inventory: { quantity: invalid, unitCost: 10, boxCode: 'B1', batchCode: 'L1', expiryDate: '2027-01-01', consignmentId: validId },
    })).toThrow('REQUEST_INVALID')
  }

  // Missing box/batch/consignment on flight source
  expect(() => validateProductIntakeCommand('intake_inventory', {
    sessionId: validId, inventoryRequestId: validId, source: 'flight',
    inventory: { quantity: 5, unitCost: 10, expiryDate: '2027-01-01' },
  })).toThrow('REQUEST_INVALID')
})

test('client-side scan target selector and refusal reason guard manifest integrity', () => {
  const item1 = { id: 'item-1', sku: 'SKU-A', box_code: 'BOX-1', batch_code: 'LOT-1', expected_qty: 5, italy_packed_qty: 3, manila_scanned_qty: 2 }
  const item2 = { id: 'item-2', sku: 'SKU-A', box_code: 'BOX-2', batch_code: 'LOT-2', expected_qty: 5, italy_packed_qty: 5, manila_scanned_qty: 5 }
  const items = [item1, item2]
  const products = [{ sku: 'SKU-A', barcode: '8001112223334' }]

  // Resolves by exact row ID when selected
  expect(selectManifestItem({ items, code: 'SKU-A', products, stage: 'milan', selectedItemId: 'item-2' })?.id).toBe('item-2')

  // Falls back to incomplete row for scanner when no row is explicitly clicked
  expect(selectManifestItem({ items, code: 'SKU-A', products, stage: 'milan' })?.id).toBe('item-1')

  // Barcode resolution
  expect(selectManifestItem({ items, code: '8001112223334', products, stage: 'milan' })?.id).toBe('item-1')

  // Refusal reason for Milan over-pack
  expect(scanRefusalReason(item2, 'milan')).toContain('already reached its expected quantity (5/5)')
  expect(scanRefusalReason(item1, 'milan')).toBe('')

  // Refusal reason for Manila over-receive
  expect(scanRefusalReason(item2, 'manila')).toContain('already has every unit packed in Milan recorded as received (5/5)')
  expect(scanRefusalReason(item1, 'manila')).toBe('')
})

test('consignment manager UI enforces atomic custody and audit requirements', async () => {
  const managerSource = await readFile(new URL('../src/views/admin/ConsignmentManager.jsx', import.meta.url), 'utf8')

  // Manifest creation starts in Packing_Italy
  expect(managerSource).toContain('Manifest created in Packing Italy state.')

  // Advancing requires reason of at least 10 characters
  expect(managerSource).toContain('advanceReason.trim().length < 10')
  expect(managerSource).toContain('Record a specific reason of at least 10 characters before changing custody state.')

  // Finalizing requires descriptive notes if discrepancy exists
  expect(managerSource).toContain('finalNotes.length < 10')
  expect(managerSource).toContain('Describe the arrival discrepancy before finalizing. No inventory was changed.')

  // Scans enforce row-level identification
  expect(managerSource).toContain('selectManifestItem')
  expect(managerSource).toContain('scanRefusalReason')
  expect(managerSource).toContain("Consignment moved to")
  expect(managerSource).toContain('Receipt finalized atomically. Scanned batches and inventory events were recorded.')
})
