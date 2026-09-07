import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('overview periods use Manila midnight across UTC day and year boundaries', async () => {
  const { overviewDateKey, overviewPeriodStart } = await import('../src/lib/overviewPeriod.js')
  const now = new Date('2026-12-31T16:05:00Z')
  expect(overviewDateKey(now)).toBe('2027-01-01')
  expect(overviewDateKey('2026-12-31T15:59:59Z')).toBe('2026-12-31')
  expect(overviewPeriodStart(7, 0, now).toISOString()).toBe('2026-12-25T16:00:00.000Z')
  expect(overviewPeriodStart(7, 1, now).toISOString()).toBe('2026-12-18T16:00:00.000Z')
})

test('overview completeness rejects capped result sets instead of reporting their subtotal as a total', async () => {
  const { overviewUnavailable } = await import('../src/lib/overviewAvailability.js')
  expect(overviewUnavailable([{ data: [{ id: 1, total_amount: 25 }], count: 2 }], ['orders'])).toEqual([{ key: 'orders', code: 'RESULT_INCOMPLETE' }])
  expect(overviewUnavailable([{ data: [], count: 0 }], ['orders'])).toEqual([])
  expect(overviewUnavailable([{ data: null, count: 4 }], ['orderBacklog'])).toEqual([])
  expect(overviewUnavailable([{ error: { message: 'fixture' } }], ['orders'])).toEqual([{ key: 'orders', code: 'QUERY_UNAVAILABLE' }])
  for (const data of [undefined, null, {}, [null], ['invalid']]) {
    expect(overviewUnavailable([{ data }], ['orders'])).toEqual([{ key: 'orders', code: 'RESULT_INVALID' }])
  }
  for (const count of [undefined, null, -1, 1.5, '4']) {
    expect(overviewUnavailable([{ data: null, count }], ['orderBacklog'])).toEqual([{ key: 'orderBacklog', code: 'RESULT_INVALID' }])
  }
  for (const value of [null, undefined, '', true, 'invalid', -1]) {
    expect(overviewUnavailable([{ data: [{ stock_available: value }] }], ['products'])).toEqual([{ key: 'products', code: 'RESULT_INVALID' }])
    expect(overviewUnavailable([{ data: [{ total_amount: value }] }], ['orders'])).toEqual([{ key: 'orders', code: 'RESULT_INVALID' }])
  }
  expect(overviewUnavailable([{ data: [{ stock_available: 0 }] }], ['products'])).toEqual([])
})

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
  expect(modal).toContain("safeUiError('RECEIPT_FINALIZE_FAILED')")
  expect(modal).not.toContain('.message')
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

test('Smart Paste remains review-only after secure Admin cutover', async () => {
  const source = await readFile(new URL('../src/views/admin/SmartPasteModal.jsx', import.meta.url), 'utf8')
  const save = source.match(/const handleSave[\s\S]*?return \(/)?.[0] || ''

  expect(source).toContain('adminBffEnabled()')
  expect(save).toContain('if (secure)')
  expect(save.indexOf('if (secure)')).toBeLessThan(save.indexOf("supabase.from('products')"))
  expect(source).toContain('use phone-first intake for the server-created, attributable Draft')
})

test('shared Admin navigation reuses authorized projections in secure mode', async () => {
  const palette = await readFile(new URL('../src/views/admin/CommandPalette.jsx', import.meta.url), 'utf8')
  const admin = await readFile(new URL('../src/views/admin/Admin.jsx', import.meta.url), 'utf8')
  const store = await readFile(new URL('../src/context/AdminStoreContext.jsx', import.meta.url), 'utf8')
  expect(palette).not.toContain("from('user_profiles')")
  expect(palette).not.toContain("from('products')")
  expect(palette).toContain('already-authorized bounded product projection')
  expect(palette).not.toContain("type: 'Customer'")
  expect(admin).toContain('if (secure)')
  expect(admin).toContain('getAdminOverview(30, controller.signal)')
  expect(admin).toContain("entry.key === 'orderBacklog'")
  expect(admin).toContain('setPendingOrders(result.ok && !backlogUnavailable')
  expect(admin).not.toContain('setPendingOrders(0)')
  expect(admin).toContain('controller.abort()')
  expect(store).toContain("document.visibilityState === 'visible'")
  expect(store).toContain('const secureAdmin = adminBffEnabled()')
  expect(store).toContain('if (!auth.isAdmin || (!secureAdmin && !supabase))')
  expect(store).not.toContain('if (!supabase || !auth.isAdmin)')
})

test('purchase-order workspace uses the fixed procurement projection in secure mode', async () => {
  const source = await readFile(new URL('../src/views/admin/PurchaseOrders.jsx', import.meta.url), 'utf8')

  expect(source).toContain('adminBffEnabled()')
  expect(source).toContain('getAdminProcurementBff(signal)')
  expect(source).toContain('response.procurement?.purchaseOrders || []')
  expect(source).toContain('if (secure)')
  expect(source).toContain('controller.abort()')
})

test('inventory product editing routes every photo assignment through the dedicated media workflow', async () => {
  const source = await readFile(new URL('../src/views/admin/InventoryGrid.jsx', import.meta.url), 'utf8')
  const payload = source.match(/const buildPayload[\s\S]*?const handleSave/)?.[0] || ''

  expect(source).toContain("import PhotoManagerModal from './PhotoManagerModal'")
  expect(source).toContain('<PhotoManagerModal')
  expect(source).not.toContain('ImageUploadDropzone')
  expect(payload).not.toContain('primary_image_url')
  expect(payload).not.toContain('lifestyle_images')
  expect(payload).not.toContain('secondary_images')
  expect(source).toContain('getAdminProducts()')
  expect(source).toContain("document.visibilityState === 'visible'")
  expect(source).toContain('if (secure)')
  expect(source).toContain('Use phone-first intake to create an attributable product Draft.')
  expect(source).toContain("commandAdminProductMasterBff('update'")
  expect(source).toContain("commandAdminProductMasterBff('status'")
  expect(source).toContain("value: 'Under Review'")
  expect(source).toContain("value: 'Discontinued'")
  expect(source).toContain('reasoned status action')
  expect(source).toContain('<ProductIntakeSessionModal')
})

test('permanent product deletion uses the signed secure command before the legacy flag-off path', async () => {
  const source = await readFile(new URL('../src/views/admin/DeleteProductsModal.jsx', import.meta.url), 'utf8')
  const submit = source.match(/const handleDelete[\s\S]*?const blocked/)?.[0] || ''

  expect(source).toContain('getAdminStaffAccessBff()')
  expect(source).toContain("commandAdminProductMasterBff('delete'")
  expect(submit).toContain('if (secure)')
  expect(submit.indexOf('if (secure)')).toBeLessThan(submit.indexOf("supabase.rpc('delete_products_with_pin_v2'"))
  expect(source).toContain('Nothing was removed')
})

test('admin helpers never continue after inventory verification or save failure', async () => {
  const scanner = await readFile(new URL('../src/views/admin/ScanToAiModal.jsx', import.meta.url), 'utf8')
  const enrichment = await readFile(new URL('../src/views/admin/ProductAiEnrichmentModal.jsx', import.meta.url), 'utf8')
  const barcodeVerification = scanner.match(
    /const handleBarcodeDetected[\s\S]*?const handleManualSubmit/
  )?.[0] || ''

  expect(scanner).toContain('searchIdentityDuplicates(code)')
  expect(scanner).not.toContain("supabase.from('products')")
  expect(scanner).toContain("safeUiError('INVENTORY_VERIFY_FAILED')")
  expect(scanner).not.toContain('error.message')
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
