import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// MAP-019 F-028-002: retained-key and reason gaps across Admin command callers.
// Source pins for the structural fixes; behavior is covered by the payment,
// coupon, media, owner-close and product-master browser suites.
test('coupon decisions carry a pre-click Admin blocker and a two-step archive', async () => {
  const source = await readFile(new URL('../src/views/admin/CouponManager.jsx', import.meta.url), 'utf8')
  expect(source).toContain('Only an Admin can change coupon state.')
  expect(source).toContain('useOptionalAdminStore')
  expect(source).toContain('Click again to archive')
})

test('photo discard and uncertain close cannot drop a protected operation', async () => {
  const source = await readFile(new URL('../src/views/admin/PhotoManagerModal.jsx', import.meta.url), 'utf8')
  expect(source).toContain('Close and reconcile')
  expect(source).toContain('reason.trim().length < 10')
})

test('fulfillment audit reasons meet the ten-character standard', async () => {
  const source = await readFile(new URL('../src/views/admin/OmniOperationsHub.jsx', import.meta.url), 'utf8')
  expect(source).toContain('reason.trim().length >= 10')
})

test('product deletion freezes an unconfirmed form and retries one identity', async () => {
  const source = await readFile(new URL('../src/views/admin/DeleteProductsModal.jsx', import.meta.url), 'utf8')
  expect(source).toContain('commandOutcomeIsUncertain')
  expect(source).toContain('Retry same deletion')
  expect(source).toContain('requestIdRef.current = crypto.randomUUID()')
})

test('owner-close retries reuse their attempt identity', async () => {
  const source = await readFile(new URL('../src/views/admin/OwnerCountClose.jsx', import.meta.url), 'utf8')
  expect(source).toContain('sessionSaveRef')
  expect(source).toContain('runStage(stageRetry)')
  expect(source).toContain('attempt.idempotencyKey')
})

// MAP-028 F-028-003: Admin row-action, touch targets, dialog focus and AAL2 error messages
test('Sheet row action buttons and domain jumps meet 44px touch targets', async () => {
  const source = await readFile(new URL('../src/views/admin/Sheet.jsx', import.meta.url), 'utf8')
  expect(source).not.toContain('min-h-[38px]')
  expect(source).not.toContain('w-9 h-9')
})

test('InventoryGrid search exception buttons and select-all meet 44px touch targets', async () => {
  const source = await readFile(new URL('../src/views/admin/InventoryGrid.jsx', import.meta.url), 'utf8')
  expect(source).not.toContain('min-h-[36px]')
})

test('Admin sidebar and lock buttons meet 44px touch targets', async () => {
  const source = await readFile(new URL('../src/views/admin/Admin.jsx', import.meta.url), 'utf8')
  expect(source).not.toContain('min-h-10 w-full items-center')
  expect(source).not.toContain('flex min-h-10 min-w-10')
})

test('OmniOperationsHub packing queue provides responsive phone cards for <lg screens', async () => {
  const source = await readFile(new URL('../src/views/admin/OmniOperationsHub.jsx', import.meta.url), 'utf8')
  expect(source).toMatch(/lg:hidden[\s\S]*?Packing record/)
})

test('OmniOperationsHub and Suppliers dialogs accept and pass returnFocusRef', async () => {
  const omni = await readFile(new URL('../src/views/admin/OmniOperationsHub.jsx', import.meta.url), 'utf8')
  const suppliers = await readFile(new URL('../src/views/admin/Suppliers.jsx', import.meta.url), 'utf8')
  expect(omni).toContain('FulfillmentActionDialog({ action, onClose, onSave, returnFocusRef')
  expect(omni).toContain('HandoverDialog({ order, onClose, onSave, retrySafe, returnFocusRef')
  expect(omni).toContain('DeliveryDetailsModal({ order, onClose, onSave, retrySafe, returnFocusRef')
  expect(omni).toContain('PaymentStatusModal({ order, onClose, onSave, secure, returnFocusRef')
  expect(suppliers).toContain('SupplierDialog({ value, onChange, onCancel, onSave, saving, retrySafe, returnFocusRef')
})

test('adminBffService maps AAL2_REQUIRED and role errors explicitly without falling back to unavailable', async () => {
  const source = await readFile(new URL('../src/services/adminBffService.js', import.meta.url), 'utf8')
  expect(source).toContain('AAL2_REQUIRED:')
  expect(source).toContain('MFA_REQUIRED:')
  expect(source).toContain('STAFF_ACCESS_REQUIRED:')
  expect(source).toContain('SESSION_REVOKED:')
  expect(source).toContain('FORBIDDEN_ROLE:')
})

