import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createHash } from 'node:crypto'
import { readFixtureAdminHttpBody } from '../scripts/fixture-admin-http-body.mjs'
import { readImageBody } from '../server/admin-bff/product-intake.js'
import { readJson } from '../server/admin-bff/security.js'

const digest = bytes => createHash('sha256').update(bytes).digest('hex')
async function request(path, bytes, image = false) {
  const server = http.createServer(async (req, res) => {
    try {
      req.body = await readFixtureAdminHttpBody(req)
      const body = image ? await readImageBody(req) : req.body
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(image
        ? { size: body.length, digest: digest(body), buffer: Buffer.isBuffer(body) }
        : { string: typeof body === 'string', parsed: path.includes('catalog-import') ? JSON.parse(body) : await readJson(req) }))
    } catch (error) {
      res.statusCode = error.message === 'FIXTURE_BODY_TOO_LARGE' ? 413 : 400
      res.end(JSON.stringify({ error: error.message }))
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method: 'POST', headers: { 'content-type': image ? 'image/png' : 'application/json' }, body: bytes,
    })
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}

test('evidence route preserves invalid UTF8 bytes through real streams into the production image reader', async () => {
  const bytes = Buffer.from([137,80,78,71,13,10,26,10,0,255,254,128])
  const result = await request('/api/admin/product-intake/evidence?fixture=true', bytes, true)
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { size: bytes.length, digest: digest(bytes), buffer: true })
})
test('evidence transport accepts the exact 4MiB image bound with bytes intact', async () => {
  const bytes = Buffer.alloc(4 * 1024 * 1024, 255)
  const result = await request('/api/admin/product-intake/evidence', bytes, true)
  assert.equal(result.status, 200)
  assert.equal(result.body.digest, digest(bytes))
  assert.equal(result.body.size, bytes.length)
})

test('public product image upload preserves binary bytes through the production image reader', async () => {
  const bytes = Buffer.from([137,80,78,71,13,10,26,10,0,255,254,128])
  const result = await request('/api/admin/product-media?fixture=true', bytes, true)
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { size: bytes.length, digest: digest(bytes), buffer: true })
})

test('product media assignment keeps JSON understood by the production JSON reader', async () => {
  const value = { sku: 'SYNTHETIC', primary: null, lifestyle: [], secondary: [], reason: 'Synthetic assignment' }
  const result = await request('/api/admin/product-media/assign', Buffer.from(JSON.stringify(value)))
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { string: true, parsed: value })
})
test('fixture transport refuses a byte beyond its 4MiB maximum', async () => {
  const result = await request('/api/admin/product-intake/evidence', Buffer.alloc(4 * 1024 * 1024 + 1), true)
  assert.equal(result.status, 413)
})
test('ordinary JSON remains a string understood by the production JSON reader', async () => {
  const result = await request('/api/admin/auth/login', Buffer.from(JSON.stringify({ email: 'synthetic@example.invalid', code: '雪' })))
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { string: true, parsed: { email: 'synthetic@example.invalid', code: '雪' } })
})
test('catalog import JSON above the old 16KiB fixture limit remains intact', async () => {
  const value = { csvText: 'synthetic,雪\n'.repeat(8000) }
  const result = await request('/api/admin/catalog-import/preview', Buffer.from(JSON.stringify(value)))
  assert.equal(result.status, 200)
  assert.deepEqual(result.body, { string: true, parsed: value })
})
