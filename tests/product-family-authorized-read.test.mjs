import test from 'node:test'
import assert from 'node:assert/strict'
import handleProductFamilies from '../server/admin-bff/product-families.js'
import { setActiveSessionCookies } from '../server/admin-bff/security.js'

const actor = '11111111-1111-4111-8111-111111111111'
const familyId = '22222222-2222-4222-8222-222222222222'
const response = () => ({ headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value }, end(value) { this.body = JSON.parse(value) } })

// Exercise real cookie, role, AAL2, session, handler and enrichment code.
// Only remote Auth/PostgREST transport is synthetic; no live database is used.
async function readFamily(query, family = null, products = [{ sku: 'a', name: 'Coffee a' }]) {
  const env = {
    K2_SESSION_COOKIE_KEY: Buffer.alloc(32, 7).toString('base64'),
    K2_ADMIN_BFF_REQUEST_SECRET: Buffer.alloc(32, 17).toString('base64'),
    K2_ADMIN_ORIGINS: 'https://admin.example.test', K2_DEPLOYMENT_TARGET: 'admin',
    NODE_ENV: 'production', SUPABASE_URL: 'https://transport.example.test',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic',
  }
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]))
  const originalFetch = globalThis.fetch, calls = []
  try {
    Object.assign(process.env, env)
    const now = Math.floor(Date.now() / 1000)
    const claims = { sub: actor, exp: now + 3600, iat: now, aal: 'aal2', role: 'authenticated', amr: [] }
    const token = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${Buffer.alloc(32, 1).toString('base64url')}`
    const cookies = response()
    setActiveSessionCookies(cookies, { access_token: token, refresh_token: 'synthetic-refresh', expires_at: now + 3600 }, { userId: actor, role: 'Admin' })
    const cookie = cookies.headers['set-cookie'].map(value => value.split(';')[0]).join('; ')
    globalThis.fetch = async (input, init) => {
      const url = new URL(input)
      assert.equal(url.origin, 'https://transport.example.test')
      calls.push({ path: url.pathname, body: init?.body ? JSON.parse(init.body) : null })
      let data
      if (url.pathname === '/auth/v1/user') data = { id: actor, email: 'dummy@example.test' }
      else if (url.pathname === '/rest/v1/user_profiles') data = { role: 'Admin' }
      else if (url.pathname === '/rest/v1/rpc/execute_admin_session_command_v1') data = { active: true }
      else if (url.pathname === '/rest/v1/rpc/read_admin_product_families_v1') data = { family, products }
      else if (url.pathname === '/rest/v1/products') data = products.map(product => ({ sku: product.sku, status: 'Live' }))
      else if (url.pathname === '/rest/v1/channel_listings') data = products.map(product => ({ sku: product.sku, status: 'Active', publication_status: 'published' }))
      else if (url.pathname === '/rest/v1/rpc/record_security_event_v1') data = {}
      else throw Error(`Unexpected transport ${url.pathname}`)
      return new Response(JSON.stringify(data), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const result = response()
    await handleProductFamilies({ method: 'GET', url: `/api/admin/product-families?${query}`, headers: { origin: 'https://admin.example.test', cookie } }, result)
    return { result, calls }
  } finally {
    globalThis.fetch = originalFetch
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value
    }
  }
}

test('authorized selected-SKU family GET enriches and returns current product state', async () => {
  const { result, calls } = await readFamily('skus=a')
  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body.products, [{ sku: 'a', name: 'Coffee a', status: 'Live', websiteStatus: 'Assigned · published' }])
  assert.equal(calls.filter(call => call.path === '/rest/v1/products').length, 1)
  assert.equal(calls.filter(call => call.path === '/rest/v1/channel_listings').length, 1)
})

test('authorized family-ID GET preserves an empty family for pending ungroup recovery', async () => {
  const family = { id: familyId, name: 'Coffee', version: 2, axes: [], members: [] }
  const { result, calls } = await readFamily(`familyId=${familyId}`, family, [])
  assert.equal(result.statusCode, 200)
  assert.deepEqual(result.body, { ok: true, family, products: [] })
  assert.equal(calls.filter(call => ['/rest/v1/products', '/rest/v1/channel_listings'].includes(call.path)).length, 0)
})
