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

  expect(manager).toContain('throw finalError')
  expect(manager).toContain('return false')
  expect(modal).toContain("setFinalizeError(e?.message")
  expect(modal).toContain('if (finalized !== false) onClose()')
  expect(modal).toContain('role="alert"')
  expect(modal).not.toContain('alert("Error finalizing shipment stock sync')
})

test('customer directory excludes staff accounts and exposes query failures', async () => {
  const source = await readFile(new URL('../src/views/admin/Customers.jsx', import.meta.url), 'utf8')

  expect(source).toContain(".in('role', ['Customer', 'VIP'])")
  expect(source).toContain('Could not load customer profiles')
  expect(source).toContain('role="alert"')
})

test('globe CMS relies on the existing protected admin boundary', async () => {
  const source = await readFile(new URL('../src/views/admin/GlobeCms.jsx', import.meta.url), 'utf8')

  expect(source).not.toContain('function AdminSignIn')
  expect(source).not.toContain('authSession')
  expect(source).not.toContain('signInAdmin')
})

test('product sheet rolls back failed optimistic edits and does not create phantom rows', async () => {
  const source = await readFile(new URL('../src/views/admin/Sheet.jsx', import.meta.url), 'utf8')
  const addRow = source.match(/const handleAddRow[\s\S]*?const tableContainerRef/)?.[0] || ''

  expect(source).toContain('const previousValue = product[field]')
  expect(source).toContain('[field]: previousValue')
  expect(addRow).toContain('Could not create ${newSku}')
  expect(addRow.indexOf("await supabase.from('products').insert([newRow])")).toBeLessThan(addRow.indexOf('setRows(prev => [newRow, ...prev])'))
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
  expect(enrichment).toContain('Could not save the reviewed product details')
  expect(enrichment).toContain('if (error)')
})
