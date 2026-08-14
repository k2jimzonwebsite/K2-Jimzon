import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('overview never fabricates inventory metrics when product data is empty or unavailable', async () => {
  const source = await readFile(new URL('../src/views/admin/Overview.jsx', import.meta.url), 'utf8')

  expect(source).not.toContain('fallback-${index}')
  expect(source).not.toContain('data.products.length || skus')
  expect(source).toContain('const products = data.products')
})

test('failed consignment finalization remains visible and keeps reconciliation open', async () => {
  const manager = await readFile(new URL('../src/views/admin/ConsignmentManager.jsx', import.meta.url), 'utf8')
  const modal = await readFile(new URL('../src/views/admin/DiscrepancyReconciliationModal.jsx', import.meta.url), 'utf8')

  expect(manager).toContain('throw new Error(safeError)')
  expect(manager).toContain('return false')
  expect(modal).toContain("setFinalizeError(e?.message")
  expect(modal).toContain('if (finalized !== false) onClose()')
  expect(modal).toContain('role="alert"')
  expect(modal).not.toContain('alert("Error finalizing shipment stock sync')
})

test('customer directory excludes staff accounts and never fabricates identity links', async () => {
  const source = await readFile(new URL('../src/views/admin/Customers.jsx', import.meta.url), 'utf8')

  expect(source).toContain(".in('role', ['Customer', 'VIP'])")
  expect(source).toContain('adminBffEnabled()')
  expect(source).toContain('Guest and marketplace identities remain unavailable')
  expect(source).toContain('Similar names, email addresses, and phone numbers are never merged automatically')
  expect(source).not.toContain("select('*')")
  expect(source).not.toContain('fetchError.message')
})

test('globe CMS relies on the existing protected admin boundary', async () => {
  const source = await readFile(new URL('../src/views/admin/GlobeCms.jsx', import.meta.url), 'utf8')

  expect(source).not.toContain('function AdminSignIn')
  expect(source).not.toContain('authSession')
  expect(source).not.toContain('signInAdmin')
})

test('product sheet rolls back failed edits and routes new rows through protected intake', async () => {
  const source = await readFile(new URL('../src/views/admin/Sheet.jsx', import.meta.url), 'utf8')
  const addRow = source.match(/const handleAddRow[\s\S]*?const tableContainerRef/)?.[0] || ''

  expect(source).toContain('const previousValue = product[field]')
  expect(source).toContain('[field]: previousValue')
  expect(addRow).toContain('setShowPhoneIntake(true)')
  expect(addRow).not.toContain("supabase.from('products').insert")
  expect(addRow).not.toContain('setRows(prev => [newRow')
})

test('admin helpers never continue after inventory verification or save failure', async () => {
  const scanner = await readFile(new URL('../src/views/admin/ScanToAiModal.jsx', import.meta.url), 'utf8')
  const enrichment = await readFile(new URL('../src/views/admin/ProductAiEnrichmentModal.jsx', import.meta.url), 'utf8')
  const barcodeVerification = scanner.match(
    /const handleBarcodeDetected[\s\S]*?const handleManualSubmit/
  )?.[0] || ''

  expect(scanner).toContain(".maybeSingle()")
  expect(scanner).toContain('Inventory verification failed')
  expect(barcodeVerification).not.toContain('catch {}')
  expect(enrichment).toContain('Manual handoff only')
  expect(enrichment).not.toContain("supabase.from('products')")
  expect(enrichment).not.toContain('.update(')
})

test('coupon administration uses safe projections and reasoned mobile actions', async () => {
  const source = await readFile(new URL('../src/views/admin/CouponManager.jsx', import.meta.url), 'utf8')
  expect(source).toContain("const PROJECTION = 'id,code,description")
  expect(source).toContain('sm:hidden')
  expect(source).toContain('min-h-11')
  expect(source).toContain('Decision reason')
  expect(source).toContain('This becomes audit evidence in secure mode')
  expect(source).not.toContain("select('*')")
  expect(source).not.toContain('window.confirm')
  expect(source).not.toContain('createError.message')
})

test('lot editor separates physical, reserved, and sellable truth and blocks unsafe legacy saves', async () => {
  const source = await readFile(new URL('../src/views/admin/BatchExpiryManagerModal.jsx', import.meta.url), 'utf8')
  expect(source).toContain("['Physical', totals.physical]")
  expect(source).toContain("['Reserved', totals.reserved]")
  expect(source).toContain("['Sellable', totals.sellable]")
  expect(source).toContain('min={lot.reserved_quantity}')
  expect(source).toContain('secure Admin boundary is activated')
  expect(source).toContain('Record a specific reconciliation reason')
  expect(source).not.toContain("select('*')")
})
