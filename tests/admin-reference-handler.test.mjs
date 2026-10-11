import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, createHmac } from 'node:crypto'
import handleReferences from '../server/admin-bff/references.js'
import { setActiveSessionCookies } from '../server/admin-bff/security.js'

const actor = '11111111-1111-4111-8111-111111111111'
const key = '22222222-2222-4222-8222-222222222222'
const referenceId = '33333333-3333-4333-8333-333333333333'
const secret = Buffer.alloc(32, 17)
const payload = { kind: 'brand', name: '  Test\u00a0Brand ', parentId: null, reason: 'Catalog maintenance' }
const saved = { reference: { kind: 'brand', id: referenceId, name: 'Test Brand', parentId: null }, reused: false }

function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key.toLowerCase()] = value }, end(value) { this.body = JSON.parse(value) } }
}

// Stub only remote Auth/PostgREST transport; real cookie, authorization, session
// registry, role gate, signing and handler run. This is not native/live proof.
async function run(options = {}) {
  const environment = {
    K2_SESSION_COOKIE_KEY: Buffer.alloc(32, 7).toString('base64'),
    K2_ADMIN_BFF_REQUEST_SECRET: secret.toString('base64'),
    K2_ADMIN_ORIGINS: 'https://admin.example.test', K2_DEPLOYMENT_TARGET: 'admin',
    NODE_ENV: 'production', SUPABASE_URL: 'https://transport.example.test',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic',
  }
  const previous = Object.fromEntries(Object.keys(environment).map(name => [name, process.env[name]]))
  const originalFetch = globalThis.fetch
  const calls = []
  try {
    Object.assign(process.env, environment)
    const now = Math.floor(Date.now() / 1000)
    const claims = { sub: actor, exp: now + 3600, iat: now, aal: options.aal || 'aal2', role: 'authenticated', amr: [] }
    const token = `${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${Buffer.alloc(32, 1).toString('base64url')}`
    const cookies = response()
    setActiveSessionCookies(cookies, { access_token: token, refresh_token: 'synthetic-refresh', expires_at: now + 3600 }, { userId: actor, role: 'Admin' })
    const cookieHeader = cookies.headers['set-cookie'].map(value => value.split(';')[0]).join('; ')
    const csrf = decodeURIComponent(cookies.headers['set-cookie'][1].split(';')[0].split('=').slice(1).join('='))
    globalThis.fetch = async (input, init) => {
      const url = new URL(input)
      assert.equal(url.origin, 'https://transport.example.test', 'unexpected transport target')
      const request = init?.body ? JSON.parse(init.body) : null
      calls.push({ path: url.pathname, request })
      let result
      let status = 200
      if (url.pathname === '/auth/v1/user') result = { id: actor, email: 'dummy@example.test' }
      else if (url.pathname === '/rest/v1/user_profiles') result = { role: options.role || 'Admin' }
      else if (url.pathname === '/rest/v1/rpc/execute_admin_session_command_v1') result = { active: options.active !== false }
      else if (url.pathname === '/rest/v1/rpc/execute_admin_reference_command_v1') {
        result = options.error || saved
        status = options.error ? 409 : 200
      } else if (url.pathname === '/rest/v1/brands') {
        result = options.current === undefined ? { id: referenceId, name: 'Test Brand' } : options.current
        status = options.currentError ? 503 : 200
      } else if (url.pathname === '/rest/v1/rpc/record_security_event_v1') result = {}
      else throw new Error(`Unexpected transport path ${url.pathname}`)
      return new Response(JSON.stringify(result), { status, headers: { 'content-type': 'application/json' } })
    }
    const res = response()
    await handleReferences({ method: 'POST', body: payload, headers: {
      origin: 'https://admin.example.test', cookie: cookieHeader, 'content-type': 'application/json',
      'x-k2-csrf': options.csrf === false ? 'wrong' : csrf, 'x-k2-idempotency-key': key,
    } }, res)
    return { res, calls }
  } finally {
    globalThis.fetch = originalFetch
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
}

test('current Staff role cannot create even when cookie claims Admin', async () => {
  const { res, calls } = await run({ role: 'Staff' })
  assert.equal(res.statusCode, 403, JSON.stringify({ body: res.body, paths: calls.map(call => call.path) }))
  assert.equal(res.body.error.code, 'REFERENCE_ADMIN_REQUIRED')
  assert.ok(!calls.some(call => call.path.endsWith('/execute_admin_reference_command_v1')))
})

test('Admin and SuperAdmin send one correctly signed exact command', async () => {
  for (const role of ['Admin', 'SuperAdmin']) {
    const { res, calls } = await run({ role })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.result, saved)
    assert.equal(res.body.currentReference.status, 'available')
    const commands = calls.filter(call => call.path.endsWith('/execute_admin_reference_command_v1'))
    assert.equal(commands.length, 1)
    const signed = commands[0].request
    assert.equal(signed.p_action, 'reference_create')
    assert.equal(signed.p_idempotency_key, key)
    assert.equal(signed.p_payload_text, JSON.stringify(payload))
    const hash = createHash('sha256').update(signed.p_payload_text).digest('hex')
    const message = [signed.p_action, signed.p_timestamp, signed.p_nonce, actor, key, hash].join('\n')
    assert.equal(signed.p_signature, createHmac('sha256', secret).update(message).digest('hex'))
  }
})

test('CSRF, current AAL2 and registry refusal prevent creation dispatch', async () => {
  for (const options of [{ csrf: false }, { aal: 'aal1' }, { active: false }]) {
    const { res, calls } = await run(options)
    assert.ok([401, 403].includes(res.statusCode), JSON.stringify(res.body))
    assert.ok(!calls.some(call => call.path.endsWith('/execute_admin_reference_command_v1')))
  }
})

test('historical receipt is shown separately from changed or missing current reference', async () => {
  for (const [current, status] of [[{ id: referenceId, name: 'Renamed' }, 'changed'], [null, 'missing']]) {
    const { res } = await run({ current })
    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.body.result, saved)
    assert.equal(res.body.currentReference.status, status)
  }
})

test('committed receipt survives unavailable current readback', async () => {
  const { res } = await run({ currentError: true })
  assert.equal(res.statusCode, 200)
  assert.deepEqual(res.body.result, saved)
  assert.equal(res.body.currentReference.status, 'unavailable')
})

test('unknown command failure hides provider details and retains retry classification', async () => {
  const { res } = await run({ error: { code: '55000', message: 'K2_ADMIN_COMMAND_IN_PROGRESS private detail' } })
  assert.equal(res.statusCode, 409)
  assert.deepEqual(res.body, { error: { code: 'COMMAND_IN_PROGRESS' } })
  assert.equal(res.headers['retry-after'], '1')
})
