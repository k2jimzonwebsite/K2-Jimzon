import test from 'node:test'
import assert from 'node:assert/strict'
import { createCustomerPortfolioHandler } from '../prepared-api/storefront/account/portfolio.js'

process.env.K2_STOREFRONT_ORIGINS = 'https://store.test'
process.env.K2_GUEST_BFF_SECRET = Buffer.alloc(32, 7).toString('base64')
const token = 'a'.repeat(40)
const request = (body = {}, headers = {}) => ({ method: 'POST', body, headers: {
  origin: 'https://store.test', 'content-type': 'application/json', authorization: `Bearer ${token}`, ...headers,
} })
function response() {
  return { headers: {}, setHeader(k,v) { this.headers[k] = v }, end(v) { this.body = JSON.parse(v) } }
}
function fixture(user = { id: 'buyer-a' }) {
  const calls = []
  const handler = createCustomerPortfolioHandler({ createClient: () => ({ auth: { getUser: async () => ({ data: { user } }) },
    rpc: async (...args) => { calls.push(args); return { data: { ok: true, summary: { orderCount: 21 }, orders: [], nextCursor: null } } },
  }) })
  return { handler, calls }
}
test('portfolio requires current Auth identity and a permitted origin before reading', async () => {
  for (const [user, headers, status] of [[null, {}, 401], [{ id: 'buyer-a' }, { origin: 'https://evil.test' }, 403]]) {
    const { handler, calls } = fixture(user); const res = response()
    await handler(request({}, headers), res)
    assert.equal(res.statusCode, status); assert.equal(calls.length, 0)
  }
})
test('portfolio rejects customer selectors, unsupported commands and malformed pagination', async () => {
  for (const body of [{ userId: 'buyer-b' }, { customerId: 'victim' }, { operation: 'delete' }, { cursor: 'bad' }, []]) {
    const { handler, calls } = fixture(); const res = response()
    await handler(request(body), res)
    assert.equal(res.statusCode, 400); assert.equal(calls.length, 0)
  }
})
test('portfolio signs a fixed scoped read and preserves all-record summary', async () => {
  const { handler, calls } = fixture(); const res = response()
  await handler(request(), res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['Cache-Control'], 'no-store')
  assert.equal(calls[0][0], 'read_customer_portfolio_v1')
  assert.deepEqual(JSON.parse(calls[0][1].p_payload_text), { operation: 'list', cursor: null })
  assert.equal(res.body.portfolio.summary.orderCount, 21)
})
