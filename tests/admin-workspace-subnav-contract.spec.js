import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8')

test('AdminWorkspaceUi exports a shared WorkspaceTabs sub-nav', async () => {
  const src = await read('../src/views/admin/AdminWorkspaceUi.jsx')
  expect(src).toContain('WorkspaceTabs')
  expect(src).toContain('role="tablist"')
  expect(src).toContain('aria-selected')
  expect(src).toContain('min-h-11')
})

test('customer workspace splits directory and wholesale into sub-categories', async () => {
  const src = await read('../src/views/admin/Customers.jsx')
  expect(src).toContain('<WorkspaceTabs')
  expect(src).toContain('Wholesale inquiries')
  expect(src).toContain("customerTab === 'wholesale'")
  expect(src).toContain("customerTab === 'directory'")
})

test('customer workspace keeps banners and review dialog outside the tab panels', async () => {
  const src = await read('../src/views/admin/Customers.jsx')
  expect(src).toContain('<WholesaleReviewDialog')
  expect(src).toContain('<MetricRail')
})

test('staff workspace splits people, security, and spending into sub-categories', async () => {
  const src = await read('../src/views/admin/StaffPermissionManager.jsx')
  expect(src).toContain('<WorkspaceTabs')
  expect(src).toContain("staffTab === 'people'")
  expect(src).toContain("staffTab === 'security'")
  expect(src).toContain("staffTab === 'spending'")
})

test('staff workspace keeps alerts and dialogs outside the tab panels', async () => {
  const src = await read('../src/views/admin/StaffPermissionManager.jsx')
  expect(src).toContain('role="alert"')
  expect(src).toContain('<RoleChangeDialog')
  expect(src).toContain('<MfaReplacementDialog')
})

test('supplier workspace splits directory and purchase orders into sub-categories', async () => {
  const src = await read('../src/views/admin/Suppliers.jsx')
  expect(src).toContain('<WorkspaceTabs')
  expect(src).toContain("supplierTab === 'directory'")
  expect(src).toContain("supplierTab === 'orders'")
})

test('supplier workspace keeps banners and the add dialog outside the tab panels', async () => {
  const src = await read('../src/views/admin/Suppliers.jsx')
  expect(src).toContain('role={error ? \'alert\' : \'status\'}')
  expect(src).toContain('<SupplierDialog')
})

test('command palette reaches every admin section with role gating intact', async () => {
  const src = await read('../src/views/admin/CommandPalette.jsx')
  for (const id of ['consignment', 'reservations', 'coupons', 'store_assets', 'globe', 'workflow_graph', 'owner_close', 'delivery', 'staff_permissions']) {
    expect(src).toContain(`setSection('${id}')`)
  }
  expect(src).toContain('adminOnly')
  expect(src).toContain('canManageStaff')
})

test('admin shell passes the staff role into the palette', async () => {
  const src = await read('../src/views/admin/Admin.jsx')
  expect(src).toContain('canManageStaff={canManageStaff}')
})
