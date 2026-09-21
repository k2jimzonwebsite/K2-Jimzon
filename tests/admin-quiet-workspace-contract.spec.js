import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('AdminWorkspaceUi exports a shared DetailBlock disclosure', async () => {
  const src = await read('../src/views/admin/AdminWorkspaceUi.jsx')
  expect(src).toContain('DetailBlock')
  expect(src).toContain('aria-expanded')
  expect(src).toContain('min-h-11')
})

test('DetailBlock starts closed and toggles instantly', async () => {
  const src = await read('../src/views/admin/AdminWorkspaceUi.jsx')
  expect(src).toContain('defaultOpen = false')
  expect(src).toContain('useState')
})

test('inventory edit modal hides secondary sections behind DetailBlock', async () => {
  const src = await read('../src/views/admin/InventoryGrid.jsx')
  expect(src).toContain('<DetailBlock')
  expect(src).toContain('title="Product description"')
  expect(src).toContain('title="Website settings"')
  expect(src).toContain('title="Status & staff notes"')
})

test('inventory edit modal keeps primary sections immediately visible', async () => {
  const src = await read('../src/views/admin/InventoryGrid.jsx')
  expect(src).toContain('<Section color="blue" title="Product basics"')
  expect(src).toContain('<Section color="forest" title="Pricing"')
  expect(src).toContain('<Section color="crimson" title="Inventory"')
})

test('scan center uses plain words instead of guarded workflow', async () => {
  const src = await read('../src/views/admin/UniversalScanLauncher.jsx')
  expect(src).not.toContain('guarded workflow')
})

test('Milan header drops POV jargon and ultra-fast marketing', async () => {
  const src = await read('../src/views/admin/MilanPackingScannerModal.jsx')
  expect(src).not.toContain('Packing POV')
  expect(src).not.toContain('ultra-fast')
})

test('J&T dispatch drops booking-assistant marketing and Bulk Batch redundancy', async () => {
  const src = await read('../src/views/admin/JntVipDispatchModal.jsx')
  expect(src).not.toContain('1-tap booking assistant')
  expect(src).not.toContain('Bulk Batch')
})

test('Manila finish drops Discrepancies jargon', async () => {
  const src = await read('../src/views/admin/MobileScannerModal.jsx')
  expect(src).not.toContain('Discrepancies')
})

test('discrepancy rows never invent a product-name fallback', async () => {
  const src = await read('../src/views/admin/DiscrepancyReconciliationModal.jsx')
  expect(src).not.toContain('Authentic Italian Product')
})

test('sheet toolbar uses family icons instead of raw glyphs', async () => {
  const src = await read('../src/views/admin/Sheet.jsx')
  expect(src).not.toContain('✨')
  expect(src).not.toContain('⌂')
  expect(src).toContain('<SparkleIcon')
  expect(src).toContain('<BarcodeIcon')
})

test('start-here guide carries no raw emoji and meets the touch floor', async () => {
  const src = await read('../src/views/admin/StartHereGuide.jsx')
  expect(src).not.toContain('🗺️')
  expect(src).not.toContain('📋')
  expect(src).not.toContain('h-9 w-9')
  expect(src).not.toContain('py-1 text-xs font-bold')
  expect(src).not.toContain('py-1 text-xs font-medium')
  expect(src).not.toContain('cyan')
  expect(src).toContain('min-h-[44px] min-w-[44px]')
})

test('overview money controls meet the touch floor and speak one accent', async () => {
  const src = await read('../src/views/admin/Overview.jsx')
  expect(src).not.toContain('min-h-9')
  expect(src).not.toContain('emerald')
})

test('hold extension chips meet the touch floor', async () => {
  const src = await read('../src/views/admin/ReservationHolds.jsx')
  expect(src).not.toContain('min-h-9')
})

test('help panel floats above the phone tab bar', async () => {
  const src = await read('../src/views/admin/HelpTip.jsx')
  expect(src).toContain('z-50')
  expect(src).toContain('safe-area-inset-bottom')
})

test('help tooltip opens into the workspace without a doubled native title', async () => {
  const src = await read('../src/views/admin/HelpTip.jsx')
  // Left-aligned so a trigger near the sidebar never clips; the native title
  // is gone so the browser cannot render a second overlapping tooltip.
  expect(src).toContain('sm:left-0')
  expect(src).not.toContain('sm:right-0')
  expect(src).not.toMatch(/title=\{/)
})

test('workspace sub-nav signals off-screen tabs', async () => {
  const src = await read('../src/views/admin/AdminWorkspaceUi.jsx')
  expect(src).toContain('mask-image')
})

test('sheet-mode switch keeps its look with a full-size touch target', async () => {
  const src = await read('../src/views/admin/Admin.jsx')
  expect(src).toContain('aria-label="Sheet mode"')
  expect(src).toContain('min-h-11 min-w-11 items-center justify-center')
})

test('sub-tab counts stay honest while loading', async () => {
  for (const file of ['../src/views/admin/Customers.jsx', '../src/views/admin/Suppliers.jsx', '../src/views/admin/StaffPermissionManager.jsx']) {
    expect(await read(file)).toContain("'…'")
  }
})

test('staff-facing status messages use plain words', async () => {
  const files = [
    '../src/views/admin/Suppliers.jsx',
    '../src/views/admin/Inbox.jsx',
    '../src/views/admin/GlobeCms.jsx',
    '../src/views/admin/SystemDevOpsModal.jsx',
    '../src/views/admin/StaffPermissionManager.jsx',
  ]
  const text = (await Promise.all(files.map(read))).join('\n')
  for (const jargon of [
    'attributable reason',
    'persisted conversations',
    'immutable event history',
    'canonical register',
    'bounded Admin route',
    'diagnostic payloads',
    'durable reason-bound receipt',
  ]) expect(text).not.toContain(jargon)
})

test('workflow entry points use one plain name', async () => {
  const files = [
    '../src/views/admin/Admin.jsx',
    '../src/views/admin/CommandPalette.jsx',
    '../src/views/admin/StartHereGuide.jsx',
    '../src/views/admin/adminGuide.js',
  ]
  const text = (await Promise.all(files.map(read))).join('\n')
  expect(text).not.toContain('Workflow Graph')
  expect(text).not.toContain('Master Workflow Graph')
  expect(text).not.toContain('SVG Map')
  expect(text).toContain('Workflow map')
})
