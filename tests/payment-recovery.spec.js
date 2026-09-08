import { test, expect } from '@playwright/test'
import { validateFulfillmentCommand } from '../server/admin-bff/fulfillment.js'
import { createRetainedOperationSession, updatePaymentBff, recordPackingScanBff,
  confirmOrderBff, updateDeliveryBff, fulfillOrderBff, transferLotBff, assignBoxBff,
  createProductIntakeSessionBff, saveProductIntakeStepBff, createProductDraftBff,
  createProductFirstInventoryBff, transitionProductPublicationBff, createSupplierBff, reviewAdminWholesaleInquiry } from '../src/services/adminBffService.js'

const payload = {
  orderRequestId: '11111111-1111-4111-8111-111111111111',
  toStatus: 'evidence_submitted', evidenceNote: 'Corrected transfer reference reviewed',
  expectedPaymentStatus: 'failed', expectedUpdatedAt: '2026-09-06T01:00:00.123456+00:00',
}
test('corrected evidence binds to the exact reviewed payment state and database timestamp', () => {
  expect(validateFulfillmentCommand('payment_status', payload)).toEqual(payload)
})
test('payment commands refuse a missing or malformed review version', () => {
  for (const expectedUpdatedAt of [undefined, '', 'tomorrow', '2026-09-06']) {
    expect(() => validateFulfillmentCommand('payment_status', { ...payload, expectedUpdatedAt })).toThrow('REQUEST_INVALID')
  }
  expect(() => validateFulfillmentCommand('payment_status', { ...payload, expectedPaymentStatus: 'unknown' })).toThrow('REQUEST_INVALID')
})
test('payment commands retain a required evidence note and reject extra authority fields', () => {
  expect(() => validateFulfillmentCommand('payment_status', { ...payload, evidenceNote: ' ' })).toThrow('REQUEST_INVALID')
  expect(() => validateFulfillmentCommand('payment_status', { ...payload, actorId: payload.orderRequestId })).toThrow('REQUEST_INVALID')
})
for (const [name, command, request] of [
  ['payment', updatePaymentBff, payload],
  ['supplier', createSupplierBff, { name: 'Italian supplier', contactEmail: 'supplier@example.test', leadTimeDays: 14, reason: 'Verified source' }],
  ['wholesale review', (request, key) => reviewAdminWholesaleInquiry(request.inquiryReference, request.toStatus, request.reason, key), { inquiryReference: 'WI-0123456789ABCDEF', toStatus: 'under_review', reason: 'Business need reviewed' }],
  ['intake session', createProductIntakeSessionBff, { requestId: payload.orderRequestId, barcode: '1234567890123' }],
  ['intake step', saveProductIntakeStepBff, { sessionId: payload.orderRequestId, step: 'identity', patch: { name: 'Reviewed product' } }],
  ['intake draft', createProductDraftBff, { sessionId: payload.orderRequestId, product: { sku: 'SKU-123' } }],
  ['first inventory', createProductFirstInventoryBff, { sessionId: payload.orderRequestId, quantity: 3 }],
  ['publication', transitionProductPublicationBff, { sessionId: payload.orderRequestId, target: 'Live' }],
  ['packing', recordPackingScanBff, { orderRequestId: payload.orderRequestId, scannedCode: 'SAME-SKU', reservationId: '22222222-2222-4222-8222-222222222222', lotConfirmed: true }],
  ['confirmation', (request,key) => confirmOrderBff(request.orderRequestId,request.reason,key), { orderRequestId: payload.orderRequestId, reason: 'Stock reviewed' }],
  ['delivery', updateDeliveryBff, { orderRequestId: payload.orderRequestId, deliveryStatus: 'booked' }],
  ['handover', (request,key) => fulfillOrderBff(request.orderRequestId,request.handoverNote,key), { orderRequestId: payload.orderRequestId, handoverNote: 'Handover reviewed' }],
  ['lot transfer', transferLotBff, { batchId: '22222222-2222-4222-8222-222222222222', quantity: 1 }],
  ['box assignment', (request,key) => assignBoxBff(request.boxCode,request.toCustodian,request.reason,key), { boxCode: 'BOX-A', toCustodian: 'STAFF-B', reason: 'Custody reviewed' }],
]) test(`a ${name} response-loss retry sends the same reviewed payload and operation key`, async () => {
  const previousFetch = globalThis.fetch
  const previousDocument = globalThis.document
  const calls = []
  globalThis.document = { cookie: 'k2_admin_csrf=local-csrf' }
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body), key: options.headers['X-K2-Idempotency-Key'] })
    if (calls.length === 1) throw new TypeError('local response lost')
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }
  try {
    const session = createRetainedOperationSession(command)
    expect((await session.run(request)).ok).toBe(false)
    expect((await session.run(request)).ok).toBe(true)
    expect(calls[0].body).toEqual(request)
    expect(calls[1]).toEqual(calls[0])
  } finally { globalThis.fetch = previousFetch; globalThis.document = previousDocument }
})
