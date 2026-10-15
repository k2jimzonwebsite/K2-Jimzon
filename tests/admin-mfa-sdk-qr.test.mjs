import test from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { startPendingMfaEnrollment, verifyPendingMfaEnrollment } from '../server/admin-bff/mfa-enrollment.js'

// Supabase Auth uses goqrsvg: one SVG rectangle for every black/white module,
// rather than a compact path. Synthetic modules preserve that wire-size shape.
function providerQrSvg(width = 57) {
  const rectangles = Array.from({ length: width * width }, (_, index) =>
    `<rect x="${12 + index % width * 3}" y="${12 + Math.floor(index / width) * 3}" width="3" height="3" style="fill:${index % 2 ? 'black' : 'white'};stroke:none"/>`).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * 3 + 24}" height="${width * 3 + 24}">${rectangles}</svg>`
}

test('pending enrollment accepts the installed Supabase SDK QR format without cancelling the factor', async () => {
  const factorId = '40000000-0000-4000-8000-000000000004'
  const svg = providerQrSvg()
  assert.ok(svg.length > 32 * 1024, 'provider-style QR must exercise the real payload size')
  const sdk = createClient('https://fixture.supabase.co', 'fixture-publishable-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, options) => {
      assert.equal(new URL(url).pathname, '/auth/v1/factors')
      assert.equal(options.method, 'POST')
      return new Response(JSON.stringify({ id: factorId, type: 'totp', totp: {
        qr_code: svg, secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/fixture',
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  let cancellations = 0
  const client = { auth: { mfa: {
    listFactors: async () => ({ data: { totp: [] }, error: null }),
    enroll: sdk.auth.mfa.enroll,
    unenroll: async () => { cancellations++; return { error: null } },
  } } }
  try {
    const result = await startPendingMfaEnrollment(client)
    assert.equal(result.qr, 'data:image/svg+xml;utf-8,' + svg)
    assert.equal(result.factorId, factorId)
    assert.equal(cancellations, 0)
  } finally { sdk.auth.stopAutoRefresh() }
})

test('pending enrollment bounds oversized SVG data and cancels only the new unverified factor', async () => {
  let cancellations = 0
  const client = { auth: { mfa: {
    listFactors: async () => ({ data: { all: [] }, error: null }),
    enroll: async () => ({ data: { id: '40000000-0000-4000-8000-000000000004',
      totp: { qr_code: 'data:image/svg+xml;utf-8,' + ' '.repeat(1024 * 1024), secret: 'JBSWY3DPEHPK3PXP' } }, error: null }),
    unenroll: async () => { cancellations++; return { error: null } },
  } } }
  await assert.rejects(startPendingMfaEnrollment(client), /MFA_ENROLLMENT_UNAVAILABLE/)
  assert.equal(cancellations, 1)
})

test('pending enrollment preserves an already verified authenticator without creating or deleting factors', async () => {
  const client = { auth: { mfa: {
    listFactors: async () => ({ data: { all: [{ factor_type: 'totp', status: 'verified' }] }, error: null }),
    enroll: async () => { assert.fail('must not create a replacement') },
    unenroll: async () => { assert.fail('must not remove the existing factor') },
  } } }
  await assert.rejects(startPendingMfaEnrollment(client), /MFA_ALREADY_ENROLLED/)
})

test('pending enrollment still rejects a non-SVG QR response and cancels its unverified factor', async () => {
  let cancellations = 0
  const client = { auth: { mfa: {
    listFactors: async () => ({ data: { totp: [] }, error: null }),
    enroll: async () => ({ data: { id: '40000000-0000-4000-8000-000000000004',
      totp: { qr_code: 'data:text/html;utf-8,<script/>', secret: 'JBSWY3DPEHPK3PXP' } }, error: null }),
    unenroll: async () => { cancellations++; return { error: null } },
  } } }
  await assert.rejects(startPendingMfaEnrollment(client), /MFA_ENROLLMENT_UNAVAILABLE/)
  assert.equal(cancellations, 1)
})

test('installed SDK completes password, enrollment, challenge and AAL2 verification against the provider protocol fixture', async () => {
  const factorId = '40000000-0000-4000-8000-000000000004'
  const userId = '10000000-0000-4000-8000-000000000001'
  let factors = []
  const calls = []
  const token = aal => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ sub: userId,
    exp: Math.floor(Date.now() / 1000) + 3600, aal, amr: [] })).toString('base64url'), 'fixture'].join('.')
  const session = aal => ({ access_token: token(aal), refresh_token: 'fixture-refresh',
    token_type: 'bearer', expires_in: 3600, user: { id: userId, factors } })
  const sdk = createClient('https://fixture.supabase.co', 'fixture-publishable-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, options) => {
      const pathname = new URL(url).pathname
      calls.push([options.method, pathname])
      let data
      if (pathname === '/auth/v1/token') data = session('aal1')
      else if (pathname === '/auth/v1/user') data = { id: userId, factors }
      else if (pathname === '/auth/v1/factors') {
        factors = [{ id: factorId, factor_type: 'totp', status: 'unverified' }]
        data = { id: factorId, type: 'totp', totp: {
          qr_code: '<svg xmlns="http://www.w3.org/2000/svg"/>', secret: 'JBSWY3DPEHPK3PXP',
        } }
      } else if (pathname.endsWith('/challenge')) data = { id: 'fixture-challenge' }
      else if (pathname.endsWith('/verify')) {
        assert.equal(JSON.parse(options.body).code, '123456')
        factors[0].status = 'verified'
        data = session('aal2')
      } else throw new Error('Unexpected SDK request: ' + pathname)
      return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } },
  })
  try {
    const login = await sdk.auth.signInWithPassword({ email: 'fixture@example.test', password: 'fixture-password' })
    assert.equal(login.error, null)
    assert.equal((await sdk.auth.mfa.getAuthenticatorAssuranceLevel()).data.currentLevel, 'aal1')
    const enrollment = await startPendingMfaEnrollment(sdk)
    assert.ok(enrollment.qr.startsWith('data:image/svg+xml;utf-8,'))
    const verified = await verifyPendingMfaEnrollment(sdk, enrollment.factorId, '123456')
    assert.equal(verified.user.id, userId)
    assert.equal((await sdk.auth.mfa.getAuthenticatorAssuranceLevel()).data.currentLevel, 'aal2')
    assert.ok(calls.some(([method, path]) => method === 'POST' && path.endsWith('/challenge')))
    assert.ok(calls.some(([method, path]) => method === 'POST' && path.endsWith('/verify')))
  } finally { sdk.auth.stopAutoRefresh() }
})
