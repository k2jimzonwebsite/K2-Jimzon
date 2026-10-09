import assert from 'node:assert/strict'
import { afterEach, beforeEach, test } from 'node:test'
import { createHash, createHmac } from 'node:crypto'
import handler from '../server/admin-bff/product-master.js'
import { prepareActiveSession, setPreparedActiveSessionCookies } from '../server/admin-bff/security.js'

const actor = 'b2000000-0000-4000-8000-000000000010'
const key = 'b2000000-0000-4000-8000-000000000020'
const categoryId = 'b2000000-0000-4000-8000-000000000001'
const envKeys = ['NODE_ENV', 'K2_DEPLOYMENT_TARGET', 'K2_ADMIN_ORIGINS', 'K2_SESSION_COOKIE_KEY', 'K2_ADMIN_BFF_REQUEST_SECRET', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']
let previousEnv, previousFetch, state
function response() {
  return { statusCode: 0, headers: {}, body: '', setHeader(name, value) { this.headers[name.toLowerCase()] = value }, end(value = '') { this.body = value } }
}
function request(action = 'category_policy_set') {
  const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const exp = Math.floor(Date.now() / 1000) + 3600
  const token = `${encoded({ alg: 'HS256', typ: 'JWT' })}.${encoded({ sub: actor, exp, aal: state.aal, amr: [] })}.${Buffer.alloc(32, 1).toString('base64url')}`
  const prepared = prepareActiveSession({ access_token: token, refresh_token: 'synthetic-refresh-token-only', expires_at: exp }, { userId: actor, role: 'Admin' })
  const cookies = response()
  setPreparedActiveSessionCookies(cookies, prepared)
  const payload = { categoryId, expectedVersion: '0', reason: 'Reviewed supplier policy' }
  if (action === 'category_policy_set') payload.minimumDays = 120
  return {
    method: 'POST', query: { route: 'product-master' }, socket: { remoteAddress: '127.0.0.1' },
    headers: { origin: 'https://admin.example.test', 'content-type': 'application/json',
      cookie: cookies.headers['set-cookie'].map(c => c.split(';')[0]).join('; '),
      'x-k2-csrf': prepared.csrf, 'x-k2-idempotency-key': key },
    body: { action, payload },
  }
}
beforeEach(() => {
  previousEnv = Object.fromEntries(envKeys.map(k => [k, process.env[k]]))
  previousFetch = globalThis.fetch
  Object.assign(process.env, {
    NODE_ENV: 'production', K2_DEPLOYMENT_TARGET: 'admin', K2_ADMIN_ORIGINS: 'https://admin.example.test',
    K2_SESSION_COOKIE_KEY: Buffer.alloc(32, 9).toString('base64'), K2_ADMIN_BFF_REQUEST_SECRET: Buffer.alloc(32, 1).toString('base64'),
    SUPABASE_URL: 'https://synthetic-supabase.example.test', SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable-key-only',
  })
  state = { role: 'Admin', aal: 'aal2', active: true, error: null, calls: [], unexpected: [], result: { categoryId, localMinimum: 120, version: '1', effectiveMinimum: 150 } }
  // Only external provider transport is replaced. Real SDK, encrypted cookie,
  // CSRF, authorization/session registry and maintained handler/signer execute.
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input))
    const body = init.body ? JSON.parse(init.body) : null
    state.calls.push({ path: url.pathname, body })
    const reply = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } })
    if (url.origin !== process.env.SUPABASE_URL) { state.unexpected.push(url.origin); throw new Error('UNEXPECTED_FIXTURE_DESTINATION') }
    if (url.pathname === '/auth/v1/user') return reply({ id: actor, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test', email_confirmed_at: '2026-10-04T00:00:00Z', phone: '', app_metadata: {}, user_metadata: {}, identities: [], factors: [], created_at: '2026-10-04T00:00:00Z', updated_at: '2026-10-04T00:00:00Z' })
    if (url.pathname === '/rest/v1/user_profiles') return reply({ role: state.role })
    if (url.pathname === '/rest/v1/rpc/execute_admin_session_command_v1') return reply({ active: state.active })
    if (url.pathname === '/rest/v1/rpc/record_security_event_v1') return reply({ recorded: true })
    if (url.pathname === '/rest/v1/rpc/execute_admin_product_master_command_v1') return state.error ? reply(state.error, 400) : reply(state.result)
    state.unexpected.push(url.pathname)
    throw new Error('UNEXPECTED_FIXTURE_REQUEST')
  }
})
afterEach(() => {
  globalThis.fetch = previousFetch
  for (const [k, value] of Object.entries(previousEnv)) {
    if (value === undefined) delete process.env[k]
    else process.env[k] = value
  }
  assert.deepEqual(state.unexpected, [])
})
const commandCalls = () => state.calls.filter(c => c.path.endsWith('/execute_admin_product_master_command_v1'))
for (const action of ['category_policy_set', 'category_policy_clear']) {
  test(`${action} routes normalized signed payload after authorization`, async () => {
    const req = request(action), res = response()
    req.body.payload.categoryId = categoryId.toUpperCase()
    req.body.payload.expectedVersion = 0
    req.body.payload.reason = '  Reviewed supplier policy  '
    await handler(req, res)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(JSON.parse(res.body), { ok: true, result: state.result })
    assert.equal(commandCalls().length, 1)
    const args = commandCalls()[0].body
    assert.equal(args.p_action, action)
    assert.equal(args.p_idempotency_key, key)
    const payload = JSON.parse(args.p_payload_text)
    assert.deepEqual(payload, action === 'category_policy_set'
      ? { categoryId, minimumDays: 120, expectedVersion: '0', reason: 'Reviewed supplier policy' }
      : { categoryId, expectedVersion: '0', reason: 'Reviewed supplier policy' })
    const hash = createHash('sha256').update(args.p_payload_text, 'utf8').digest('hex')
    assert.equal(args.p_signature, createHmac('sha256', Buffer.alloc(32, 1)).update([action, args.p_timestamp, args.p_nonce, actor, key, hash].join('\n'), 'utf8').digest('hex'))
    assert.ok(state.calls.find(c => c.path.endsWith('/execute_admin_session_command_v1')))
  })
}
for (const [name, mutate, status, code] of [
  ['storefront project', () => { process.env.K2_DEPLOYMENT_TARGET = 'storefront' }, 404, 'NOT_FOUND'],
  ['wrong origin', req => { req.headers.origin = 'https://wrong.example.test' }, 403, 'ORIGIN_DENIED'],
  ['missing session', req => { delete req.headers.cookie }, 401, 'SESSION_EXPIRED'],
  ['CSRF', req => { req.headers['x-k2-csrf'] = 'invalid' }, 403, 'CSRF_DENIED'],
  ['Staff', () => { state.role = 'Staff' }, 403, 'PRODUCT_ADMIN_REQUIRED'],
  ['AAL1', () => { state.aal = 'aal1' }, 401, 'MFA_REQUIRED'],
  ['revoked registry', () => { state.active = false }, 401, 'SESSION_REVOKED'],
  ['missing idempotency', req => { delete req.headers['x-k2-idempotency-key'] }, 400, 'IDEMPOTENCY_KEY_REQUIRED'],
  ['malformed set', req => { req.body.payload.minimumDays = null }, 400, 'PRODUCT_COMMAND_INVALID'],
]) {
  test(`${name} refusal prevents category RPC`, async () => {
    // AAL is encoded when constructing the synthetic auth token.
    if (name === 'AAL1') state.aal = 'aal1'
    const req = request(), res = response()
    mutate(req)
    await handler(req, res)
    assert.equal(res.statusCode, status)
    assert.equal(JSON.parse(res.body).error.code, code)
    assert.equal(commandCalls().length, 0)
  })
}
for (const [nativeCode, message, status, code, retry] of [
  ['40001', 'K2_CATEGORY_POLICY_VERSION_CONFLICT', 409, 'CATEGORY_POLICY_VERSION_CONFLICT'],
  ['23514', 'K2_CATEGORY_POLICY_TAXONOMY_INVALID', 409, 'CATEGORY_POLICY_TAXONOMY_INVALID'],
  ['22023', 'K2_CATEGORY_POLICY_INPUT_INVALID', 400, 'CATEGORY_POLICY_INVALID'],
  ['55000', 'K2_CATEGORY_POLICY_VERSION_EXHAUSTED', 409, 'CATEGORY_POLICY_VERSION_EXHAUSTED'],
  ['55P03', 'canceling statement due to lock timeout', 503, 'CATEGORY_POLICY_BUSY', '1'],
  ['57014', 'canceling statement due to statement timeout', 503, 'CATEGORY_POLICY_BUSY', '1'],
  ['55000', 'K2_CATEGORY_POLICY_NOT_CONFIGURED', 503, 'CATEGORY_POLICY_UNAVAILABLE'],
  ['XX000', 'private SQL details and secrets must not escape', 503, 'PRODUCT_COMMAND_UNAVAILABLE'],
]) {
  test(`category RPC ${message} returns safe ${code}`, async () => {
    state.error = { code: nativeCode, message, details: 'private policy details', hint: 'private internals' }
    const res = response()
    await handler(request(), res)
    assert.equal(res.statusCode, status)
    assert.deepEqual(JSON.parse(res.body), { error: { code } })
    assert.equal(res.headers['retry-after'], retry)
    assert.equal(commandCalls().length, 1)
  })
}

test('clear version conflict uses the same category response', async () => {
  state.error = { code: '40001', message: 'K2_CATEGORY_POLICY_VERSION_CONFLICT' }
  const res = response()
  await handler(request('category_policy_clear'), res)
  assert.equal(res.statusCode, 409)
  assert.deepEqual(JSON.parse(res.body), { error: { code: 'CATEGORY_POLICY_VERSION_CONFLICT' } })
})

test('existing product command timeout keeps its unavailable response', async () => {
  state.error = { code: '55P03', message: 'canceling statement due to lock timeout' }
  const req = request(), res = response()
  req.body = { action: 'status', payload: { skus: ['K2-1'], status: 'Draft', reason: 'Reviewed product status' } }
  await handler(req, res)
  assert.equal(res.statusCode, 503)
  assert.deepEqual(JSON.parse(res.body), { error: { code: 'PRODUCT_COMMAND_UNAVAILABLE' } })
  assert.equal(res.headers['retry-after'], undefined)
})

test('existing idempotency conflict stays distinct for category actions', async () => {
  state.error = { code: '22023', message: 'K2_ADMIN_IDEMPOTENCY_CONFLICT' }
  const res = response()
  await handler(request(), res)
  assert.equal(res.statusCode, 409)
  assert.deepEqual(JSON.parse(res.body), { error: { code: 'IDEMPOTENCY_CONFLICT' } })
})
