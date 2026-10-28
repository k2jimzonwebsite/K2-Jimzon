import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import * as settingsApi from '../prepared-api/storefront/account/settings.js'

process.env.K2_STOREFRONT_ORIGINS = 'https://store.test'
process.env.K2_GUEST_BFF_SECRET = Buffer.alloc(32, 7).toString('base64')
const address = { id: randomUUID(), label: 'Home', recipientName: 'Teresa Abella', phone: '09178546329',
  street: '42 Mabini Street', postalCode: '1600', landmark: '',
  destination: { sourceVersion: 'psgc-2026-06-30', path: ['1300000000', '1374030000', '1374030010'] } }
const command = () => ({ operation: 'addresses', operationId: randomUUID(), expectedRevision: 0,
  displayName: 'Elena Villanueva', addresses: [address], defaultAddressId: address.id })
const req = (body = {}, headers = {}) => ({ method: 'POST', body, headers: {
  origin: 'https://store.test', 'content-type': 'application/json', authorization: `Bearer ${'a'.repeat(40)}`, ...headers,
} })
const response = () => ({ headers: {}, setHeader(k, v) { this.headers[k] = v }, end(v) { this.body = JSON.parse(v) } })
function fixture(user = { id: 'buyer-a' }, result = { ok: true, settings: { addressBook: { revision: 1 } } }) {
  assert.equal(typeof settingsApi.createCustomerSettingsHandler, 'function', 'settings API has no injectable verified address command')
  const calls = []
  const handler = settingsApi.createCustomerSettingsHandler({ createClient: () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    rpc: async (...args) => { calls.push(args); return { data: result } },
  }) })
  return { handler, calls }
}

test('address book API verifies current account and permitted origin before native mutation', async () => {
  for (const [user, headers, status] of [[null, {}, 401], [{ id: 'buyer-a' }, { origin: 'https://evil.test' }, 403]]) {
    const f = fixture(user), res = response()
    await f.handler(req(command(), headers), res)
    assert.equal(res.statusCode, status); assert.equal(f.calls.length, 0)
  }
})

test('address book uses the existing signed settings action and preserves operation/revision', async () => {
  const f = fixture(), res = response(), body = command()
  await f.handler(req(body), res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['Cache-Control'], 'no-store')
  assert.equal(f.calls[0][0], 'save_customer_account_address_book_v1')
  const payload = JSON.parse(f.calls[0][1].p_payload_text)
  assert.equal(payload.operationId, body.operationId)
  assert.equal(payload.expectedRevision, 0)
  assert.equal(payload.addresses[0].phone, '+639178546329')
  assert.equal('userId' in payload, false)
  assert.equal(res.body.settings.addressBook.revision, 1)
})

test('address shape and UTF-8 request limits reject before any native call', async () => {
  for (const [body, status] of [[{ ...command(), userId: 'another-account' }, 400],
    [JSON.stringify({ displayName: '界'.repeat(10000) }), 413]]) {
    const f = fixture(), res = response()
    await f.handler(req(body), res)
    assert.equal(res.statusCode, status); assert.equal(f.calls.length, 0)
  }
})

test('address revision and operation conflicts are explicit recoverable outcomes', async () => {
  for (const code of ['ADDRESS_BOOK_CONFLICT', 'ADDRESS_BOOK_OPERATION_CONFLICT', 'ADDRESS_BOOK_LEGACY_CONFLICT']) {
    const f = fixture({ id: 'buyer-a' }, { ok: false, error_code: code }), res = response()
    await f.handler(req(command()), res)
    assert.equal(res.statusCode, 409); assert.equal(res.body.error.code, code)
  }
})
