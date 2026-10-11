import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import * as client from '../src/services/adminBffService.js'
import { holdPendingReference, readPendingReference } from '../src/lib/referenceCommandRecovery.js'

test('protected reference browser client is available', () => {
  assert.equal(typeof client.createAdminReferenceBff, 'function', 'Protected reference creation client is missing')
  assert.equal(typeof client.getAdminReferencesBff, 'function')
})

test('HTTP retry after reload sends identical literal bytes, key and current CSRF', { skip: !client.createAdminReferenceBff }, async () => {
  const requests = []
  let errorCode = null
  const server = http.createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk
    requests.push({ method: req.method, path: req.url, headers: req.headers, body })
    res.setHeader('Content-Type', 'application/json')
    res.statusCode = errorCode ? 409 : 200
    res.end(JSON.stringify(errorCode ? { error: { code: errorCode } } : { ok: true, result: { recorded: true } }))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const fetchOriginal = globalThis.fetch, documentOriginal = globalThis.document
  const base = `http://127.0.0.1:${server.address().port}`
  globalThis.fetch = (url, options) => fetchOriginal(new URL(url, base), options)
  globalThis.document = { cookie: 'k2_admin_csrf=first-csrf' }
  try {
    const actorId = '89300000-0000-4000-8000-000000000001', key = '89310000-0000-4000-8000-000000000001'
    const payloadText = '{ "reason":"Reviewed current catalogue", "parentId":null, "name":"  Caffè Italia  ", "kind":"brand" }'
    let raw = null
    const store = { getItem: () => raw, setItem: (_, value) => { raw = value } }
    const held = holdPendingReference(actorId, key, payloadText, store)
    assert.equal((await client.createAdminReferenceBff(held.payloadText, held.key)).ok, true)
    globalThis.document.cookie = 'k2_admin_csrf=current-csrf'
    const restored = readPendingReference(actorId, store)
    assert.equal((await client.createAdminReferenceBff(restored.payloadText, restored.key)).ok, true)
    assert.equal((await client.getAdminReferencesBff()).ok, true)
    assert.equal(requests.length, 3)
    for (const req of requests.slice(0, 2)) {
      assert.equal(req.path, '/api/admin/references'); assert.equal(req.method, 'POST')
      assert.equal(req.body, payloadText); assert.equal(req.headers['x-k2-idempotency-key'], key)
      assert.equal(req.headers['content-type'], 'application/json')
    }
    assert.equal(requests[0].headers['x-k2-csrf'], 'first-csrf')
    assert.equal(requests[1].headers['x-k2-csrf'], 'current-csrf')
    assert.equal(requests[2].method, 'GET')
    assert.equal(requests[2].headers['x-k2-idempotency-key'], undefined)
    assert.equal((await client.createAdminReferenceBff(payloadText, '')).code, 'REFERENCE_INVALID')
    assert.equal((await client.createAdminReferenceBff('{}', key)).code, 'REFERENCE_INVALID')
    assert.equal(requests.length, 3, 'Invalid requests must never be sent or assigned a new key')
    errorCode = 'COMMAND_IN_PROGRESS'
    assert.match((await client.createAdminReferenceBff(payloadText, key)).error, /same saved request/i)
    assert.equal(readPendingReference(actorId, store).payloadText, payloadText)
    assert.equal((await client.cancelOrderBff({}, key)).error, 'That operation is still being recorded. Wait a moment, then refresh.', 'Reference copy must not alter unrelated command behavior')
  } finally {
    globalThis.fetch = fetchOriginal; globalThis.document = documentOriginal
    await new Promise(resolve => server.close(resolve))
  }
})
