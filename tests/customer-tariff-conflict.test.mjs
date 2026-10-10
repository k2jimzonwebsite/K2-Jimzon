import test, { after, mock } from 'node:test'
import assert from 'node:assert/strict'

// Isolate authorization and the external RPC response, not the response handler.
// This proves handler semantics only; genuine Auth/PostgREST remains MAP-018.
let providerError
mock.module('../server/admin-bff/authorize.js', {
  exports: {
    authorizeAdminRequest: async () => ({
      identity: { role: 'Staff', userId: '11000000-0000-4000-8000-000000000001' },
      client: { rpc: async () => ({ data: null, error: providerError }) },
    }),
  },
})
const { handleCustomerDeliveryRates } = await import('../server/admin-bff/customer-delivery-rates.js')
const previousSecret = process.env.K2_ADMIN_BFF_REQUEST_SECRET
process.env.K2_ADMIN_BFF_REQUEST_SECRET = Buffer.alloc(32, 1).toString('base64')
after(() => {
  if (previousSecret === undefined) delete process.env.K2_ADMIN_BFF_REQUEST_SECRET
  else process.env.K2_ADMIN_BFF_REQUEST_SECRET = previousSecret
})

async function responseFor(error, method = 'GET') {
  providerError = { details: null, hint: null, ...error }
  const res = {
    headers: {},
    setHeader(name, value) { this.headers[name] = value },
    end(body) { this.body = JSON.parse(body) },
  }
  const req = { method, headers: {} }
  if (method === 'POST') {
    req.headers = { 'content-type': 'application/json', 'x-k2-idempotency-key': '12000000-0000-4000-8000-000000000001' }
    req.body = {
      expectedVersion: 0, reason: 'Synthetic handler regression', evidenceRef: 'Synthetic local evidence',
      rates: Object.fromEntries(['NCR', 'Greater Luzon', 'Visayas', 'Mindanao'].map(area => [area,
        { baseMinor: 15000, includedWeightG: 5000, extraKgMinor: 4000, roundMinor: 100 }])),
    }
  }
  await handleCustomerDeliveryRates(req, res)
  assert.equal(res.headers['Cache-Control'], 'no-store')
  return res
}

for (const method of ['GET', 'POST']) for (const code of ['40001', 'P0001']) {
  test(`${method} named stale tariff keeps409 under ${code}`, async () => {
    const res = await responseFor({ code, message: 'K2_CUSTOMER_TARIFF_VERSION_STALE' }, method)
    assert.equal(res.statusCode, 409)
    assert.deepEqual(res.body, { error: { code: 'CUSTOMER_TARIFF_VERSION_STALE' } })
  })
}

for (const method of ['GET', 'POST']) test(`${method} real serialization failure is unavailable rather than a stale tariff`, async () => {
  const res = await responseFor({ code: '40001', message: 'could not serialize access due to concurrent update' }, method)
  assert.equal(res.statusCode, 503)
  assert.deepEqual(res.body, { error: { code: 'CUSTOMER_TARIFF_UNAVAILABLE' } })
})

for (const [error, status, code] of [
  [{ code: '22023', message: 'K2_ADMIN_IDEMPOTENCY_CONFLICT' }, 409, 'IDEMPOTENCY_CONFLICT'],
  [{ code: '42501', message: 'permission denied' }, 403, 'CUSTOMER_TARIFF_STAFF_REQUIRED'],
  [{ code: '22023', message: 'invalid request' }, 400, 'REQUEST_INVALID'],
  [{ code: '54000', message: 'K2_ADMIN_RATE_LIMITED' }, 429, 'RATE_LIMITED'],
  [{ code: 'P0001', message: 'unclassified provider failure' }, 503, 'CUSTOMER_TARIFF_UNAVAILABLE'],
]) {
  test(`other tariff refusal remains ${status}/${code}`, async () => {
    const res = await responseFor(error)
    assert.equal(res.statusCode, status)
    assert.deepEqual(res.body, { error: { code } })
    if (status === 429) assert.equal(res.headers['Retry-After'], '60')
  })
}
