import { expect, test } from '@playwright/test'
import { validateFulfillmentCommand } from '../server/admin-bff/fulfillment.js'
const payload = { orderRequestId: '11111111-1111-4111-8111-111111111111', scannedCode: 'SAME-SKU', reservationId: '22222222-2222-4222-8222-222222222222', lotConfirmed: true }
test('packing requires the exact allocation and physical-lot confirmation', () => {
  expect(validateFulfillmentCommand('packing_scan', payload)).toEqual(payload)
  for (const lotConfirmed of [false, undefined, 'true']) {
    expect(() => validateFulfillmentCommand('packing_scan', { ...payload, lotConfirmed })).toThrow('REQUEST_INVALID')
  }
  expect(() => validateFulfillmentCommand('packing_scan', { ...payload, reservationId: '' })).toThrow('REQUEST_INVALID')
})
