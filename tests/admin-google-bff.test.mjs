import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createAdminGoogleHandler } from '../server/admin-bff/google-auth.js'
import { setAdminOAuthCookie, readAdminOAuthCookie } from '../server/admin-bff/security.js'
import { ADMIN_BFF_ROUTE_CONTROLS } from '../server/admin-bff/router.js'

const origin = 'https://admin.k2jimzon.com'
let peer = 0
beforeEach(() => {
  process.env.K2_ADMIN_ORIGINS = origin
  process.env.K2_SESSION_COOKIE_KEY = Buffer.alloc(32, 3).toString('base64')
  process.env.SUPABASE_URL = 'https://fixture.supabase.co'
  process.env.SUPABASE_PUBLISHABLE_KEY = 'fixture-public-key'
  process.env.K2_COOKIE_SECURE = 'true'
})
function response() {
  const headers = {}
  return { headers, setHeader: (key, value) => { headers[key] = value }, getHeader: key => headers[key],
    end(value) { this.body = value ? JSON.parse(value) : null } }
}
function request(body, cookie = '') {
  return { method: 'POST', headers: { origin, 'content-type': 'application/json', cookie,
    'x-forwarded-for': `192.0.2.${++peer}` }, body }
}
function deps(extra = {}) {
  return { consumeAdminPreauthRate: async () => ({ allowed: true }), verifyBotChallenge: async () => true, recordSecurityEvent: async () => {}, ...extra }
}
async function start(extra = {}) {
  const res = response()
  await createAdminGoogleHandler('start', deps(extra))(request({ botToken: 'fixture-verified-token' }), res)
  return res
}
function cookieValue(res) { return res.headers['Set-Cookie'].split(';')[0] }
function fixture(pending) {
  const calls = []
  const session = { access_token: 'fixture-access-token-with-enough-length', refresh_token: 'fixture-refresh-token', expires_at: Math.floor(Date.now() / 1000) + 3600 }
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'staff@example.test', email_confirmed_at: '2026-01-01' }
  const client = { auth: {
    exchangeCodeForSession: async () => { calls.push('exchange'); return { data: { user, session } } },
    signOut: async () => { calls.push('signout') },
    mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal2' } }) },
  } }
  return { calls, client, session, user, overrides: deps({
    createServerSupabase: options => {
      assert.equal(options.flowType, 'pkce')
      assert.equal(options.storage.getItem('k2-admin-oauth-code-verifier'), pending.verifier)
      return client
    },
    requireStaffIdentity: async () => ({ userId: user.id, email: user.email, role: 'Staff' }),
    registerAdminSession: async () => { calls.push('register') },
  }) }
}

test('actual Supabase SDK generates PKCE with encrypted browser-bound verifier and exact K2 return route', async () => {
  const res = await start()
  assert.equal(res.statusCode, 200)
  const url = new URL(res.body.url)
  assert.equal(url.origin, 'https://fixture.supabase.co')
  assert.equal(url.searchParams.get('provider'), 'google')
  assert.equal(url.searchParams.get('code_challenge_method'), 's256')
  assert.ok(url.searchParams.get('code_challenge'))
  const pending = readAdminOAuthCookie(request({}, cookieValue(res)))
  assert.equal(new URL(url.searchParams.get('redirect_to')).pathname, '/admin-portal-k2-secure')
  assert.equal(new URL(url.searchParams.get('redirect_to')).searchParams.get('google'), pending.state)
  assert.match(res.headers['Set-Cookie'], /HttpOnly/)
  assert.match(res.headers['Set-Cookie'], /Secure/)
  assert.match(res.headers['Set-Cookie'], /SameSite=Lax/)
  assert.ok(!JSON.stringify(res.body).includes(pending.verifier))
})

for (const kind of ['wrong-origin', 'no-cookie', 'altered-cookie', 'wrong-state', 'expired', 'extra-fields']) {
  test(`Google callback rejects ${kind} before provider exchange`, async () => {
    const initial = await start()
    let cookie = cookieValue(initial)
    const pending = readAdminOAuthCookie(request({}, cookie))
    const fx = fixture(pending)
    const body = { code: 'one-time-provider-code', state: pending.state }
    if (kind === 'no-cookie') cookie = ''
    if (kind === 'altered-cookie') cookie += 'broken'
    if (kind === 'wrong-state') body.state = 'wrong-state'
    if (kind === 'extra-fields') body.redirectTo = 'https://evil.test'
    if (kind === 'expired') {
      const expired = response()
      setAdminOAuthCookie(expired, { ...pending, createdAt: Date.now() - 600001 })
      cookie = cookieValue(expired)
    }
    const req = request(body, cookie)
    if (kind === 'wrong-origin') req.headers.origin = 'https://evil.test'
    const res = response()
    await createAdminGoogleHandler('complete', fx.overrides)(req, res)
    assert.ok([400, 403].includes(res.statusCode))
    assert.deepEqual(fx.calls, [])
  })
}

test('Google AAL1 session stays pending for the existing authenticator challenge without active session registration', async () => {
  const initial = await start()
  const pending = readAdminOAuthCookie(request({}, cookieValue(initial)))
  const fx = fixture(pending)
  const res = response()
  await createAdminGoogleHandler('complete', fx.overrides)(request({ code: 'one-time-provider-code', state: pending.state }, cookieValue(initial)), res)
  assert.equal(res.statusCode, 202)
  assert.equal(res.body.code, 'MFA_REQUIRED')
  assert.deepEqual(fx.calls, ['exchange'])
  assert.ok(res.headers['Set-Cookie'].some(value => value.startsWith('k2_admin_pending=')))
  assert.ok(!JSON.stringify(res.body).includes(fx.session.access_token))
})

for (const kind of ['non-staff', 'unverified-email', 'enrollment', 'aal2', 'registry-failed']) {
  test(`Google callback ${kind} retains staff/AAL2/registry authority`, async () => {
    const initial = await start()
    const pending = readAdminOAuthCookie(request({}, cookieValue(initial)))
    const fx = fixture(pending)
    if (kind === 'non-staff') fx.overrides.requireStaffIdentity = async () => null
    if (kind === 'unverified-email') fx.user.email_confirmed_at = null
    if (kind === 'enrollment') fx.client.auth.mfa.getAuthenticatorAssuranceLevel = async () => ({ data: { currentLevel: 'aal1', nextLevel: 'aal1' } })
    if (kind === 'aal2' || kind === 'registry-failed') fx.client.auth.mfa.getAuthenticatorAssuranceLevel = async () => ({ data: { currentLevel: 'aal2', nextLevel: 'aal2' } })
    if (kind === 'registry-failed') fx.overrides.registerAdminSession = async () => { throw new Error('unavailable') }
    const res = response()
    await createAdminGoogleHandler('complete', fx.overrides)(request({ code: 'one-time-provider-code', state: pending.state }, cookieValue(initial)), res)
    assert.equal(res.statusCode, { 'non-staff': 403, 'unverified-email': 401, enrollment: 202, aal2: 200, 'registry-failed': 503 }[kind])
    if (kind === 'enrollment') assert.equal(res.body.code, 'MFA_ENROLLMENT_REQUIRED')
    if (kind === 'aal2') {
      assert.deepEqual(fx.calls, ['exchange', 'register'])
      assert.ok(res.headers['Set-Cookie'].some(value => value.startsWith('k2_admin_session=')))
    } else assert.ok(!JSON.stringify(res.headers['Set-Cookie'] || []).includes('k2_admin_session='))
    assert.ok(!JSON.stringify(res.body).includes(fx.session.refresh_token))
  })
}

test('Google start fails closed for missing bot verification or unavailable durable budget', async () => {
  let called = false
  const denied = await start({ verifyBotChallenge: async () => false })
  assert.equal(denied.statusCode, 403)
  const limited = await start({ consumeAdminPreauthRate: async () => ({ allowed: false, retryAfter: 60 }), verifyBotChallenge: async () => { called = true; return true } })
  assert.equal(limited.statusCode, 429)
  assert.equal(called, false)
  const unavailable = await start({ consumeAdminPreauthRate: async () => { throw new Error('unavailable') } })
  assert.equal(unavailable.statusCode, 503)
})

test('consolidated router advertises both Google routes with origin, PKCE/bot and durable budget guards', () => {
  assert.equal(ADMIN_BFF_ROUTE_CONTROLS['auth/google/start'].method, 'POST')
  assert.equal(ADMIN_BFF_ROUTE_CONTROLS['auth/google/start'].bot, true)
  assert.equal(ADMIN_BFF_ROUTE_CONTROLS['auth/google/complete'].identity, 'pkce-cookie')
  assert.equal(ADMIN_BFF_ROUTE_CONTROLS['auth/google/complete'].origin, true)
})
