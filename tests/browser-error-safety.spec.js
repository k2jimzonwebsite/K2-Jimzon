import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { safeErrorEvent } from '../src/lib/reportError.js'
import { providerErrorIncludes, safeUiError } from '../src/lib/safeUiError.js'

test('browser error telemetry emits only stable safe fields', () => {
  expect(safeErrorEvent({
    kind: 'react-boundary',
    componentStack: 'secret component path',
    token: 'must-not-survive',
  })).toEqual({ code: 'UI_SECTION_UNAVAILABLE', kind: 'react-boundary', pathname: '/' })
  expect(safeErrorEvent({ kind: 'unknown', message: 'database detail' })).toEqual({
    code: 'UI_SECTION_UNAVAILABLE', kind: 'browser-error', pathname: '/',
  })
})

test('global error UI and reporter do not expose raw browser diagnostics', async () => {
  const [reporter, boundary] = await Promise.all([
    readFile(new URL('../src/lib/reportError.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/ui/ErrorBoundary.jsx', import.meta.url), 'utf8'),
  ])
  expect(reporter).not.toContain("from('error_reports')")
  expect(reporter).not.toContain('window.location.href')
  expect(reporter).not.toContain('userAgent')
  expect(reporter).not.toContain('componentStack')
  expect(boundary).not.toContain('this.state.error.message')
  expect(boundary).toContain('UI_SECTION_UNAVAILABLE')
  expect(boundary).toContain('role="alert"')
})

test('visible operation errors use allowlisted recovery copy and stable codes', () => {
  expect(safeUiError('SHEET_SAVE_FAILED')).toBe(
    'The cell change was not saved and has been reverted. Refresh and try again. (SHEET_SAVE_FAILED)'
  )
  expect(safeUiError('provider detail that must not survive')).toBe(
    'The operation could not be completed. Refresh and try again. (UI_OPERATION_FAILED)'
  )
  const providerError = { message: 'K2_AAL2_REQUIRED private provider detail' }
  expect(providerErrorIncludes(providerError, 'K2_AAL2_REQUIRED')).toBe(true)
  expect(providerErrorIncludes(providerError, 'K2_ADMIN_REQUIRED')).toBe(false)
  expect(safeUiError(providerError.message)).not.toContain('private provider detail')
})

test('migrated operational surfaces do not render raw provider messages', async () => {
  const paths = [
    '../src/data/globeCms.jsx',
    '../src/views/admin/BulkCsvImportModal.jsx',
    '../src/views/admin/ChannelIntegrations.jsx',
    '../src/views/admin/InventoryGrid.jsx',
    '../src/views/admin/Overview.jsx',
    '../src/views/admin/PasabuyManager.jsx',
    '../src/views/admin/PurchaseOrders.jsx',
    '../src/views/admin/ScanToAiModal.jsx',
    '../src/views/admin/Sheet.jsx',
    '../src/views/admin/Suppliers.jsx',
    '../src/lib/connectorRuntime.js',
    '../src/components/nav/DemoRail.jsx',
    '../src/components/ui/ImageUploadDropzone.jsx',
    '../src/views/admin/ConsignmentScannerModal.jsx',
    '../src/views/admin/DiscrepancyReconciliationModal.jsx',
    '../src/views/admin/ProductIntakeSessionModal.jsx',
    '../src/views/admin/SmartPasteModal.jsx',
    '../src/views/admin/StaffPermissionManager.jsx',
    '../src/views/admin/DeleteProductsModal.jsx',
    '../src/views/admin/CouponManager.jsx',
    '../src/views/admin/OmniOperationsHub.jsx',
    '../src/views/admin/SystemDevOpsModal.jsx',
  ]
  const sources = await Promise.all(paths.map(path => readFile(new URL(path, import.meta.url), 'utf8')))
  for (const source of sources) {
    expect(source).not.toMatch(/\$\{(?:[a-z]+\.)*error\.message\}/i)
    expect(source).not.toMatch(/set(?:Error|OperationError|CmsError)\([^\n]*\.message/i)
    expect(source).not.toMatch(/alert\([^\n]*\.message/i)
  }
})

test('browser system readiness cannot read or render raw diagnostic rows', async () => {
  const source = await readFile(new URL('../src/views/admin/SystemDevOpsModal.jsx', import.meta.url), 'utf8')
  expect(source).not.toContain("from('error_reports')")
  expect(source).not.toContain('item.message')
  expect(source).not.toContain('item.url')
  expect(source).toContain('Diagnostic logging boundary')
  expect(source).toContain("safeUiError('ADMIN_HEALTH_FAILED')")
})
