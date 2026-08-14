import { expect, test } from '@playwright/test'
import loginHandler from '../api/admin/auth/login.js'
import mfaHandler from '../api/admin/auth/mfa.js'
import logoutHandler from '../api/admin/auth/logout.js'
import sessionHandler from '../api/admin/session.js'
import overviewHandler, { readOverviewData } from '../api/admin/overview.js'
import productsHandler, { readAdminProducts } from '../api/admin/products.js'
import fulfillmentHandler from '../api/admin/fulfillment.js'
import confirmHandler from '../api/admin/fulfillment/confirm.js'
import { validateFulfillmentCommand } from '../server/admin-bff/fulfillment.js'
import inboxHandler from '../api/admin/inbox.js'
import internalNoteHandler from '../api/admin/inbox/internal-note.js'
import { validateInboxCommand } from '../server/admin-bff/inbox.js'
import pasabuyHandler from '../api/admin/pasabuy.js'
import pasabuyQuoteHandler from '../api/admin/pasabuy/quote.js'
import { validatePasabuyCommand } from '../server/admin-bff/pasabuy.js'
import intakeSessionHandler from '../api/admin/product-intake/session.js'
import intakeDraftHandler from '../api/admin/product-intake/draft.js'
import { decodeEvidenceImage, validateProductIntakeCommand } from '../server/admin-bff/product-intake.js'
import consignmentsHandler from '../api/admin/consignments.js'
import consignmentScanHandler from '../api/admin/consignments/scan.js'
import { validateConsignmentCommand } from '../server/admin-bff/consignments.js'
import lotsHandler from '../api/admin/lots.js'
import lotReconcileHandler from '../api/admin/lots/reconcile.js'
import { validateLotCommand } from '../server/admin-bff/lots.js'
import couponsHandler from '../api/admin/coupons.js'
import couponCreateHandler from '../api/admin/coupons/create.js'
import { validateCouponCommand } from '../server/admin-bff/coupons.js'
import customersHandler from '../api/admin/customers.js'
import { readAdminCustomers } from '../server/admin-bff/customers.js'
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'

function response() {
  const headers = new Map()
  return {
    headers,
    statusCode: 0,
    body: '',
    setHeader(name, value) { headers.set(name.toLowerCase(), value) },
    end(value = '') { this.body = value },
  }
}

function request(method, overrides = {}) {
  return {
    method,
    headers: { origin: 'https://admin.example.test', 'content-type': 'application/json' },
    socket: { remoteAddress: '127.0.0.1' },
    body: {},
    ...overrides,
  }
}

test.beforeEach(() => {
  process.env.NODE_ENV = 'production'
  process.env.K2_DEPLOYMENT_TARGET = 'admin'
  process.env.K2_ADMIN_ORIGINS = 'https://admin.example.test'
  process.env.K2_SESSION_COOKIE_KEY = Buffer.alloc(32, 9).toString('base64')
})

test('admin API fails closed on the storefront project and wrong origin', async () => {
  process.env.K2_DEPLOYMENT_TARGET = 'storefront'
  const storefront = response()
  await loginHandler(request('POST'), storefront)
  expect(storefront.statusCode).toBe(404)
  expect(JSON.parse(storefront.body).error.code).toBe('NOT_FOUND')

  process.env.K2_DEPLOYMENT_TARGET = 'admin'
  const crossSite = response()
  await loginHandler(request('POST', { headers: { origin: 'https://evil.example', 'content-type': 'application/json' } }), crossSite)
  expect(crossSite.statusCode).toBe(403)
  expect(JSON.parse(crossSite.body).error.code).toBe('ORIGIN_DENIED')
})

test('admin auth endpoints enforce method and pending/session boundaries', async () => {
  const wrongMethod = response()
  await loginHandler(request('GET'), wrongMethod)
  expect(wrongMethod.statusCode).toBe(405)
  expect(wrongMethod.headers.get('allow')).toBe('POST')

  const noPending = response()
  await mfaHandler(request('POST'), noPending)
  expect(noPending.statusCode).toBe(401)
  expect(JSON.parse(noPending.body).error.code).toBe('MFA_SESSION_EXPIRED')

  const noSession = response()
  await sessionHandler(request('GET', { headers: {} }), noSession)
  expect(noSession.statusCode).toBe(401)
  expect(JSON.parse(noSession.body).error.code).toBe('SESSION_EXPIRED')
  expect(Array.isArray(noSession.headers.get('set-cookie'))).toBe(true)

  const logoutWithoutCsrf = response()
  await logoutHandler(request('POST'), logoutWithoutCsrf)
  expect(logoutWithoutCsrf.statusCode).toBe(403)
  expect(JSON.parse(logoutWithoutCsrf.body).error.code).toBe('CSRF_DENIED')
})

test('admin overview is fixed-schema, session-gated, and reports partial data safely', async () => {
  const wrongRange = response()
  await overviewHandler(request('GET', { query: { range: '365' } }), wrongRange)
  expect(wrongRange.statusCode).toBe(400)
  expect(JSON.parse(wrongRange.body).error.code).toBe('INVALID_RANGE')

  const noSession = response()
  await overviewHandler(request('GET', { query: { range: '30' } }), noSession)
  expect(noSession.statusCode).toBe(401)
  expect(JSON.parse(noSession.body).error.code).toBe('SESSION_EXPIRED')

  const queued = [
    { data: [{ id: 'order-1' }], error: null },
    { data: null, count: 2, error: null },
    { data: [], error: null },
    { data: [], error: { message: 'private provider detail' } },
    { data: [], error: null },
    { data: [], error: null },
    { data: [], error: null },
    { data: [], error: null },
  ]
  const client = {
    from() {
      const result = queued.shift()
      const builder = {
        select() { return builder },
        gte() { return Promise.resolve(result) },
        eq() { return Promise.resolve(result) },
        then(resolve, reject) { return Promise.resolve(result).then(resolve, reject) },
      }
      return builder
    },
  }
  const result = await readOverviewData(client, 30)
  expect(result.data.orders).toEqual([{ id: 'order-1' }])
  expect(result.data.orderBacklog).toBe(2)
  expect(result.unavailable).toEqual([{ key: 'batches', code: 'QUERY_UNAVAILABLE' }])
  expect(JSON.stringify(result)).not.toContain('private provider detail')
})

test('prepared admin client uses same-origin cookies and never receives Supabase tokens', async () => {
  const service = await readFile(new URL('../src/services/adminBffService.js', import.meta.url), 'utf8')
  const runtime = await readFile(new URL('../src/context/useAdminAuthRuntime.js', import.meta.url), 'utf8')
  expect(service).toContain("credentials: 'include'")
  expect(service).toContain("'/api/admin/auth/login'")
  expect(service).toContain("'/api/admin/auth/mfa'")
  expect(service).toContain("'/api/admin/auth/logout'")
  expect(service).not.toMatch(/access_token|refresh_token|SUPABASE_SERVICE_ROLE|SUPABASE_SECRET_KEY/)
  expect(runtime).toContain('adminBffEnabled()')
  expect(runtime).toContain('loginAdminBff')
  expect(runtime).toContain('getAdminSessionBff')
})

test('admin and storefront providers remain separate production runtimes', async () => {
  const adminApp = await readFile(new URL('../src/AdminApp.jsx', import.meta.url), 'utf8')
  const storefrontApp = await readFile(new URL('../src/StorefrontApp.jsx', import.meta.url), 'utf8')
  const storefrontContext = await readFile(new URL('../src/context/StoreContext.jsx', import.meta.url), 'utf8')
  const boundaryVerifier = await readFile(new URL('../scripts/verify-build-boundary.mjs', import.meta.url), 'utf8')
  expect(adminApp).toContain('AdminStoreProvider')
  expect(adminApp).not.toContain("./context/StoreContext")
  expect(storefrontApp).toContain('StoreProvider')
  expect(storefrontApp).not.toContain('AdminStoreProvider')
  expect(storefrontContext).not.toMatch(/\/api\/admin|append_internal_message|mark_conversation_read|update_conversation_workflow/)
  expect(boundaryVerifier).toContain('forbiddenBundleContent')
  expect(boundaryVerifier).toContain('cross-artifact runtime code')
})

test('admin product projection is session-gated and derives stock without exposing full rows', async () => {
  const noSession = response()
  await productsHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)
  expect(JSON.parse(noSession.body).error.code).toBe('SESSION_EXPIRED')

  const queued = [
    { data: [{ sku: 'SKU-1', name: 'Pasta', barcode: '8001', status: 'Live', srp: '100', wholesale_price: '80', subcategory: 'Pasta', primary_image_url: null, created_at: '2026-08-12T00:00:00Z', private_note: 'must not escape' }], error: null },
    { data: [{ sku: 'SKU-1', stock_from_batches: 7 }], error: null },
  ]
  const client = {
    from() {
      const result = queued.shift()
      const builder = {
        select() { return builder }, order() { return builder },
        limit() { return Promise.resolve(result) },
      }
      return builder
    },
  }
  const result = await readAdminProducts(client)
  expect(result.products[0].stock_available).toBe(7)
  expect(result.products[0].srp).toBe(100)
  expect(result.products[0]).not.toHaveProperty('private_note')
})

test('fulfillment BFF is session/CSRF/idempotency gated and validates fixed command schemas', async () => {
  const noSession = response()
  await fulfillmentHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const missingKey = response()
  await confirmHandler(request('POST'), missingKey)
  expect(missingKey.statusCode).toBe(400)
  expect(JSON.parse(missingKey.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  expect(validateFulfillmentCommand('packing_scan', {
    orderRequestId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', scannedCode: '8001234567890',
  })).toEqual({ orderRequestId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', scannedCode: '8001234567890' })
  expect(() => validateFulfillmentCommand('packing_scan', {
    orderRequestId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', scannedCode: 'SKU-1', injected: true,
  })).toThrow('REQUEST_INVALID')
  expect(() => validateFulfillmentCommand('delivery_details', {
    orderRequestId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', shippingAmount: -1,
    courierName: 'Courier', trackingNumber: '', waybillUrl: '', customerConfirmed: false, note: 'Quoted',
  })).toThrow('REQUEST_INVALID')
})

test('fulfillment boundary is signed, replay-safe, and remains feature-gated', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_fulfillment_bff_boundary.sql', import.meta.url), 'utf8')
  const service = await readFile(new URL('../src/services/adminBffService.js', import.meta.url), 'utf8')
  const hub = await readFile(new URL('../src/views/admin/OmniOperationsHub.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('verify_admin_bff_request')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain('K2_ADMIN_IDEMPOTENCY_CONFLICT')
  expect(migration).toContain("p_action = 'packing_scan' then 240 else 30")
  expect(service).toContain("headers['X-K2-Idempotency-Key'] = idempotencyKey || crypto.randomUUID()")
  expect(hub).toContain('adminBffEnabled()')
  expect(hub).toContain('recordPackingScanBff')
})

test('universal inbox BFF preserves internal-note truth and rejects loose payloads', async () => {
  const noSession = response()
  await inboxHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const noIdempotency = response()
  await internalNoteHandler(request('POST'), noIdempotency)
  expect(noIdempotency.statusCode).toBe(400)
  expect(JSON.parse(noIdempotency.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  expect(validateInboxCommand('inbox_internal_note', {
    conversationId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', content: 'Customer asked for an updated courier quote.',
  })).toEqual({
    conversationId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', content: 'Customer asked for an updated courier quote.',
  })
  expect(() => validateInboxCommand('inbox_internal_note', {
    conversationId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', content: 'note', delivered: true,
  })).toThrow('REQUEST_INVALID')
  expect(() => validateInboxCommand('inbox_workflow', {
    conversationId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', status: 'Sent', priority: 'normal',
    assignedTo: null, responseDueAt: null, reason: '',
  })).toThrow('REQUEST_INVALID')
})

test('prepared inbox command boundary is signed, durable, and not external delivery', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_inbox_bff_boundary.sql', import.meta.url), 'utf8')
  const runtime = await readFile(new URL('../src/context/useAdminInboxRuntime.js', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_inbox_command_v1')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain('public.append_internal_message')
  expect(migration).toContain('Internal notes remain internal_only')
  expect(migration).not.toContain("delivery_status = 'sent'")
  expect(runtime).toContain('getAdminInbox')
  expect(runtime).toContain('saveInternalNoteBff')
  expect(runtime).toContain('window.setInterval(fetchConversations, 15_000)')
})

test('Pasabuy BFF is session/idempotency gated and bounds owner-selected pricing', async () => {
  const noSession = response()
  await pasabuyHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const noIdempotency = response()
  await pasabuyQuoteHandler(request('POST'), noIdempotency)
  expect(noIdempotency.statusCode).toBe(400)
  expect(JSON.parse(noIdempotency.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  const valid = validatePasabuyCommand('pasabuy_quote', {
    requestId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', itemCostForeign: 10,
    fxRate: 62.5, fxSource: 'Bank published rate', fxCapturedAt: new Date().toISOString(),
    weightKg: 0.5, shippingMethod: 'air', freightRateForeignPerKg: 14,
    customsTaxPercent: 12, handlingPhp: 0, marginPercent: 40, finalPricePhp: 1200,
    validUntil: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    priceRationale: 'Seasonal availability and air freight.',
  })
  expect(valid.priceRationale).toBe('Seasonal availability and air freight.')
  expect(() => validatePasabuyCommand('pasabuy_quote', {
    ...valid, finalPricePhp: 100, priceRationale: 'Below cost should fail.',
  })).toThrow('REQUEST_INVALID')
  expect(() => validatePasabuyCommand('pasabuy_transition', {
    requestId: valid.requestId, toStatus: 'purchasing', reason: '',
  })).toThrow('REQUEST_INVALID')
})

test('prepared Pasabuy boundary is signed, durable, rationale-audited, and feature-gated', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_pasabuy_bff_boundary.sql', import.meta.url), 'utf8')
  const service = await readFile(new URL('../src/services/adminBffService.js', import.meta.url), 'utf8')
  const manager = await readFile(new URL('../src/views/admin/PasabuyManager.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_pasabuy_command_v1')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain('quote_price_rationale')
  expect(migration).toContain("'sent',false,'paid',false")
  expect(service).toContain("'/api/admin/pasabuy'")
  expect(manager).toContain('adminBffEnabled()')
  expect(manager).toContain('savePasabuyQuoteBff')
  expect(manager).toContain('Owner price rationale')
})

test('product-intake BFF is session/idempotency gated and rejects loose operational input', async () => {
  const noSession = response()
  await intakeSessionHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const noIdempotency = response()
  await intakeDraftHandler(request('POST'), noIdempotency)
  expect(noIdempotency.statusCode).toBe(400)
  expect(JSON.parse(noIdempotency.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  expect(validateProductIntakeCommand('intake_session_step', {
    sessionId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', step: 'field_review', patch: {},
  })).toEqual({
    sessionId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', step: 'field_review', patch: {},
  })
  expect(() => validateProductIntakeCommand('intake_session_step', {
    sessionId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', step: 'live', patch: {},
  })).toThrow('REQUEST_INVALID')
  expect(() => validateProductIntakeCommand('intake_session_step', {
    sessionId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', step: 'field_review',
    patch: { packagingImages: [{ upload_status: 'uploaded' }] },
  })).toThrow('REQUEST_INVALID')
  expect(() => validateProductIntakeCommand('intake_inventory', {
    sessionId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1',
    inventoryRequestId: 'e74a4161-72ca-4d72-8f59-37aa690e1869', source: 'receipt', inventory: {},
  })).toThrow('REQUEST_INVALID')
})

test('prepared product-intake boundary is named, signed, receipt-backed, and upload-honest', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_product_intake_bff_boundary.sql', import.meta.url), 'utf8')
  const server = await readFile(new URL('../server/admin-bff/product-intake.js', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_product_intake_command_v1')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain("'intake_session_create','intake_session_step','intake_draft'")
  expect(migration).toContain('PRODUCT_PUBLICATION_REASON')
  expect(server).toContain(".select(SESSION_PROJECTION)")
  expect(server).not.toContain("select('*')")
  expect(server).not.toContain('packagingImages]')
  expect(migration).toContain('Private evidence upload/decode validation remains a separate gate')
})

test('private intake evidence requires real single-image decoding and strips metadata', async () => {
  const validPng = await sharp({
    create: { width: 120, height: 120, channels: 3, background: '#8b1e2d' },
  }).png().withMetadata({ comment: 'must not survive normalization' }).toBuffer()
  const decoded = await decodeEvidenceImage(validPng, 'image/png')
  expect(decoded.type).toBe('image/png')
  expect(decoded.width).toBe(120)
  expect(decoded.height).toBe(120)
  expect(decoded.sha256).toMatch(/^[0-9a-f]{64}$/)
  const normalized = await sharp(decoded.buffer).metadata()
  expect(normalized.comments || []).toEqual([])
  await expect(decodeEvidenceImage(Buffer.from('<svg><script>alert(1)</script></svg>'), 'image/png'))
    .rejects.toThrow()
  await expect(decodeEvidenceImage(validPng, 'image/jpeg')).rejects.toThrow('EVIDENCE_FILE_INVALID')
})

test('flight consignment BFF is session/idempotency gated and validates exact scan truth', async () => {
  const noSession = response()
  await consignmentsHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const noIdempotency = response()
  await consignmentScanHandler(request('POST'), noIdempotency)
  expect(noIdempotency.statusCode).toBe(400)
  expect(JSON.parse(noIdempotency.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  const validScan = validateConsignmentCommand('consignment_scan', {
    consignmentId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1',
    itemId: 'e74a4161-72ca-4d72-8f59-37aa690e1869', stage: 'manila', scannedCode: '8001234567890',
  })
  expect(validScan.stage).toBe('manila')
  expect(validScan.scannedCode).toBe('8001234567890')
  expect(() => validateConsignmentCommand('consignment_scan', { ...validScan, quantity: 50 })).toThrow('REQUEST_INVALID')
  expect(() => validateConsignmentCommand('consignment_advance', {
    consignmentId: validScan.consignmentId, toStatus: 'Completed', reason: 'Skip receiving',
  })).toThrow('REQUEST_INVALID')
  expect(() => validateConsignmentCommand('consignment_finalize', {
    consignmentId: validScan.consignmentId, notes: 'short',
  })).toThrow('REQUEST_INVALID')
})

test('prepared flight boundary preserves unit scans, reasons, durable retry, and direct-RPC cutover', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_consignments_bff_boundary.sql', import.meta.url), 'utf8')
  const manager = await readFile(new URL('../src/views/admin/ConsignmentManager.jsx', import.meta.url), 'utf8')
  const reconciliation = await readFile(new URL('../src/views/admin/DiscrepancyReconciliationModal.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_consignment_command_v1')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain('K2_SCAN_CODE_MISMATCH')
  expect(migration).toContain("p_action='consignment_scan' then 300 else 30")
  expect(migration).toContain('revoke execute on function public.record_consignment_item_scan')
  expect(migration).toContain("'reason',trim(v_payload->>'reason')")
  expect(manager).toContain('adminBffEnabled()')
  expect(manager).toContain('recordConsignmentScanBff')
  expect(manager).toContain('commandKeysRef')
  expect(manager).not.toContain('window.confirm')
  expect(reconciliation).toContain('Finalize receipt and create lots')
})

test('customer BFF is session-gated and keeps canonical identities separate', async () => {
  const noSession = response()
  await customersHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const rows = {
    customers: { data: [{
      id: 'c1', display_name: 'Guest customer', status: 'active', created_source: 'website_guest',
      created_at: '2026-08-12T00:00:00Z', updated_at: '2026-08-12T00:00:00Z',
      customer_contact_points: [{ contact_kind: 'email', contact_value: 'guest@example.test', verification_status: 'unverified', source: 'website_guest' }],
      customer_accounts: [], channel_identities: [{ channel: 'website', link_status: 'unlinked' }],
    }], error: null },
    order_requests: { data: [{ id: 'o1', customer_id: 'c1', total_amount: 1500, status: 'submitted' }], error: null },
    pasabuy_requests: { data: [], error: null },
    conversations: { data: [{ id: 'x1', customer_id: 'c1', status: 'open', unread_count: 2 }], error: null },
  }
  const client = { from(table) { const chain = { select() { return chain }, order() { return chain }, in() { return chain }, limit() { return Promise.resolve(rows[table]) } }; return chain } }
  const result = await readAdminCustomers(client)
  expect(result.mode).toBe('canonical')
  expect(result.customers[0].account.linked).toBe(false)
  expect(result.customers[0].channels[0].linkStatus).toBe('unlinked')
  expect(result.customers[0].metrics.orderValue).toBe(1500)
})

test('coupon BFF is session/idempotency gated and validates exact financial rules', async () => {
  const noSession = response()
  await couponsHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const noIdempotency = response()
  await couponCreateHandler(request('POST'), noIdempotency)
  expect(noIdempotency.statusCode).toBe(400)
  expect(JSON.parse(noIdempotency.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  const valid = validateCouponCommand('coupon_create', {
    code: 'MILANO10', description: 'August direct-store campaign',
    discountType: 'percentage', discountValue: 10, minSpend: 1000,
    maxRedemptions: 100, startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    isActive: false, isHunt: false, clue: null,
    reason: 'Approved August direct-store campaign.',
  })
  expect(valid.code).toBe('MILANO10')
  expect(() => validateCouponCommand('coupon_create', { ...valid, discountValue: 101 })).toThrow('REQUEST_INVALID')
  expect(() => validateCouponCommand('coupon_create', { ...valid, surprise: true })).toThrow('REQUEST_INVALID')
  expect(() => validateCouponCommand('coupon_state', {
    couponId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', active: true, reason: 'short',
  })).toThrow('REQUEST_INVALID')
})

test('prepared coupon boundary is admin-only, reasoned, auditable, and feature-gated', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_coupons_bff_boundary.sql', import.meta.url), 'utf8')
  const server = await readFile(new URL('../server/admin-bff/coupons.js', import.meta.url), 'utf8')
  const manager = await readFile(new URL('../src/views/admin/CouponManager.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_coupon_command_v1')
  expect(migration).toContain('coupon_change_events')
  expect(migration).toContain("role::text='Admin'")
  expect(migration).toContain('K2_COUPON_STATE_CONFLICT')
  expect(migration).toContain('revoke insert,update,delete on table public.coupons from authenticated')
  expect(server).toContain("authorized.identity.role !== 'Admin'")
  expect(server).not.toContain("select('*')")
  expect(manager).toContain('adminBffEnabled()')
  expect(manager).toContain('createCouponBff')
  expect(manager).toContain('Reason for creating this promotion')
  expect(manager).not.toContain('window.confirm')
  expect(manager).not.toContain('loadError.message)')
})

test('lot and expiry BFF is session/idempotency gated and rejects unsafe reconciliation input', async () => {
  const noSession = response()
  await lotsHandler(request('GET', { query: { sku: 'SKU-1' } }), noSession)
  expect(noSession.statusCode).toBe(401)

  const noIdempotency = response()
  await lotReconcileHandler(request('POST'), noIdempotency)
  expect(noIdempotency.statusCode).toBe(400)
  expect(JSON.parse(noIdempotency.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  const valid = validateLotCommand('lots_reconcile', {
    sku: 'SKU-1', reason: 'Manila physical recount after shelf transfer.',
    lots: [{
      id: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', boxCode: 'MIL-104',
      batchCode: 'B-2026-08', quantity: 12, expiryDate: '2027-08-12',
      landedDate: '2026-08-12', hub: 'Manila Hub', custodian: 'Main stock room',
      channel: '', pinned: false, status: 'available',
    }],
  })
  expect(valid.lots[0].quantity).toBe(12)
  expect(() => validateLotCommand('lots_reconcile', {
    ...valid, reason: 'short',
  })).toThrow('REQUEST_INVALID')
  expect(() => validateLotCommand('lots_reconcile', {
    ...valid, lots: [{ ...valid.lots[0], hub: '' }],
  })).toThrow('REQUEST_INVALID')
  expect(() => validateLotCommand('lot_clearance', {
    batchId: valid.lots[0].id, approved: 'yes', reason: 'Owner approved disclosed clearance.',
  })).toThrow('REQUEST_INVALID')
})

test('prepared lot boundary derives sellable stock, preserves reservations, and replaces prompt-based decisions', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_lots_bff_boundary.sql', import.meta.url), 'utf8')
  const editor = await readFile(new URL('../src/views/admin/BatchExpiryManagerModal.jsx', import.meta.url), 'utf8')
  const alerts = await readFile(new URL('../src/views/admin/DailyTaskNotificationDrawer.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_lot_command_v1')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain('K2_LOT_RESERVED_CONFLICT')
  expect(migration).toContain('quantity_available=v_available')
  expect(migration).toContain('sum(quantity_available)')
  expect(migration).toContain('where b.quantity>0')
  expect(migration).toContain('revoke execute on function public.reconcile_product_batches')
  expect(editor).toContain('adminBffEnabled()')
  expect(editor).toContain('reconcileLotsBff')
  expect(editor).toContain('reserved units')
  expect(editor).not.toContain('window.prompt')
  expect(editor).not.toContain('Batch editor reconciliation')
  expect(alerts).toContain('getAdminLots')
  expect(alerts).not.toMatch(/[🔔✅📍🙋🛒]/u)
})
