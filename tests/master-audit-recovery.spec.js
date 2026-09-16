import { test, expect } from '@playwright/test'
import { signedRpcArguments } from '../server/storefront-bff/security.js'
import { readAdminCustomers } from '../server/admin-bff/customers.js'

test('malformed cookies do not break signing or grant guest access', () => {
  const prior = process.env.K2_GUEST_BFF_SECRET
  process.env.K2_GUEST_BFF_SECRET = Buffer.alloc(32, 7).toString('base64')
  try {
    for (const cookie of ['unrelated=%', 'k2_guest_access=%E0%A4%A']) {
      const signed = signedRpcArguments({ headers: { cookie } }, 'order', {})
      expect(signed.p_guest_grant_hash).toBeNull()
      expect(signed.p_signature).toMatch(/^[a-f0-9]{64}$/)
    }
    const valid = signedRpcArguments({ headers: { cookie: `unrelated=%; k2_guest_access=${'a'.repeat(64)}` } }, 'order', {})
    expect(valid.p_guest_grant_hash).toMatch(/^[a-f0-9]{64}$/)
  } finally {
    if (prior === undefined) delete process.env.K2_GUEST_BFF_SECRET
    else process.env.K2_GUEST_BFF_SECRET = prior
  }
})

function customerClient(orderCount) {
  return { from(table) {
    const rows = table === 'customers' ? [{ id: 'c', display_name: 'Synthetic customer' }]
      : table === 'order_requests' ? [{ id: 'o', customer_id: 'c', total_amount: 10 }] : []
    const query = { select() { return query }, order() { return query }, in() { return query },
      limit() { return Promise.resolve({ data: rows, error: null, count: table === 'order_requests' ? orderCount : rows.length }) } }
    return query
  } }
}

test('provider-capped customer history cannot masquerade as complete metrics', async () => {
  const result = await readAdminCustomers(customerClient(2001))
  expect(result.metricsAvailable).toBe(false)
  expect(result.customers[0].metrics).toBeNull()
})

test('complete counted customer history retains metrics', async () => {
  const result = await readAdminCustomers(customerClient(1))
  expect(result.metricsAvailable).toBe(true)
  expect(result.customers[0].metrics.orderCount).toBe(1)
})
