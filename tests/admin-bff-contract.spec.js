import { expect, test } from '@playwright/test'
import { createHash, createHmac } from 'node:crypto'
import loginHandler from '../prepared-api/admin/auth/login.js'
import mfaHandler from '../prepared-api/admin/auth/mfa.js'
import passwordRecoveryRequestHandler from '../prepared-api/admin/auth/password-recovery/request.js'
import passwordRecoveryVerifyHandler from '../prepared-api/admin/auth/password-recovery/verify.js'
import passwordRecoveryCompleteHandler from '../prepared-api/admin/auth/password-recovery/complete.js'
import {
  isPasswordRecoveryConfigured, passwordRecoveryCallbackUrl, passwordRecoveryResultUrl,
  validatePasswordRecoveryCallback, validatePasswordRecoveryCompletion, validatePasswordRecoveryRequest,
} from '../server/admin-bff/password-recovery.js'
import {
  readRecoverySession, setPendingCookie, setRecoverySessionCookies, verifyRecoveryCsrf,
} from '../server/admin-bff/security.js'
import {
  consumeAdminPreauthRate, signedAdminPreauthRateArguments,
} from '../server/admin-bff/preauth-rate.js'
import {
  startPendingMfaEnrollment, validatePendingMfaCommand, verifyPendingMfaEnrollment,
} from '../server/admin-bff/mfa-enrollment.js'
import {
  completeActiveMfaReplacement, inspectActiveMfaReplacement, isMfaReplacementConfigured,
  mfaFactorFingerprint, recordMfaReplacementEvent, startActiveMfaReplacement,
  validateMfaReplacementCommand,
} from '../server/admin-bff/mfa-replacement.js'
import logoutHandler from '../prepared-api/admin/auth/logout.js'
import sessionHandler from '../prepared-api/admin/session.js'
import sessionsHandler from '../prepared-api/admin/sessions.js'
import sessionsRevokeHandler from '../prepared-api/admin/sessions/revoke.js'
import overviewHandler, { readOverviewData } from '../prepared-api/admin/overview.js'
import productsHandler, { readAdminProducts } from '../prepared-api/admin/products.js'
import productMediaHandler from '../prepared-api/admin/product-media.js'
import productMediaAssignHandler from '../prepared-api/admin/product-media/assign.js'
import productMediaOrphansHandler from '../prepared-api/admin/product-media/orphans.js'
import { validateProductMediaAssignment, validateProductMediaOrphanCleanup } from '../server/admin-bff/product-media.js'
import productMasterHandler from '../prepared-api/admin/product-master.js'
import { validateProductMasterCommand } from '../server/admin-bff/product-master.js'
import globeCmsHandler from '../prepared-api/admin/globe-cms.js'
import { validateGlobeReviewCommand } from '../server/admin-bff/globe-cms.js'
import procurementHandler from '../prepared-api/admin/procurement.js'
import { validateSupplierCreate } from '../server/admin-bff/procurement.js'
import channelsHandler from '../prepared-api/admin/channels.js'
import { validateInternalChannelVerification } from '../server/admin-bff/channels.js'
import staffAccessHandler from '../prepared-api/admin/staff-access.js'
import { validateStaffAccessCommand } from '../server/admin-bff/staff-access.js'
import staffInvitationHandler from '../prepared-api/admin/staff-access/invite.js'
import mfaReplacementHandler from '../prepared-api/admin/staff-access/mfa-replacement.js'
import {
  forwardStaffInvitation, isStaffInvitationForwardingConfigured, validateStaffInvitation,
} from '../server/admin-bff/staff-invitations.js'
import systemReadinessHandler from '../prepared-api/admin/system-readiness.js'
import fulfillmentHandler from '../prepared-api/admin/fulfillment.js'
import confirmHandler from '../prepared-api/admin/fulfillment/confirm.js'
import { validateFulfillmentCommand } from '../server/admin-bff/fulfillment.js'
import inboxHandler from '../prepared-api/admin/inbox.js'
import internalNoteHandler from '../prepared-api/admin/inbox/internal-note.js'
import { validateInboxCommand } from '../server/admin-bff/inbox.js'
import pasabuyHandler from '../prepared-api/admin/pasabuy.js'
import pasabuyQuoteHandler from '../prepared-api/admin/pasabuy/quote.js'
import { validatePasabuyCommand } from '../server/admin-bff/pasabuy.js'
import intakeSessionHandler from '../prepared-api/admin/product-intake/session.js'
import intakeDraftHandler from '../prepared-api/admin/product-intake/draft.js'
import {
  decodeEvidenceImage,
  MAX_EVIDENCE_BYTES,
  recordPendingEvidenceCleanup,
  reconcilePendingEvidenceCleanup,
  removeUnregisteredEvidence,
  validateProductIntakeCommand,
} from '../server/admin-bff/product-intake.js'
import consignmentsHandler from '../prepared-api/admin/consignments.js'
import consignmentScanHandler from '../prepared-api/admin/consignments/scan.js'
import { validateConsignmentCommand } from '../server/admin-bff/consignments.js'
import lotsHandler from '../prepared-api/admin/lots.js'
import lotReconcileHandler from '../prepared-api/admin/lots/reconcile.js'
import { validateLotCommand } from '../server/admin-bff/lots.js'
import couponsHandler from '../prepared-api/admin/coupons.js'
import couponCreateHandler from '../prepared-api/admin/coupons/create.js'
import { validateCouponCommand } from '../server/admin-bff/coupons.js'
import customersHandler from '../prepared-api/admin/customers.js'
import { readAdminCustomers } from '../server/admin-bff/customers.js'
import wholesaleInquiriesHandler from '../prepared-api/admin/wholesale-inquiries.js'
import wholesaleInquiryReviewHandler from '../prepared-api/admin/wholesale-inquiries/review.js'
import { readAdminWholesaleInquiries, validateWholesaleInquiryReview } from '../server/admin-bff/wholesale-inquiries.js'
import adminBffRouter, {
  ADMIN_BFF_ROUTES, ADMIN_BFF_ROUTE_CONTROLS, extractAdminRoute,
} from '../server/admin-bff/router.js'
import adminEntrypoint from '../api/admin/index.js'
import { boundedAdminCommandRoute } from '../src/services/adminBffService.js'
import {
  executeAdminSessionCommand, validateAdminSessionCommand,
} from '../server/admin-bff/sessions.js'
import sharp from 'sharp'
import { readFile, readdir } from 'node:fs/promises'

function response() {
  const headers = new Map()
  return {
    headers,
    statusCode: 0,
    body: '',
    setHeader(name, value) { headers.set(name.toLowerCase(), value) },
    end(value = '') { this.body = value },
  }
}

function request(method, overrides = {}) {
  return {
    method,
    headers: { origin: 'https://admin.example.test', 'content-type': 'application/json' },
    socket: { remoteAddress: '127.0.0.1' },
    body: {},
    ...overrides,
  }
}

test.beforeEach(() => {
  process.env.NODE_ENV = 'production'
  process.env.K2_DEPLOYMENT_TARGET = 'admin'
  process.env.K2_ADMIN_BFF_ENABLED = 'true'
  process.env.K2_ADMIN_ORIGINS = 'https://admin.example.test'
  process.env.K2_SESSION_COOKIE_KEY = Buffer.alloc(32, 9).toString('base64')
  delete process.env.K2_ADMIN_PASSWORD_RECOVERY_ENABLED
  delete process.env.K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL
})

test('admin API fails closed on the storefront project and wrong origin', async () => {
  process.env.K2_DEPLOYMENT_TARGET = 'storefront'
  const storefront = response()
  await loginHandler(request('POST'), storefront)
  expect(storefront.statusCode).toBe(404)
  expect(JSON.parse(storefront.body).error.code).toBe('NOT_FOUND')

  process.env.K2_DEPLOYMENT_TARGET = 'admin'
  const crossSite = response()
  await loginHandler(request('POST', { headers: { origin: 'https://evil.example', 'content-type': 'application/json' } }), crossSite)
  expect(crossSite.statusCode).toBe(403)
  expect(JSON.parse(crossSite.body).error.code).toBe('ORIGIN_DENIED')
})

test('admin auth endpoints enforce method and pending/session boundaries', async () => {
  const wrongMethod = response()
  await loginHandler(request('GET'), wrongMethod)
  expect(wrongMethod.statusCode).toBe(405)
  expect(wrongMethod.headers.get('allow')).toBe('POST')

  const noPending = response()
  await mfaHandler(request('POST'), noPending)
  expect(noPending.statusCode).toBe(401)
  expect(JSON.parse(noPending.body).error.code).toBe('MFA_SESSION_EXPIRED')

  const noSession = response()
  await sessionHandler(request('GET', { headers: {} }), noSession)
  expect(noSession.statusCode).toBe(401)
  expect(JSON.parse(noSession.body).error.code).toBe('SESSION_EXPIRED')
  expect(Array.isArray(noSession.headers.get('set-cookie'))).toBe(true)

  const logoutWithoutCsrf = response()
  await logoutHandler(request('POST'), logoutWithoutCsrf)
  expect(logoutWithoutCsrf.statusCode).toBe(403)
  expect(JSON.parse(logoutWithoutCsrf.body).error.code).toBe('CSRF_DENIED')
})

test('admin overview is fixed-schema, session-gated, and reports partial data safely', async () => {
  const wrongRange = response()
  await overviewHandler(request('GET', { query: { range: '365' } }), wrongRange)
  expect(wrongRange.statusCode).toBe(400)
  expect(JSON.parse(wrongRange.body).error.code).toBe('INVALID_RANGE')

  const noSession = response()
  await overviewHandler(request('GET', { query: { range: '30' } }), noSession)
  expect(noSession.statusCode).toBe(401)
  expect(JSON.parse(noSession.body).error.code).toBe('SESSION_EXPIRED')

  const queued = [
    { data: [{ id: 'order-1' }], error: null },
    { data: null, count: 2, error: null },
    { data: [], error: null },
    { data: [], error: { message: 'private provider detail' } },
    { data: [], error: null },
    { data: [], error: null },
    { data: [], error: null },
    { data: [], error: null },
  ]
  const client = {
    from() {
      const result = queued.shift()
      const builder = {
        select() { return builder },
        gte() { return Promise.resolve(result) },
        eq() { return Promise.resolve(result) },
        then(resolve, reject) { return Promise.resolve(result).then(resolve, reject) },
      }
      return builder
    },
  }
  const result = await readOverviewData(client, 30)
  expect(result.data.orders).toEqual([{ id: 'order-1' }])
  expect(result.data.orderBacklog).toBe(2)
  expect(result.unavailable).toEqual([{ key: 'batches', code: 'QUERY_UNAVAILABLE' }])
  expect(JSON.stringify(result)).not.toContain('private provider detail')
})

test('prepared admin client uses same-origin cookies and never receives Supabase tokens', async () => {
  const service = await readFile(new URL('../src/services/adminBffService.js', import.meta.url), 'utf8')
  const runtime = await readFile(new URL('../src/context/useAdminAuthRuntime.js', import.meta.url), 'utf8')
  expect(service).toContain("credentials: 'include'")
  expect(service).toContain("'/api/admin/auth/login'")
  expect(service).toContain("'/api/admin/auth/mfa'")
  expect(service).toContain("'/api/admin/auth/logout'")
  expect(service).not.toMatch(/access_token|refresh_token|SUPABASE_SERVICE_ROLE|SUPABASE_SECRET_KEY/)
  expect(runtime).toContain('adminBffEnabled()')
  expect(runtime).toContain('loginAdminBff')
  expect(runtime).toContain('loginAdminBff({ email: email.trim(), password, botToken })')
  expect(service).toContain('body: { email, botToken }')
  expect(runtime).toContain('getAdminSessionBff')
})

test('secure Admin does not mount the shared direct-browser Globe Auth and data provider', async () => {
  const [adminApp, storefrontApp, globeProvider] = await Promise.all([
    readFile(new URL('../src/AdminApp.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/StorefrontApp.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/data/globeCms.jsx', import.meta.url), 'utf8'),
  ])

  expect(adminApp).toContain('<GlobeCmsProvider secureAdmin={adminBffEnabled()}>')
  expect(globeProvider).toContain('function SecureAdminGlobeCmsProvider')
  expect(globeProvider).toContain('if (secureAdmin) return <SecureAdminGlobeCmsProvider')
  expect(storefrontApp).toContain('<GlobeCmsProvider>')
  expect(storefrontApp).not.toContain('secureAdmin=')
})

test('staff password recovery is server-only, callback-bounded, and leaves provider tokens out of browser code', async () => {
  const router = await readFile(new URL('../server/admin-bff/router.js', import.meta.url), 'utf8')
  const security = await readFile(new URL('../server/admin-bff/security.js', import.meta.url), 'utf8')
  const service = await readFile(new URL('../src/services/adminBffService.js', import.meta.url), 'utf8')
  const runtime = await readFile(new URL('../src/context/useAdminAuthRuntime.js', import.meta.url), 'utf8')
  const requestHandler = await readFile(new URL('../prepared-api/admin/auth/password-recovery/request.js', import.meta.url), 'utf8')
  const verifyHandler = await readFile(new URL('../prepared-api/admin/auth/password-recovery/verify.js', import.meta.url), 'utf8')
  const completeHandler = await readFile(new URL('../prepared-api/admin/auth/password-recovery/complete.js', import.meta.url), 'utf8')

  expect(router).toContain("'auth/password-recovery/request'")
  expect(router).toContain("'auth/password-recovery/verify'")
  expect(router).toContain("'auth/password-recovery/complete'")
  expect(security).toContain('k2_admin_recovery')
  expect(security).toContain('k2_admin_recovery_csrf')
  expect(service).toContain("'/api/admin/auth/password-recovery/request'")
  expect(service).toContain("'/api/admin/auth/password-recovery/complete'")
  expect(runtime).toContain('requestPasswordRecovery')
  expect(runtime).toContain('completePasswordRecovery')
  expect(service).not.toMatch(/access_token|refresh_token/)
  expect(runtime).not.toContain('resetPasswordForEmail')
  expect(requestHandler).toContain('resetPasswordForEmail')
  expect(verifyHandler).toContain("verifyOtp({ token_hash: tokenHash, type: 'recovery' })")
  expect(verifyHandler).not.toMatch(/access_token|refresh_token/)
  expect(completeHandler).toContain("signOut({ scope: 'global' })")
  expect(completeHandler.indexOf('updateUser({ password })')).toBeLessThan(completeHandler.indexOf("signOut({ scope: 'global' })"))
})

test('staff password recovery consumes a signed durable pre-auth budget without storing raw identifiers', async () => {
  const serverFiles = await readdir(new URL('../server/admin-bff/', import.meta.url))
  const migrations = await readdir(new URL('../supabase/migrations/', import.meta.url))
  expect(serverFiles).toContain('preauth-rate.js')
  expect(migrations).toContain('20260825_admin_preauth_rate_boundary.sql')

  const handler = await readFile(new URL('../prepared-api/admin/auth/password-recovery/request.js', import.meta.url), 'utf8')
  const packageJson = await readFile(new URL('../package.json', import.meta.url), 'utf8')
  expect(handler).toContain('consumeAdminPreauthRate')
  expect(packageJson).toContain('verify:map020-preauth-rate-portable')
})

test('staff recovery pre-auth signer hides identifiers and rejects malformed boundary results', async () => {
  const previousSecret = process.env.K2_ADMIN_BFF_REQUEST_SECRET
  const secret = Buffer.alloc(32, 23)
  process.env.K2_ADMIN_BFF_REQUEST_SECRET = secret.toString('base64')
  try {
    const req = request('POST', {
      headers: {
        origin: 'https://admin.example.test', 'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.27',
      },
    })
    const args = signedAdminPreauthRateArguments(req, 'password_recovery', ' Staff@Example.Test ')
    expect(args.p_action).toBe('password_recovery')
    expect(args.p_ip_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(args.p_contact_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(args)).not.toContain('203.0.113.27')
    expect(JSON.stringify(args)).not.toContain('staff@example.test')

    const message = [args.p_action, args.p_timestamp, args.p_nonce, args.p_ip_hash, args.p_contact_hash].join('\n')
    expect(args.p_signature).toBe(createHmac('sha256', secret).update(message, 'utf8').digest('hex'))
    expect(signedAdminPreauthRateArguments(req, 'password_recovery', 'staff@example.test').p_contact_hash)
      .toBe(args.p_contact_hash)
    const loginArgs = signedAdminPreauthRateArguments(req, 'admin_login', 'staff@example.test')
    expect(loginArgs.p_action).toBe('admin_login')
    expect(loginArgs.p_contact_hash).not.toBe(args.p_contact_hash)
    const pendingId = '10000000-0000-4000-8000-000000000099'
    const mfaArgs = signedAdminPreauthRateArguments(req, 'admin_mfa', pendingId)
    expect(mfaArgs.p_action).toBe('admin_mfa')
    expect(mfaArgs.p_contact_hash).not.toBe(args.p_contact_hash)
    expect(mfaArgs.p_contact_hash).not.toBe(loginArgs.p_contact_hash)
    expect(JSON.stringify(mfaArgs)).not.toContain(pendingId)
    const recoveryTokenHash = 'a'.repeat(64)
    const verifyArgs = signedAdminPreauthRateArguments(
      req, 'password_recovery_verify', recoveryTokenHash,
    )
    expect(verifyArgs.p_action).toBe('password_recovery_verify')
    expect(verifyArgs.p_contact_hash).not.toBe(args.p_contact_hash)
    expect(verifyArgs.p_contact_hash).not.toBe(mfaArgs.p_contact_hash)
    expect(JSON.stringify(verifyArgs)).not.toContain(recoveryTokenHash)
    expect(() => signedAdminPreauthRateArguments(req, 'unknown_action', 'staff@example.test'))
      .toThrow('ADMIN_PREAUTH_RATE_UNAVAILABLE')

    let captured
    const denied = await consumeAdminPreauthRate({
      async rpc(name, rpcArgs) {
        captured = { name, rpcArgs }
        return { data: { allowed: false, retryAfter: 713 }, error: null }
      },
    }, req, 'password_recovery', 'staff@example.test')
    expect(captured.name).toBe('consume_admin_preauth_rate_v1')
    expect(JSON.stringify(captured.rpcArgs)).not.toContain('staff@example.test')
    expect(denied).toEqual({ allowed: false, retryAfter: 713 })

    await expect(consumeAdminPreauthRate({
      async rpc() {
        return { data: { allowed: true, retryAfter: 0, providerDetail: 'unexpected' }, error: null }
      },
    }, req, 'password_recovery', 'staff@example.test')).rejects.toThrow('ADMIN_PREAUTH_RATE_UNAVAILABLE')
  } finally {
    if (previousSecret === undefined) delete process.env.K2_ADMIN_BFF_REQUEST_SECRET
    else process.env.K2_ADMIN_BFF_REQUEST_SECRET = previousSecret
  }
})

test('durable staff recovery denial returns Retry-After before requesting provider email', async () => {
  const recoveryModule = await import('../prepared-api/admin/auth/password-recovery/request.js')
  expect(typeof recoveryModule.createPasswordRecoveryRequestHandler).toBe('function')

  let providerCalls = 0
  const client = {
    auth: {
      async resetPasswordForEmail() {
        providerCalls += 1
        return { error: null }
      },
    },
  }
  const handler = recoveryModule.createPasswordRecoveryRequestHandler({
    createServerSupabase: () => client,
    consumeAdminPreauthRate: async () => ({ allowed: false, retryAfter: 811 }),
    verifyBotChallenge: async () => { throw new Error('BOT_CHECK_MUST_NOT_RUN') },
    recordSecurityEvent: async () => {},
  })
  process.env.K2_ADMIN_PASSWORD_RECOVERY_ENABLED = 'true'
  process.env.K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL =
    'https://admin.example.test/api/admin/auth/password-recovery/verify'
  const res = response()
  await handler(request('POST', {
    socket: { remoteAddress: '198.51.100.92' },
    body: { email: 'durable-denial@example.test', botToken: 'verified-turnstile-token' },
  }), res)
  expect(res.statusCode).toBe(429)
  expect(res.headers.get('retry-after')).toBe('811')
  expect(JSON.parse(res.body).error.code).toBe('RATE_LIMITED')
  expect(providerCalls).toBe(0)
})

test('durable staff login denial returns Retry-After before password-provider authentication', async () => {
  const loginModule = await import('../prepared-api/admin/auth/login.js')
  expect(typeof loginModule.createAdminLoginHandler).toBe('function')

  let providerCalls = 0
  const client = {
    auth: {
      async signInWithPassword() {
        providerCalls += 1
        return { data: null, error: null }
      },
    },
  }
  const handler = loginModule.createAdminLoginHandler({
    createServerSupabase: () => client,
    consumeAdminPreauthRate: async (_client, _req, action) => {
      expect(action).toBe('admin_login')
      return { allowed: false, retryAfter: 599 }
    },
    verifyBotChallenge: async () => { throw new Error('BOT_CHECK_MUST_NOT_RUN') },
    recordSecurityEvent: async () => {},
  })
  const res = response()
  await handler(request('POST', {
    socket: { remoteAddress: '198.51.100.117' },
    body: { email: 'durable-login-denial@example.test', password: 'correct-shape-password', botToken: 'verified-turnstile-token' },
  }), res)
  expect(res.statusCode).toBe(429)
  expect(res.headers.get('retry-after')).toBe('599')
  expect(JSON.parse(res.body).error.code).toBe('RATE_LIMITED')
  expect(providerCalls).toBe(0)

  const unavailableHandler = loginModule.createAdminLoginHandler({
    createServerSupabase: () => client,
    consumeAdminPreauthRate: async () => { throw new Error('ADMIN_PREAUTH_RATE_UNAVAILABLE') },
    recordSecurityEvent: async () => {},
  })
  const unavailable = response()
  await unavailableHandler(request('POST', {
    socket: { remoteAddress: '198.51.100.118' },
    body: { email: 'durable-login-unavailable@example.test', password: 'correct-shape-password', botToken: 'verified-turnstile-token' },
  }), unavailable)
  expect(unavailable.statusCode).toBe(503)
  expect(JSON.parse(unavailable.body).error.code).toBe('AUTH_UNAVAILABLE')
  expect(providerCalls).toBe(0)

  const migration = await readFile(new URL(
    '../supabase/migrations/20260825_admin_preauth_rate_boundary.sql', import.meta.url,
  ), 'utf8')
  expect(migration).toContain("'admin_login'")
})

test('Admin login and recovery bot denials happen after durable budgets and before provider calls', async () => {
  const [loginModule, recoveryModule] = await Promise.all([
    import('../prepared-api/admin/auth/login.js'),
    import('../prepared-api/admin/auth/password-recovery/request.js'),
  ])
  process.env.K2_ADMIN_PASSWORD_RECOVERY_ENABLED = 'true'
  process.env.K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL =
    'https://admin.example.test/api/admin/auth/password-recovery/verify'
  const calls = []
  const client = { auth: {
    async signInWithPassword() { calls.push('login-provider'); return { data: null, error: null } },
    async resetPasswordForEmail() { calls.push('recovery-provider'); return { error: null } },
  } }
  const overrides = {
    createServerSupabase: () => client,
    consumeAdminPreauthRate: async () => { calls.push('budget'); return { allowed: true, retryAfter: 0 } },
    verifyBotChallenge: async (token, ip, action) => {
      calls.push(['bot', token, ip, action])
      return false
    },
    recordSecurityEvent: async () => {},
  }
  for (const [handler, body] of [
    [loginModule.createAdminLoginHandler(overrides), {
      email: 'staff@example.test', password: 'correct-shape-password', botToken: 'verified-turnstile-token',
    }],
    [recoveryModule.createPasswordRecoveryRequestHandler(overrides), {
      email: 'staff@example.test', botToken: 'verified-turnstile-token',
    }],
  ]) {
    calls.length = 0
    const res = response()
    await handler(request('POST', { socket: { remoteAddress: '198.51.100.126' }, body }), res)
    expect(res.statusCode).toBe(403)
    expect(JSON.parse(res.body).error.code).toBe('BOT_CHALLENGE_REQUIRED')
    expect(calls).toEqual(['budget', ['bot', 'verified-turnstile-token', '198.51.100.126', 'admin_auth']])
  }
  calls.length = 0
  const invalid = response()
  await loginModule.createAdminLoginHandler(overrides)(request('POST', { body: {
    email: 'staff@example.test', password: 'correct-shape-password',
    botToken: 'verified-turnstile-token', role: 'Admin',
  } }), invalid)
  expect(invalid.statusCode).toBe(400)
  expect(JSON.parse(invalid.body).error.code).toBe('INVALID_CREDENTIAL_FORMAT')
  expect(calls).toEqual([])
})

test('durable pending MFA denial returns Retry-After before provider session restoration', async () => {
  const mfaModule = await import('../prepared-api/admin/auth/mfa.js')
  expect(typeof mfaModule.createAdminMfaHandler).toBe('function')

  const pendingResponse = response()
  setPendingCookie(pendingResponse, {
    access_token: 'pending-access-token-value',
    refresh_token: 'pending-refresh-token-value',
    expires_at: Math.floor(Date.now() / 1000) + 600,
  })
  const cookieHeader = pendingResponse.headers.get('set-cookie').split(';')[0]
  let providerCalls = 0
  const client = {
    auth: {
      async setSession() {
        providerCalls += 1
        return { data: null, error: null }
      },
    },
  }
  const handler = mfaModule.createAdminMfaHandler({
    createServerSupabase: () => client,
    consumeAdminPreauthRate: async (_client, _req, action) => {
      expect(action).toBe('admin_mfa')
      return { allowed: false, retryAfter: 577 }
    },
    recordSecurityEvent: async () => {},
  })
  const res = response()
  await handler(request('POST', {
    headers: {
      origin: 'https://admin.example.test', 'content-type': 'application/json',
      cookie: cookieHeader,
    },
    socket: { remoteAddress: '198.51.100.119' },
    body: { code: '123456' },
  }), res)
  expect(res.statusCode).toBe(429)
  expect(res.headers.get('retry-after')).toBe('577')
  expect(JSON.parse(res.body).error.code).toBe('RATE_LIMITED')
  expect(providerCalls).toBe(0)

  const unavailableHandler = mfaModule.createAdminMfaHandler({
    createServerSupabase: () => client,
    consumeAdminPreauthRate: async () => { throw new Error('ADMIN_PREAUTH_RATE_UNAVAILABLE') },
    recordSecurityEvent: async () => {},
  })
  const unavailable = response()
  await unavailableHandler(request('POST', {
    headers: {
      origin: 'https://admin.example.test', 'content-type': 'application/json',
      cookie: cookieHeader,
    },
    socket: { remoteAddress: '198.51.100.120' },
    body: { code: '123456' },
  }), unavailable)
  expect(unavailable.statusCode).toBe(503)
  expect(JSON.parse(unavailable.body).error.code).toBe('AUTH_UNAVAILABLE')
  expect(providerCalls).toBe(0)

  const migration = await readFile(new URL(
    '../supabase/migrations/20260825_admin_preauth_rate_boundary.sql', import.meta.url,
  ), 'utf8')
  expect(migration).toContain("'admin_mfa'")
})

test('durable recovery completion denial returns Retry-After before provider session restoration', async () => {
  const completeModule = await import('../prepared-api/admin/auth/password-recovery/complete.js')
  expect(typeof completeModule.createPasswordRecoveryCompleteHandler).toBe('function')
  process.env.K2_ADMIN_PASSWORD_RECOVERY_ENABLED = 'true'
  process.env.K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL =
    'https://admin.example.test/api/admin/auth/password-recovery/verify'

  const recoveryResponse = response()
  setRecoverySessionCookies(recoveryResponse, {
    access_token: 'recovery-access-token-value',
    refresh_token: 'recovery-refresh-token-value',
    expires_at: Math.floor(Date.now() / 1000) + 600,
  }, { userId: '8b185c31-66f7-49fd-81d0-4f36a38b9812', role: 'Admin' })
  const setCookies = recoveryResponse.headers.get('set-cookie')
  const cookieHeader = setCookies.map(value => value.split(';')[0]).join('; ')
  const csrf = decodeURIComponent(setCookies[1].split(';')[0].split('=')[1])
  let providerCalls = 0
  const client = {
    auth: {
      async setSession() { providerCalls += 1; return { data: null, error: null } },
      async updateUser() { providerCalls += 1; return { error: null } },
      async signOut() { providerCalls += 1; return { error: null } },
    },
  }
  const handler = completeModule.createPasswordRecoveryCompleteHandler({
    createServerSupabase: () => client,
    consumeAdminPreauthRate: async (_client, _req, action, subject) => {
      expect(action).toBe('password_recovery_complete')
      expect(subject).toMatch(/^[0-9a-f-]{36}$/)
      return { allowed: false, retryAfter: 431 }
    },
    recordSecurityEvent: async () => {},
  })
  const res = response()
  await handler(request('POST', {
    headers: {
      origin: 'https://admin.example.test', 'content-type': 'application/json',
      cookie: cookieHeader, 'x-k2-recovery-csrf': csrf,
    },
    socket: { remoteAddress: '198.51.100.121' },
    body: { password: 'long-company-password', confirmation: 'long-company-password' },
  }), res)
  expect(res.statusCode).toBe(429)
  expect(res.headers.get('retry-after')).toBe('431')
  expect(JSON.parse(res.body).error.code).toBe('RATE_LIMITED')
  expect(providerCalls).toBe(0)
})

test('durable recovery verification denial returns Retry-After before token verification', async () => {
  const verifyModule = await import('../prepared-api/admin/auth/password-recovery/verify.js')
  expect(typeof verifyModule.createPasswordRecoveryVerifyHandler).toBe('function')
  process.env.K2_ADMIN_PASSWORD_RECOVERY_ENABLED = 'true'
  process.env.K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL =
    'https://admin.example.test/api/admin/auth/password-recovery/verify'

  let providerCalls = 0
  const client = {
    auth: {
      async verifyOtp() { providerCalls += 1; return { data: null, error: null } },
    },
  }
  const handler = verifyModule.createPasswordRecoveryVerifyHandler({
    createServerSupabase: () => client,
    consumeAdminPreauthRate: async (_client, _req, action, subject) => {
      expect(action).toBe('password_recovery_verify')
      expect(subject).toBe('a'.repeat(64))
      return { allowed: false, retryAfter: 389 }
    },
    recordSecurityEvent: async () => {},
  })
  const res = response()
  await handler(request('GET', {
    socket: { remoteAddress: '198.51.100.122' },
    query: { token_hash: 'a'.repeat(64), type: 'recovery' },
  }), res)
  expect(res.statusCode).toBe(429)
  expect(res.headers.get('retry-after')).toBe('389')
  expect(JSON.parse(res.body).error.code).toBe('RATE_LIMITED')
  expect(providerCalls).toBe(0)
})

test('staff password recovery validates exact payloads, exact callback host, and short recovery cookies', async () => {
  const configured = {
    NODE_ENV: 'production', K2_ADMIN_PASSWORD_RECOVERY_ENABLED: 'true',
    K2_ADMIN_ORIGINS: 'https://admin.example.test',
    K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL: 'https://admin.example.test/api/admin/auth/password-recovery/verify',
  }
  expect(isPasswordRecoveryConfigured(configured)).toBe(true)
  expect(passwordRecoveryCallbackUrl(configured).toString()).toBe(configured.K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL)
  expect(passwordRecoveryResultUrl('ready', configured)).toBe('https://admin.example.test/admin-portal-k2-secure?recovery=ready')
  expect(isPasswordRecoveryConfigured({ ...configured, K2_ADMIN_ORIGINS: 'https://other.example.test' })).toBe(false)
  expect(isPasswordRecoveryConfigured({ ...configured, K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL: 'https://admin.example.test/api/admin/auth/password-recovery/verify?next=evil' })).toBe(false)

  expect(validatePasswordRecoveryRequest({ email: ' Staff@Example.Test ', botToken: 'verified-turnstile-token' }))
    .toEqual({ email: 'staff@example.test', botToken: 'verified-turnstile-token' })
  expect(() => validatePasswordRecoveryRequest({ email: 'staff@example.test', role: 'Admin' })).toThrow('PASSWORD_RECOVERY_REQUEST_INVALID')
  expect(validatePasswordRecoveryCallback({ token_hash: 'a'.repeat(64), type: 'recovery' })).toEqual({ tokenHash: 'a'.repeat(64), type: 'recovery' })
  expect(() => validatePasswordRecoveryCallback({ token_hash: 'a'.repeat(64), type: 'signup' })).toThrow('PASSWORD_RECOVERY_LINK_INVALID')
  expect(validatePasswordRecoveryCompletion({ password: 'long-company-password', confirmation: 'long-company-password' })).toEqual({ password: 'long-company-password' })
  expect(() => validatePasswordRecoveryCompletion({ password: 'short', confirmation: 'short' })).toThrow('PASSWORD_RECOVERY_PASSWORD_INVALID')

  const cookieResponse = response()
  setRecoverySessionCookies(cookieResponse, {
    access_token: 'recovery-access-token-value', refresh_token: 'recovery-refresh-token-value',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  }, { userId: '8b185c31-66f7-49fd-81d0-4f36a38b9812', role: 'Admin' })
  const setCookies = cookieResponse.headers.get('set-cookie')
  expect(setCookies).toHaveLength(2)
  expect(setCookies.join('\n')).toContain('Max-Age=600')
  expect(setCookies.join('\n')).toContain('SameSite=Strict')
  const cookieHeader = setCookies.map(value => value.split(';')[0]).join('; ')
  const recovery = readRecoverySession(request('POST', { headers: { cookie: cookieHeader } }))
  expect(recovery.userId).toBe('8b185c31-66f7-49fd-81d0-4f36a38b9812')
  const csrf = decodeURIComponent(setCookies[1].split(';')[0].split('=')[1])
  expect(verifyRecoveryCsrf(request('POST', { headers: {
    cookie: cookieHeader, 'x-k2-recovery-csrf': csrf,
  } }), recovery)).toBe(true)
})

test('staff password recovery handlers fail closed before provider activation', async () => {
  const requestUnavailable = response()
  await passwordRecoveryRequestHandler(request('POST', { body: { email: 'staff@example.test' } }), requestUnavailable)
  expect(requestUnavailable.statusCode).toBe(503)
  expect(JSON.parse(requestUnavailable.body).error.code).toBe('PASSWORD_RECOVERY_UNAVAILABLE')

  const verifyUnavailable = response()
  await passwordRecoveryVerifyHandler(request('GET', { headers: {}, query: { token_hash: 'a'.repeat(64), type: 'recovery' } }), verifyUnavailable)
  expect(verifyUnavailable.statusCode).toBe(503)

  const completeUnavailable = response()
  await passwordRecoveryCompleteHandler(request('POST'), completeUnavailable)
  expect(completeUnavailable.statusCode).toBe(503)

  process.env.K2_ADMIN_PASSWORD_RECOVERY_ENABLED = 'true'
  process.env.K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL = 'https://admin.example.test/api/admin/auth/password-recovery/verify'

  const malformedRequest = response()
  await passwordRecoveryRequestHandler(request('POST', {
    body: { email: 'staff@example.test', botToken: 'verified-turnstile-token', role: 'Admin' },
  }), malformedRequest)
  expect(malformedRequest.statusCode).toBe(400)
  expect(JSON.parse(malformedRequest.body).error.code).toBe('PASSWORD_RECOVERY_REQUEST_INVALID')

  const invalidLink = response()
  await passwordRecoveryVerifyHandler(request('GET', {
    headers: {}, query: { token_hash: 'not-a-token', type: 'recovery' },
  }), invalidLink)
  expect(invalidLink.statusCode).toBe(303)
  expect(invalidLink.headers.get('location')).toBe('https://admin.example.test/admin-portal-k2-secure?recovery=invalid')
  expect(invalidLink.headers.get('referrer-policy')).toBe('no-referrer')

  const noRecoveryCookie = response()
  await passwordRecoveryCompleteHandler(request('POST'), noRecoveryCookie)
  expect(noRecoveryCookie.statusCode).toBe(401)
  expect(JSON.parse(noRecoveryCookie.body).error.code).toBe('PASSWORD_RECOVERY_EXPIRED')
})

test('admin and storefront providers remain separate production runtimes', async () => {
  const adminApp = await readFile(new URL('../src/AdminApp.jsx', import.meta.url), 'utf8')
  const storefrontApp = await readFile(new URL('../src/StorefrontApp.jsx', import.meta.url), 'utf8')
  const storefrontContext = await readFile(new URL('../src/context/StoreContext.jsx', import.meta.url), 'utf8')
  const boundaryVerifier = await readFile(new URL('../scripts/verify-build-boundary.mjs', import.meta.url), 'utf8')
  expect(adminApp).toContain('AdminStoreProvider')
  expect(adminApp).not.toContain("./context/StoreContext")
  expect(storefrontApp).toContain('StoreProvider')
  expect(storefrontApp).not.toContain('AdminStoreProvider')
  expect(storefrontContext).not.toMatch(/\/api\/admin|append_internal_message|mark_conversation_read|update_conversation_workflow/)
  expect(boundaryVerifier).toContain('forbiddenBundleContent')
  expect(boundaryVerifier).toContain('cross-artifact runtime code')
})

test('admin product projection is session-gated and derives stock without exposing full rows', async () => {
  const noSession = response()
  await productsHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)
  expect(JSON.parse(noSession.body).error.code).toBe('SESSION_EXPIRED')

  const queued = [
    { data: [{ sku: 'SKU-1', name: 'Pasta', barcode: '8001', status: 'Live', srp: '100', wholesale_price: '80', subcategory: 'Pasta', primary_image_url: null, created_at: '2026-08-12T00:00:00Z', private_note: 'must not escape' }], error: null },
    { data: [{ sku: 'SKU-1', stock_from_batches: 7 }], error: null },
  ]
  const client = {
    from() {
      const result = queued.shift()
      const builder = {
        select() { return builder }, order() { return builder },
        limit() { return Promise.resolve(result) },
      }
      return builder
    },
  }
  const result = await readAdminProducts(client)
  expect(result.products[0].stock_available).toBe(7)
  expect(result.products[0].srp).toBe(100)
  expect(result.products[0]).not.toHaveProperty('private_note')
})

test('fulfillment BFF is session/CSRF/idempotency gated and validates fixed command schemas', async () => {
  const noSession = response()
  await fulfillmentHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const missingKey = response()
  await confirmHandler(request('POST'), missingKey)
  expect(missingKey.statusCode).toBe(400)
  expect(JSON.parse(missingKey.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  expect(validateFulfillmentCommand('packing_scan', {
    orderRequestId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', scannedCode: '8001234567890',
  })).toEqual({ orderRequestId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', scannedCode: '8001234567890' })
  expect(() => validateFulfillmentCommand('packing_scan', {
    orderRequestId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', scannedCode: 'SKU-1', injected: true,
  })).toThrow('REQUEST_INVALID')
  expect(() => validateFulfillmentCommand('delivery_details', {
    orderRequestId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', shippingAmount: -1,
    courierName: 'Courier', trackingNumber: '', waybillUrl: '', customerConfirmed: false, note: 'Quoted',
  })).toThrow('REQUEST_INVALID')
})

test('fulfillment boundary is signed, replay-safe, and remains feature-gated', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_fulfillment_bff_boundary.sql', import.meta.url), 'utf8')
  const service = await readFile(new URL('../src/services/adminBffService.js', import.meta.url), 'utf8')
  const hub = await readFile(new URL('../src/views/admin/OmniOperationsHub.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('verify_admin_bff_request')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain('K2_ADMIN_IDEMPOTENCY_CONFLICT')
  expect(migration).toContain("p_action = 'packing_scan' then 240 else 30")
  expect(service).toContain("headers['X-K2-Idempotency-Key'] = idempotencyKey || crypto.randomUUID()")
  expect(hub).toContain('adminBffEnabled()')
  expect(hub).toContain('recordPackingScanBff')
})

test('universal inbox BFF preserves internal-note truth and rejects loose payloads', async () => {
  const noSession = response()
  await inboxHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const noIdempotency = response()
  await internalNoteHandler(request('POST'), noIdempotency)
  expect(noIdempotency.statusCode).toBe(400)
  expect(JSON.parse(noIdempotency.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  expect(validateInboxCommand('inbox_internal_note', {
    conversationId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', content: 'Customer asked for an updated courier quote.',
  })).toEqual({
    conversationId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', content: 'Customer asked for an updated courier quote.',
  })
  expect(() => validateInboxCommand('inbox_internal_note', {
    conversationId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', content: 'note', delivered: true,
  })).toThrow('REQUEST_INVALID')
  expect(() => validateInboxCommand('inbox_workflow', {
    conversationId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', status: 'Sent', priority: 'normal',
    assignedTo: null, responseDueAt: null, reason: '',
  })).toThrow('REQUEST_INVALID')
})

test('prepared inbox command boundary is signed, durable, and not external delivery', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_inbox_bff_boundary.sql', import.meta.url), 'utf8')
  const runtime = await readFile(new URL('../src/context/useAdminInboxRuntime.js', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_inbox_command_v1')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain('public.append_internal_message')
  expect(migration).toContain('Internal notes remain internal_only')
  expect(migration).not.toContain("delivery_status = 'sent'")
  expect(runtime).toContain('getAdminInbox')
  expect(runtime).toContain('saveInternalNoteBff')
  expect(runtime).toContain('window.setInterval(fetchConversations, 15_000)')
})

test('Pasabuy BFF is session/idempotency gated and bounds owner-selected pricing', async () => {
  const noSession = response()
  await pasabuyHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const noIdempotency = response()
  await pasabuyQuoteHandler(request('POST'), noIdempotency)
  expect(noIdempotency.statusCode).toBe(400)
  expect(JSON.parse(noIdempotency.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  const valid = validatePasabuyCommand('pasabuy_quote', {
    requestId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', itemCostForeign: 10,
    fxRate: 62.5, fxSource: 'Bank published rate', fxCapturedAt: new Date().toISOString(),
    weightKg: 0.5, shippingMethod: 'air', freightRateForeignPerKg: 14,
    customsTaxPercent: 12, handlingPhp: 0, marginPercent: 40, finalPricePhp: 1200,
    validUntil: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    priceRationale: 'Seasonal availability and air freight.',
  })
  expect(valid.priceRationale).toBe('Seasonal availability and air freight.')
  expect(() => validatePasabuyCommand('pasabuy_quote', {
    ...valid, finalPricePhp: 100, priceRationale: 'Below cost should fail.',
  })).toThrow('REQUEST_INVALID')
  expect(() => validatePasabuyCommand('pasabuy_transition', {
    requestId: valid.requestId, toStatus: 'purchasing', reason: '',
  })).toThrow('REQUEST_INVALID')
})

test('prepared Pasabuy boundary is signed, durable, rationale-audited, and feature-gated', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_pasabuy_bff_boundary.sql', import.meta.url), 'utf8')
  const service = await readFile(new URL('../src/services/adminBffService.js', import.meta.url), 'utf8')
  const manager = await readFile(new URL('../src/views/admin/PasabuyManager.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_pasabuy_command_v1')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain('quote_price_rationale')
  expect(migration).toContain("'sent',false,'paid',false")
  expect(service).toContain("'/api/admin/pasabuy'")
  expect(manager).toContain('adminBffEnabled()')
  expect(manager).toContain('savePasabuyQuoteBff')
  expect(manager).toContain('Owner price rationale')
})

test('product-intake BFF is session/idempotency gated and rejects loose operational input', async () => {
  const noSession = response()
  await intakeSessionHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const noIdempotency = response()
  await intakeDraftHandler(request('POST'), noIdempotency)
  expect(noIdempotency.statusCode).toBe(400)
  expect(JSON.parse(noIdempotency.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  expect(validateProductIntakeCommand('intake_session_step', {
    sessionId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', step: 'field_review', patch: {},
  })).toEqual({
    sessionId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', step: 'field_review', patch: {},
  })
  expect(() => validateProductIntakeCommand('intake_session_step', {
    sessionId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', step: 'live', patch: {},
  })).toThrow('REQUEST_INVALID')
  expect(() => validateProductIntakeCommand('intake_session_step', {
    sessionId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', step: 'field_review',
    patch: { packagingImages: [{ upload_status: 'uploaded' }] },
  })).toThrow('REQUEST_INVALID')
  expect(() => validateProductIntakeCommand('intake_inventory', {
    sessionId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1',
    inventoryRequestId: 'e74a4161-72ca-4d72-8f59-37aa690e1869', source: 'receipt', inventory: {},
  })).toThrow('REQUEST_INVALID')
})

test('prepared product-intake boundary is named, signed, receipt-backed, and upload-honest', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_product_intake_bff_boundary.sql', import.meta.url), 'utf8')
  const server = await readFile(new URL('../server/admin-bff/product-intake.js', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_product_intake_command_v1')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain("'intake_session_create','intake_session_step','intake_draft'")
  expect(migration).toContain('PRODUCT_PUBLICATION_REASON')
  expect(server).toContain(".select(SESSION_PROJECTION)")
  expect(server).not.toContain("select('*')")
  expect(server).not.toContain('packagingImages]')
  expect(migration).toContain('Private evidence upload/decode validation remains a separate gate')
})

test('private intake evidence requires real single-image decoding and strips metadata', async () => {
  expect(MAX_EVIDENCE_BYTES).toBe(4 * 1024 * 1024)
  const validPng = await sharp({
    create: { width: 120, height: 120, channels: 3, background: '#8b1e2d' },
  }).png().withMetadata({ comment: 'must not survive normalization' }).toBuffer()
  const decoded = await decodeEvidenceImage(validPng, 'image/png')
  expect(decoded.type).toBe('image/png')
  expect(decoded.width).toBe(120)
  expect(decoded.height).toBe(120)
  expect(decoded.sha256).toMatch(/^[0-9a-f]{64}$/)
  const normalized = await sharp(decoded.buffer).metadata()
  expect(normalized.comments || []).toEqual([])
  await expect(decodeEvidenceImage(Buffer.from('<svg><script>alert(1)</script></svg>'), 'image/png'))
    .rejects.toThrow()
  await expect(decodeEvidenceImage(validPng, 'image/jpeg')).rejects.toThrow('EVIDENCE_FILE_INVALID')
})

test('pending Admin MFA enrollment is exact, bounded, stale-factor-safe, and returns verified session material only', async () => {
  const factorId = '40000000-0000-4000-8000-000000000004'
  expect(validatePendingMfaCommand({ action: 'enroll_start' })).toEqual({ action: 'enroll_start' })
  expect(validatePendingMfaCommand({ action: 'enroll_verify', factorId, code: '481209' }))
    .toEqual({ action: 'enroll_verify', factorId, code: '481209' })
  expect(validatePendingMfaCommand({ code: '123456' })).toEqual({ action: 'challenge', code: '123456' })
  expect(() => validatePendingMfaCommand({ action: 'enroll_verify', factorId, code: '12345' })).toThrow('MFA_REQUEST_INVALID')
  expect(() => validatePendingMfaCommand({ action: 'enroll_start', extra: true })).toThrow('MFA_REQUEST_INVALID')

  const calls = []
  const client = { auth: { mfa: {
    listFactors: async () => ({ data: { totp: [
      { id: '40000000-0000-4000-8000-000000000005', status: 'unverified' },
    ] }, error: null }),
    unenroll: async ({ factorId: staleId }) => { calls.push(['unenroll', staleId]); return { error: null } },
    enroll: async () => ({ data: {
      id: factorId,
      totp: { qr_code: 'data:image/svg+xml;base64,PHN2Zy8+', secret: 'JBSWY3DPEHPK3PXP' },
    }, error: null }),
  } } }
  await expect(startPendingMfaEnrollment(client)).resolves.toEqual({
    factorId, qr: 'data:image/svg+xml;base64,PHN2Zy8+', secret: 'JBSWY3DPEHPK3PXP',
  })
  expect(calls).toEqual([['unenroll', '40000000-0000-4000-8000-000000000005']])

  const verified = {
    access_token: 'verified-access-token', refresh_token: 'verified-refresh-token',
    expires_in: 3600, user: { id: '10000000-0000-4000-8000-000000000001' },
  }
  const verifyClient = { auth: { mfa: {
    listFactors: async () => ({ data: { totp: [{ id: factorId, status: 'unverified' }] }, error: null }),
    challenge: async ({ factorId: selected }) => ({ data: { id: selected === factorId ? 'challenge-id' : '' }, error: null }),
    verify: async (payload) => { calls.push(['verify', payload]); return { data: verified, error: null } },
  } } }
  await expect(verifyPendingMfaEnrollment(verifyClient, factorId, '481209')).resolves.toEqual(verified)
  expect(calls.at(-1)).toEqual(['verify', { factorId, challengeId: 'challenge-id', code: '481209' }])

  const loginSource = await readFile(new URL('../prepared-api/admin/auth/login.js', import.meta.url), 'utf8')
  const mfaSource = await readFile(new URL('../prepared-api/admin/auth/mfa.js', import.meta.url), 'utf8')
  expect(loginSource).toContain('setPendingCookie(res, data.session)')
  expect(loginSource).toContain("enrollmentRequired: true")
  expect(mfaSource).toContain('startPendingMfaEnrollment(client)')
  expect(mfaSource).toContain('verifyPendingMfaEnrollment(client, command.factorId, command.code)')
})

test('active Admin MFA replacement is reasoned, signed, exact-factor-safe, and separately gated', async () => {
  const noSession = response()
  await mfaReplacementHandler(request('POST', { headers: {
    origin: 'https://admin.example.test', 'content-type': 'application/json',
    'x-k2-idempotency-key': '50000000-0000-4000-8000-000000000005',
  } }), noSession)
  expect(noSession.statusCode).toBe(401)
  const previousFactorId = '60000000-0000-4000-8000-000000000006'
  const factorId = '70000000-0000-4000-8000-000000000007'
  const replacementId = '50000000-0000-4000-8000-000000000005'
  const reason = 'Moving Admin MFA to the company-managed phone.'
  expect(isMfaReplacementConfigured({})).toBe(false)
  expect(isMfaReplacementConfigured({ K2_MFA_REPLACEMENT_ENABLED: 'true' })).toBe(true)
  expect(validateMfaReplacementCommand({ action: 'start', reason })).toEqual({ action: 'start', reason })
  expect(validateMfaReplacementCommand({
    action: 'complete', replacementId, previousFactorId, factorId, code: '481209', reason,
    confirmation: 'replace_active_factor',
  })).toEqual({
    action: 'complete', replacementId, previousFactorId, factorId, code: '481209', reason,
    confirmation: 'replace_active_factor',
  })
  expect(() => validateMfaReplacementCommand({ action: 'start', reason, extra: true })).toThrow('MFA_REPLACEMENT_INVALID')
  expect(() => validateMfaReplacementCommand({
    action: 'complete', replacementId, previousFactorId, factorId: previousFactorId,
    code: '481209', reason, confirmation: 'replace_active_factor',
  })).toThrow('MFA_REPLACEMENT_INVALID')
  expect(mfaFactorFingerprint(previousFactorId)).toMatch(/^[0-9a-f]{64}$/)

  const calls = []
  const startClient = { auth: { mfa: {
    listFactors: async () => ({ data: { totp: [
      { id: previousFactorId, status: 'verified' },
      { id: '80000000-0000-4000-8000-000000000008', status: 'unverified' },
    ] }, error: null }),
    unenroll: async ({ factorId: selected }) => { calls.push(['unenroll', selected]); return { error: null } },
    enroll: async value => { calls.push(['enroll', value]); return { data: {
      id: factorId, totp: { qr_code: 'data:image/svg+xml;base64,PHN2Zy8+', secret: 'JBSWY3DPEHPK3PXP' },
    }, error: null } },
  } } }
  await expect(inspectActiveMfaReplacement(startClient)).resolves.toEqual({ previousFactorId })
  await expect(startActiveMfaReplacement(startClient, previousFactorId)).resolves.toEqual({
    previousFactorId, factorId, qr: 'data:image/svg+xml;base64,PHN2Zy8+', secret: 'JBSWY3DPEHPK3PXP',
  })
  expect(calls).toEqual([
    ['unenroll', '80000000-0000-4000-8000-000000000008'],
    ['enroll', { factorType: 'totp', friendlyName: 'K2 Jimzon Admin replacement' }],
  ])

  const verifiedSession = { access_token: 'rotated-access', refresh_token: 'rotated-refresh', user: { id: 'actor' }, expires_in: 3600 }
  const completeCalls = []
  const completeClient = { auth: { mfa: {
    listFactors: async () => ({ data: { totp: [
      { id: previousFactorId, status: 'verified' }, { id: factorId, status: 'unverified' },
    ] }, error: null }),
    challenge: async ({ factorId: selected }) => ({ data: { id: selected === factorId ? 'challenge-id' : '' }, error: null }),
    verify: async value => { completeCalls.push(['verify', value]); return { data: verifiedSession, error: null } },
    unenroll: async ({ factorId: selected }) => { completeCalls.push(['unenroll', selected]); return { error: null } },
  } } }
  await expect(completeActiveMfaReplacement(completeClient, previousFactorId, factorId, '481209')).resolves.toEqual({
    authSession: verifiedSession, alreadyCompleted: false,
  })
  expect(completeCalls).toEqual([
    ['verify', { factorId, challengeId: 'challenge-id', code: '481209' }],
    ['unenroll', previousFactorId],
  ])
  await expect(completeActiveMfaReplacement({ auth: { mfa: {
    listFactors: async () => ({ data: { totp: [{ id: factorId, status: 'verified' }] }, error: null }),
  } } }, previousFactorId, factorId, '481209')).resolves.toEqual({ authSession: null, alreadyCompleted: true })
  await expect(inspectActiveMfaReplacement({ auth: { mfa: {
    listFactors: async () => ({ data: { totp: [
      { id: previousFactorId, status: 'verified' }, { id: factorId, status: 'verified' },
    ] }, error: null }),
  } } })).rejects.toThrow('MFA_REPLACEMENT_MULTIPLE_ACTIVE_FACTORS')

  const previousSecret = process.env.K2_ADMIN_BFF_REQUEST_SECRET
  process.env.K2_ADMIN_BFF_REQUEST_SECRET = Buffer.alloc(32, 19).toString('base64')
  const receiptCalls = []
  try {
    await expect(recordMfaReplacementEvent({ rpc: async (name, args) => {
      receiptCalls.push({ name, args }); return { data: { recorded: true }, error: null }
    } }, { userId: '10000000-0000-4000-8000-000000000001' },
    'admin_mfa_replacement_requested', replacementId, {
      reason, previousFactorHash: mfaFactorFingerprint(previousFactorId),
    })).resolves.toEqual({ recorded: true })
  } finally {
    if (previousSecret === undefined) delete process.env.K2_ADMIN_BFF_REQUEST_SECRET
    else process.env.K2_ADMIN_BFF_REQUEST_SECRET = previousSecret
  }
  expect(receiptCalls[0].name).toBe('record_admin_mfa_replacement_event_v1')
  expect(receiptCalls[0].args.p_action).toBe('admin_mfa_replacement_requested')
  expect(receiptCalls[0].args.p_idempotency_key).toBe(replacementId)
  expect(receiptCalls[0].args.p_signature).toMatch(/^[0-9a-f]{64}$/)

  const [helper, handler, migration, service, ui, router] = await Promise.all([
    readFile(new URL('../server/admin-bff/mfa-replacement.js', import.meta.url), 'utf8'),
    readFile(new URL('../server/admin-bff/mfa-replacement-handler.js', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/migrations/20260824_admin_mfa_replacement_boundary.sql', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/adminBffService.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/admin/StaffPermissionManager.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../server/admin-bff/router.js', import.meta.url), 'utf8'),
  ])
  expect(helper).toContain('validateMfaReplacementCommand')
  expect(helper).toContain('K2_MFA_REPLACEMENT_ENABLED')
  expect(helper).toContain("status === 'verified'")
  expect(helper).toContain("status === 'unverified'")
  expect(helper).toContain('MFA_REPLACEMENT_MULTIPLE_ACTIVE_FACTORS')
  expect(helper).toContain("client.auth.mfa.unenroll({ factorId: previousFactorId })")
  expect(handler).toContain("authorized.identity.role !== 'Admin'")
  expect(handler).toContain('recordMfaReplacementEvent')
  expect(handler).toContain('refreshActiveSessionCookie')
  expect(handler.indexOf("'admin_mfa_replacement_requested'")).toBeLessThan(handler.indexOf('startActiveMfaReplacement(authorized.client'))
  expect(migration).toContain('k2_private.admin_mfa_replacement_events')
  expect(migration).toContain('verify_admin_bff_request')
  expect(migration).toContain("coalesce(auth.jwt()->>'aal','')<>'aal2'")
  expect(migration).toMatch(/revoke all on function public\.record_admin_mfa_replacement_event_v1[\s\S]+from public,anon/i)
  expect(service).toContain("'/api/admin/staff-access/mfa-replacement'")
  expect(ui).toContain('Replace authenticator')
  expect(ui).toContain('Reason for replacing your authenticator')
  expect(router).toContain("['staff-access/mfa-replacement', staffAccessMfaReplacement]")
  expect(router).toContain("'staff-access/mfa-replacement'")
})

test('public product media is session-gated and registered only after server byte verification', async () => {
  const noSession = response()
  await productMediaHandler(request('POST', {
    headers: {
      origin: 'https://admin.example.test',
      'content-type': 'image/png',
      'content-length': '128',
      'x-k2-idempotency-key': 'f8f55374-e8c2-42f0-9c8c-ce8c65efc4f7',
    },
    body: Buffer.alloc(128),
  }), noSession)
  expect(noSession.statusCode).toBe(401)
  expect(JSON.parse(noSession.body).error.code).toBe('SESSION_EXPIRED')

  const server = await readFile(new URL('../server/admin-bff/product-media.js', import.meta.url), 'utf8')
  const migration = await readFile(new URL('../supabase/migrations/20260822_admin_product_media_boundary.sql', import.meta.url), 'utf8')
  const dropzone = await readFile(new URL('../src/components/ui/ImageUploadDropzone.jsx', import.meta.url), 'utf8')
  expect(server).toContain('decodeEvidenceImage(await readImageBody(req), declaredType)')
  expect(server).toContain("cacheControl: '31536000'")
  expect(server).toContain("signedAdminCommandArguments(\n      'product_media_upload'")
  expect(server).not.toMatch(/image\/svg|text\/html|application\/javascript/)
  expect(migration).toContain('execute_admin_product_media_command_v1')
  expect(migration).toContain("bucket_id='product-images' and name=v_object_path")
  expect(migration).toContain('v_count>=20')
  expect(migration).toContain('K2_ADMIN_IDEMPOTENCY_CONFLICT')
  expect(dropzone).toContain('uploadProductMediaBff(file, key)')
  expect(dropzone).toContain('PRODUCT_EVIDENCE_MAX_BYTES')
  expect(dropzone).not.toContain('accept="image/*"')
  expect(dropzone).not.toMatch(/purple|Math\.random/)
})

test('product media assignment is signed, receipt-bound, reasoned, and removal-safe', async () => {
  const noSession = response()
  await productMediaAssignHandler(request('POST', {
    headers: {
      origin: 'https://admin.example.test',
      'content-type': 'application/json',
      'x-k2-idempotency-key': 'f8f55374-e8c2-42f0-9c8c-ce8c65efc4f7',
    },
    body: { sku: 'K2-001', primary: null, lifestyle: [], secondary: [], reason: 'Remove duplicate photo.' },
  }), noSession)
  expect(noSession.statusCode).toBe(401)
  expect(validateProductMediaAssignment({
    sku: 'K2-001', primary: null, lifestyle: [], secondary: [], reason: 'Remove duplicate photo.',
  })).toMatchObject({ sku: 'K2-001', primary: null })
  expect(() => validateProductMediaAssignment({
    sku: 'K2-001', primary: null, lifestyle: [], secondary: [], reason: 'x',
  })).toThrow('REQUEST_INVALID')
  expect(validateProductMediaOrphanCleanup({
    objectPaths: ['00000000-0000-4000-8000-000000000001/product-media/f8f55374-e8c2-42f0-9c8c-ce8c65efc4f7-aaaaaaaaaaaaaaaa.jpg'],
    reason: 'Remove abandoned verified upload.',
  }).objectPaths).toHaveLength(1)
  expect(() => validateProductMediaOrphanCleanup({ objectPaths: ['../shared.jpg'], reason: 'Remove file.' })).toThrow('REQUEST_INVALID')

  const orphanNoSession = response()
  await productMediaOrphansHandler(request('GET'), orphanNoSession)
  expect(orphanNoSession.statusCode).toBe(401)
  expect(() => validateProductMediaAssignment({
    sku: 'K2-001', primary: null, lifestyle: [], secondary: [], reason: 'Valid reason', published: true,
  })).toThrow('REQUEST_INVALID')

  const migration = await readFile(new URL('../supabase/migrations/20260822_admin_product_media_boundary.sql', import.meta.url), 'utf8')
  const modal = await readFile(new URL('../src/views/admin/PhotoManagerModal.jsx', import.meta.url), 'utf8')
  const cleanupModal = await readFile(new URL('../src/views/admin/ProductMediaCleanupModal.jsx', import.meta.url), 'utf8')
  const server = await readFile(new URL('../server/admin-bff/product-media.js', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_product_media_assignment_v1')
  expect(migration).toContain("r.action='product_media_upload'")
  expect(migration).toContain('K2_ADMIN_MEDIA_PRIMARY_REQUIRED')
  expect(migration).toContain('k2_private.product_media_events')
  expect(migration).toContain('complete_admin_product_media_cleanup_v1')
  expect(migration).toContain("cleanup_status in ('none','pending','completed')")
  expect(migration).toContain("o.bucket_id='product-images' and o.name=any(v_event.cleanup_paths)")
  expect(server).toContain("storage.from('product-images').remove(cleanupPaths)")
  expect(server).toContain("'product_media_cleanup_complete'")
  expect(modal).toContain('Retry file cleanup')
  expect(migration).toContain('read_admin_product_media_orphans_v1')
  expect(migration).toContain('prepare_admin_product_media_orphan_cleanup_v1')
  expect(migration).toContain("o.created_at<=clock_timestamp()-interval '1 hour'")
  expect(server).toContain('handleProductMediaOrphans')
  expect(server).toContain("authorized.identity.role !== 'Admin'")
  expect(cleanupModal).toContain('Only receipt-backed files older than one hour')
  expect(cleanupModal).toContain('Retry cleanup')
  expect(cleanupModal).not.toMatch(/alert\(|console\.error|purple/)
  expect(modal).toContain('assignProductMediaBff')
  expect(modal).toContain('Save photo assignment')
  expect(modal).toContain('Discard these unsaved photo changes?')
  expect(modal).not.toMatch(/alert\(|console\.error|purple/)
})

test('Globe and review claims are Admin-only, evidence-bound, reversible, and publicly least-privileged', async () => {
  const noSession = response()
  await globeCmsHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const valid = validateGlobeReviewCommand({
    action: 'review_create',
    payload: {
      name: 'Verified buyer', channel: 'Shopee · verified', stars: 5,
      text: 'The package arrived safely and matched the listing.', item: 'Rio Mare tuna',
      productId: 'rio-mare', reviewDate: '2026-08-20', sourceKind: 'verified_marketplace',
      sourceReference: 'SHOPEE-ORDER-1042', rightsBasis: 'marketplace_publication',
      reason: 'Record attributable customer feedback.',
    },
  })
  expect(valid.action).toBe('review_create')
  expect(() => validateGlobeReviewCommand({
    action: 'review_create', payload: { ...valid.payload, reviewDate: '2026-02-31' },
  })).toThrow('REQUEST_INVALID')
  expect(() => validateGlobeReviewCommand({
    action: 'review_create', payload: { ...valid.payload, published: true },
  })).toThrow('REQUEST_INVALID')

  const migration = await readFile(new URL('../supabase/migrations/20260822_admin_globe_review_boundary.sql', import.meta.url), 'utf8')
  const ui = await readFile(new URL('../src/views/admin/GlobeCms.jsx', import.meta.url), 'utf8')
  const publicData = await readFile(new URL('../src/data/globeCms.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('k2_private.globe_review_events')
  expect(migration).toContain("moderation_status='published'")
  expect(migration).toContain('revoke select on public.reviews from anon,authenticated')
  expect(migration).toContain('grant select(id,product_id,name,channel,stars,text,item,review_date,created_at)')
  expect(migration).toContain('K2_ADMIN_REVIEW_EVIDENCE_REQUIRED')
  expect(ui).toContain('Private source reference')
  expect(ui).toContain('Saving never publishes')
  expect(ui).toContain("command(`review_${dialog.type}`")
  expect(ui).not.toContain('deleteReview')
  expect(publicData).toContain("select('id,product_id,name,channel,stars,text,item,review_date,created_at')")
  expect(publicData).not.toContain("from('reviews').select('*')")
})

test('procurement reads are fixed and supplier creation is Admin-only, reasoned, and receipt-backed', async () => {
  const noSession = response()
  await procurementHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)
  expect(validateSupplierCreate({ name: 'Verified Italia Supplier', contactEmail: 'supply@example.test', leadTimeDays: 14, reason: 'Create from verified purchasing contact.' })).toEqual({ name: 'Verified Italia Supplier', contactEmail: 'supply@example.test', leadTimeDays: 14, reason: 'Create from verified purchasing contact.' })
  expect(() => validateSupplierCreate({ name: 'Supplier', contactEmail: 'bad', leadTimeDays: 14, reason: 'Verified source.' })).toThrow('REQUEST_INVALID')
  expect(() => validateSupplierCreate({ name: 'Supplier', contactEmail: '', leadTimeDays: 14, reason: 'Verified source.', approved: true })).toThrow('REQUEST_INVALID')
  const migration = await readFile(new URL('../supabase/migrations/20260822_admin_procurement_boundary.sql', import.meta.url), 'utf8')
  const ui = await readFile(new URL('../src/views/admin/Suppliers.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('k2_private.supplier_events')
  expect(migration).toContain('revoke insert,update,delete on public.suppliers,public.purchase_orders,public.po_lines')
  expect(migration).toContain("'purchaseOrderCreationAvailable',false")
  expect(migration).toContain("p_action<>'supplier_create' or not public.is_admin()")
  expect(ui).toContain('Live price scraping, purchase-order creation, and receiving are not enabled here.')
  expect(ui).toContain('Reason and source')
  expect(ui).not.toMatch(/Math\.random|alert\(|prompt\(/)
})

test('channel readiness is aggregated and internal verification is signed, reasoned, and Admin-only', async () => {
  const noSession = response()
  await channelsHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)
  expect(validateInternalChannelVerification({ channel: 'website', publicReference: 'WEB-0001', reason: 'Matched the submitted customer and order details.' })).toEqual({ channel: 'website', publicReference: 'WEB-0001', reason: 'Matched the submitted customer and order details.' })
  expect(() => validateInternalChannelVerification({ channel: 'shopee', publicReference: 'S-1', reason: 'Test.' })).toThrow('REQUEST_INVALID')
  expect(() => validateInternalChannelVerification({ channel: 'website', publicReference: 'WEB-1', reason: 'Verified.', live: true })).toThrow('REQUEST_INVALID')
  const migration = await readFile(new URL('../supabase/migrations/20260822_admin_channel_readiness_boundary.sql', import.meta.url), 'utf8')
  const ui = await readFile(new URL('../src/views/admin/ChannelIntegrations.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('k2_private.channel_verification_events')
  expect(migration).toContain('revoke all on function public.verify_internal_channel_event')
  expect(migration).toContain("p_action<>'channel_internal_event_verify' or not public.is_admin()")
  expect(migration).toContain('K2_ADMIN_CHANNEL_REFERENCE_NOT_FOUND')
  expect(ui).toContain('verifyInternalChannelBff')
  expect(ui).toContain('External marketplaces')
  expect(ui).not.toMatch(/Math\.random|alert\(|prompt\(/)
})

test('staff access reads are fixed and role/PIN changes are signed, reasoned, and Admin-only', async () => {
  const noSession = response()
  await staffAccessHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)
  const targetUserId = '00000000-0000-4000-8000-000000000091'
  expect(validateStaffAccessCommand({ action: 'staff_role_change', payload: { targetUserId, role: 'Staff', reason: 'Limit this account to daily operations.' } })).toEqual({ action: 'staff_role_change', payload: { targetUserId, role: 'Staff', reason: 'Limit this account to daily operations.' } })
  expect(validateStaffAccessCommand({ action: 'admin_delete_pin_set', payload: { pin: '4812', reason: 'Rotate the deletion credential.' } })).toEqual({ action: 'admin_delete_pin_set', payload: { pin: '4812', reason: 'Rotate the deletion credential.' } })
  expect(() => validateStaffAccessCommand({ action: 'admin_delete_pin_set', payload: { pin: '12345', reason: 'Rotate.' } })).toThrow('REQUEST_INVALID')
  expect(() => validateStaffAccessCommand({ action: 'staff_role_change', payload: { targetUserId, role: 'Owner', reason: 'Escalate.' } })).toThrow('REQUEST_INVALID')
  const migration = await readFile(new URL('../supabase/migrations/20260822_admin_staff_access_boundary.sql', import.meta.url), 'utf8')
  const ui = await readFile(new URL('../src/views/admin/StaffPermissionManager.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('k2_private.staff_access_events')
  expect(migration).toContain('K2_ADMIN_FINAL_ADMIN')
  expect(migration).toContain('revoke all on function public.set_user_role')
  expect(migration).not.toContain("jsonb_build_object('pin'")
  expect(ui).toContain('commandAdminStaffAccessBff')
  expect(ui).toContain('attributable reason')
  expect(ui).toContain('Reason for this invitation')
  expect(ui).toContain('inviteStaff(inviteEmail.trim(), inviteRole, inviteReason.trim())')
})

test('staff invitations cross one exact reason-bound BFF route without exposing the provider session', async () => {
  expect(isStaffInvitationForwardingConfigured({
    SUPABASE_URL: 'https://project.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  })).toBe(false)
  expect(isStaffInvitationForwardingConfigured({
    K2_STAFF_INVITATIONS_ENABLED: 'true', SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  })).toBe(true)
  const noSession = response()
  await staffInvitationHandler(request('POST', { headers: {
    origin: 'https://admin.example.test', 'content-type': 'application/json',
    'x-k2-idempotency-key': '30000000-0000-4000-8000-000000000003',
  } }), noSession)
  expect(noSession.statusCode).toBe(401)
  expect(validateStaffInvitation({
    email: ' Staff@Example.Test ', role: 'Staff',
    reason: 'Add a warehouse operator for daily receiving.',
  })).toEqual({
    email: 'staff@example.test', role: 'Staff',
    reason: 'Add a warehouse operator for daily receiving.',
  })
  expect(() => validateStaffInvitation({ email: 'bad', role: 'Staff', reason: 'Operational need.' })).toThrow('REQUEST_INVALID')
  expect(() => validateStaffInvitation({ email: 'staff@example.test', role: 'Staff', reason: 'x' })).toThrow('REQUEST_INVALID')

  const calls = []
  const authorized = {
    client: { auth: { getSession: async () => ({ data: { session: { access_token: 'provider-access-token' } }, error: null }) } },
    identity: { userId: '10000000-0000-4000-8000-000000000001', role: 'Admin' },
  }
  const result = await forwardStaffInvitation(authorized, {
    origin: 'https://admin.example.test', idempotencyKey: '30000000-0000-4000-8000-000000000003',
    invitation: validateStaffInvitation({
      email: 'staff@example.test', role: 'Staff', reason: 'Add a warehouse operator for daily receiving.',
    }),
  }, async (url, init) => {
    calls.push({ url, init })
    return new Response(JSON.stringify({
      ok: true, email: 'staff@example.test', role: 'Staff', invited: true, roleAssigned: true,
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }, { supabaseUrl: 'https://project.supabase.co', publishableKey: 'sb_publishable_fixture' })
  expect(result).toEqual({ email: 'staff@example.test', role: 'Staff', invited: true })
  expect(calls[0].url).toBe('https://project.supabase.co/functions/v1/invite-staff')
  expect(calls[0].init.headers.Authorization).toBe('Bearer provider-access-token')
  expect(JSON.parse(calls[0].init.body)).toEqual({
    email: 'staff@example.test', role: 'Staff', reason: 'Add a warehouse operator for daily receiving.',
    redirectTo: 'https://admin.example.test',
  })
  expect(JSON.stringify(result)).not.toContain('provider-access-token')
})

test('system readiness is Admin-only, boolean-only, and never exposes raw diagnostics', async () => {
  const noSession = response()
  await systemReadinessHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)
  const migration = await readFile(new URL('../supabase/migrations/20260822_admin_system_readiness_boundary.sql', import.meta.url), 'utf8')
  const ui = await readFile(new URL('../src/views/admin/SystemDevOpsModal.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('read_admin_system_readiness_v1')
  expect(migration).toContain("'rawDiagnosticsExposed',false")
  expect(migration).toContain("'providerHealthVerified',false")
  expect(migration).not.toMatch(/select\s+\*\s+from\s+public\.error_reports/i)
  expect(ui).toContain('booleans only')
  expect(ui).toContain('do not prove')
  expect(ui).not.toContain("from('error_reports')")
})

test('durable Admin sessions use exact owner-bound signed commands', async () => {
  process.env.K2_ADMIN_BFF_REQUEST_SECRET = Buffer.alloc(32, 5).toString('base64')
  const sessionId = '6a88b5f9-8be6-4f4d-a504-173c96f40df1'
  const calls = []
  const client = {
    async rpc(name, args) {
      calls.push({ name, args })
      return { data: { active: true }, error: null }
    },
  }
  const result = await executeAdminSessionCommand(
    client,
    { userId: 'e74a4161-72ca-4d72-8f59-37aa690e1869' },
    'admin_session_validate',
    { sessionId },
  )
  expect(result).toEqual({ active: true })
  expect(calls[0].name).toBe('execute_admin_session_command_v1')
  expect(calls[0].args.p_action).toBe('admin_session_validate')
  expect(calls[0].args.p_signature).toMatch(/^[0-9a-f]{64}$/)
  expect(JSON.parse(calls[0].args.p_payload_text)).toEqual({ sessionId })
  expect(() => validateAdminSessionCommand('admin_session_validate', {
    sessionId, injected: true,
  })).toThrow('SESSION_REQUEST_INVALID')
  expect(() => validateAdminSessionCommand('admin_session_revoke_current', {
    sessionId, reason: 'x',
  })).toThrow('SESSION_REQUEST_INVALID')

  const limitedClient = {
    async rpc() {
      return { data: null, error: { message: 'K2_ADMIN_RATE_LIMITED' } }
    },
  }
  await expect(executeAdminSessionCommand(
    limitedClient,
    { userId: 'e74a4161-72ca-4d72-8f59-37aa690e1869' },
    'admin_session_validate',
    { sessionId },
  )).rejects.toThrow('SESSION_RATE_LIMITED')
})

test('product-master commands are exact, reasoned, idempotent, and Admin-only', async () => {
  const update = validateProductMasterCommand({
    action: 'update',
    payload: {
      sku: 'K2-MASTER-001',
      patch: { name: 'Reviewed product', net_weight: 400, srp: 125, is_human_reviewed: true },
      expectedUpdatedAt: '2026-08-22T00:00:00.000Z',
      reason: 'Correct verified catalogue details.',
    },
  })
  expect(update).toMatchObject({ action: 'product_master_update', payload: { sku: 'K2-MASTER-001' } })
  expect(validateProductMasterCommand({
    action: 'status', payload: { skus: ['K2-MASTER-001'], status: 'Under Review', reason: 'Ready for publication review.' },
  }).action).toBe('product_master_status')
  expect(validateProductMasterCommand({
    action: 'delete', payload: { skus: ['K2-MASTER-001'], pin: '4812', reason: 'Remove verified duplicate product.' },
  }).action).toBe('product_master_delete')
  expect(() => validateProductMasterCommand({
    action: 'update',
    payload: { sku: 'K2-MASTER-001', patch: { status: 'Live' }, expectedUpdatedAt: '2026-08-22T00:00:00Z', reason: 'Bypass publication review.' },
  })).toThrow('REQUEST_INVALID')
  expect(() => validateProductMasterCommand({
    action: 'update',
    payload: { sku: 'K2-MASTER-001', patch: { net_weight: '400' }, expectedUpdatedAt: '2026-08-22T00:00:00Z', reason: 'Wrong numeric representation.' },
  })).toThrow('REQUEST_INVALID')

  const noKey = response()
  await productMasterHandler(request('POST'), noKey)
  expect(noKey.statusCode).toBe(400)
  expect(JSON.parse(noKey.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')
  const noSession = response()
  await productMasterHandler(request('GET', { query: { sku: 'K2-MASTER-001' } }), noSession)
  expect(noSession.statusCode).toBe(401)

  const [migration, inventory, deletion] = await Promise.all([
    readFile(new URL('../supabase/migrations/20260822_admin_product_master_boundary.sql', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/admin/InventoryGrid.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/admin/DeleteProductsModal.jsx', import.meta.url), 'utf8'),
  ])
  for (const required of [
    'k2_private.product_master_events', 'execute_admin_product_master_command_v1',
    'K2_ADMIN_PRODUCT_VERSION_CONFLICT', 'K2_PUBLICATION_TRANSITION_INVALID',
    'K2_PUBLICATION_NOT_READY', 'delete_products_with_pin_v2',
    'revoke all on function public.delete_products_with_pin_v2(text[],text,text,uuid) from public,anon,authenticated',
  ]) expect(migration).toContain(required)
  expect(inventory).toContain("commandAdminProductMasterBff('update'")
  expect(inventory).toContain("commandAdminProductMasterBff('status'")
  expect(inventory).toContain('expectedUpdatedAt: editingProduct.updated_at')
  expect(deletion).toContain("commandAdminProductMasterBff('delete'")
})

test('prepared Admin session registry is private, AAL2-bound, and fail-closed', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260822_admin_session_registry.sql', import.meta.url), 'utf8')
  const login = await readFile(new URL('../prepared-api/admin/auth/login.js', import.meta.url), 'utf8')
  const authorize = await readFile(new URL('../server/admin-bff/authorize.js', import.meta.url), 'utf8')
  const logout = await readFile(new URL('../prepared-api/admin/auth/logout.js', import.meta.url), 'utf8')
  expect(migration).toContain('k2_private.admin_sessions')
  expect(migration).toContain("coalesce(auth.jwt()->>'aal', '') <> 'aal2'")
  expect(migration).toContain('where session_id = v_session_id and user_id = v_actor')
  expect(migration).toContain('revoke all on table k2_private.admin_sessions from public, anon, authenticated')
  expect(migration).toContain('admin_session_revoke_all')
  expect(migration).toContain('provider_session_id uuid not null unique')
  expect(migration).toContain("select 1 from auth.sessions where id=v_provider_session_id and user_id=v_actor")
  expect(migration).toContain("'provider_session_inactive'")
  expect(migration).toContain("revoked_reason='Provider session inactive'")
  expect(migration).toContain('k2_private.admin_session_events')
  expect(migration).toContain('k2_private.admin_request_rate_buckets')
  expect(migration).toContain("scope in ('actor', 'global')")
  expect(migration).toContain('if v_actor_hits > 360')
  expect(migration).toContain('if v_global_hits > 6000')
  expect(migration).toContain('revoke all on table k2_private.admin_request_rate_buckets from public, anon, authenticated')
  expect(migration).toContain("'session_validation_denied', 'denied'")
  expect(migration).not.toMatch(/admin_session_events[\s\S]{0,900}(access_token|refresh_token|user_agent|ip_address)/i)
  expect(migration).not.toMatch(/grant\s+(select|insert|update|delete)\s+on\s+(table\s+)?k2_private\.admin_sessions/i)
  expect(login.lastIndexOf('await registerAdminSession')).toBeLessThan(login.lastIndexOf('setPreparedActiveSessionCookies(res'))
  expect(authorize).toContain('validateAdminSession(client, identity, session)')
  expect(authorize).toContain("error?.message === 'SESSION_RATE_LIMITED'")
  expect(authorize).toContain("{ 'Retry-After': '60' }")
  expect(logout).toContain('revokeCurrentAdminSession(client, identity, session)')
  expect(logout).toContain('SESSION_REVOCATION_UNAVAILABLE')

  const listWithoutSession = response()
  await sessionsHandler(request('GET'), listWithoutSession)
  expect(listWithoutSession.statusCode).toBe(401)

  const revokeWithoutKey = response()
  await sessionsRevokeHandler(request('POST'), revokeWithoutKey)
  expect(revokeWithoutKey.statusCode).toBe(400)
  expect(JSON.parse(revokeWithoutKey.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  const revokeWithoutSession = response()
  await sessionsRevokeHandler(request('POST', {
    headers: {
      origin: 'https://admin.example.test',
      'content-type': 'application/json',
      'x-k2-idempotency-key': 'f8f55374-e8c2-42f0-9c8c-ce8c65efc4f7',
    },
  }), revokeWithoutSession)
  expect(revokeWithoutSession.statusCode).toBe(401)
})

test('single-function Admin router allowlists every prepared endpoint and rejects unknown paths', async () => {
  expect(ADMIN_BFF_ROUTES).toHaveLength(68)
  expect(new Set(ADMIN_BFF_ROUTES).size).toBe(68)
  expect(Object.keys(ADMIN_BFF_ROUTE_CONTROLS).sort()).toEqual([...ADMIN_BFF_ROUTES].sort())
  expect(ADMIN_BFF_ROUTE_CONTROLS['auth/login']).toEqual({
    method: 'POST', identity: 'credentials', origin: true, csrf: false,
    idempotency: false, rateLimit: 'database', bot: true,
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['auth/mfa']).toEqual({
    method: 'POST', identity: 'pending-session', origin: true, csrf: false,
    idempotency: false, rateLimit: 'database',
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['auth/logout']).toMatchObject({
    method: 'POST', identity: 'active-session', csrf: true, idempotency: false,
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['auth/password-recovery/request']).toEqual({
    method:'POST',identity:'preauth-email',origin:true,csrf:false,idempotency:false,rateLimit:'database',bot:true,
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['auth/password-recovery/verify']).toEqual({
    method:'GET',identity:'recovery-token-hash',origin:false,csrf:false,idempotency:false,rateLimit:'database',
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['auth/password-recovery/complete']).toEqual({
    method:'POST',identity:'recovery-session',origin:true,csrf:true,idempotency:false,rateLimit:'database',
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS.overview).toMatchObject({
    method: 'GET', identity: 'active-aal2-session', origin: true, csrf: false, idempotency: false,
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS.sessions).toMatchObject({
    method: 'GET', identity: 'active-aal2-session', origin: true, csrf: false,
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['sessions/revoke']).toMatchObject({
    method: 'POST', identity: 'active-aal2-session', origin: true, csrf: true, idempotency: true,
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['fulfillment/confirm']).toMatchObject({
    method: 'POST', identity: 'active-aal2-session', origin: true, csrf: true, idempotency: true,
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['product-intake/session']).toMatchObject({
    method: 'GET', identity: 'active-aal2-session', origin: true, csrf: false, idempotency: false,
    additionalMethods: {
      POST: { csrf: true, idempotency: true, rateLimit: 'database' },
    },
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['security-events']).toMatchObject({
    method:'GET',identity:'active-aal2-session',origin:true,csrf:false,idempotency:false,
    additionalMethods:{ POST:{ csrf:true,idempotency:true,rateLimit:'database' } },
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['wholesale-inquiries/review']).toMatchObject({
    method:'POST',identity:'active-aal2-session',origin:true,csrf:true,idempotency:true,
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['product-media']).toMatchObject({
    method:'POST',identity:'active-aal2-session',origin:true,csrf:true,idempotency:true,rateLimit:'database',
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['product-media/assign']).toMatchObject({
    method:'POST',identity:'active-aal2-session',origin:true,csrf:true,idempotency:true,rateLimit:'database',
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['product-master']).toMatchObject({
    method:'POST',identity:'active-aal2-session',origin:true,csrf:true,idempotency:true,rateLimit:'database',
    additionalMethods:{ GET:{ csrf:false,idempotency:false,rateLimit:'database' } },
  })
  expect(ADMIN_BFF_ROUTE_CONTROLS['staff-access/mfa-replacement']).toMatchObject({
    method:'POST',identity:'active-aal2-session',origin:true,csrf:true,idempotency:true,rateLimit:'database',
  })
  expect(Object.values(ADMIN_BFF_ROUTE_CONTROLS).filter((control) => control.method === 'POST')).toHaveLength(43)
  expect(Object.values(ADMIN_BFF_ROUTE_CONTROLS).filter((control) => control.idempotency)).toHaveLength(38)
  expect(extractAdminRoute({ query: { route: ['product-intake', 'session'] } }))
    .toBe('product-intake/session')
  expect(extractAdminRoute({ url: '/api/admin/fulfillment/confirm?ignored=true', query: {} }))
    .toBe('fulfillment/confirm')

  const routed = response()
  await adminBffRouter(request('GET', { query: { route: 'auth/login' } }), routed)
  expect(routed.statusCode).toBe(405)
  expect(routed.headers.get('allow')).toBe('POST')

  const intakeCreate = response()
  await adminBffRouter(request('POST', { query: { route: 'product-intake/session' } }), intakeCreate)
  expect(intakeCreate.statusCode).toBe(400)
  expect(JSON.parse(intakeCreate.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  const intakeWrongMethod = response()
  await adminBffRouter(request('DELETE', { query: { route: 'product-intake/session' } }), intakeWrongMethod)
  expect(intakeWrongMethod.statusCode).toBe(405)
  expect(intakeWrongMethod.headers.get('allow')).toBe('GET, POST')

  const unknown = response()
  await adminBffRouter(request('GET', { query: { route: '../internal' } }), unknown)
  expect(unknown.statusCode).toBe(404)
  expect(JSON.parse(unknown.body).error.code).toBe('NOT_FOUND')
  expect(boundedAdminCommandRoute('fulfillment', 'confirm')).toBe('/api/admin/fulfillment/confirm')
  expect(() => boundedAdminCommandRoute('fulfillment', '../auth/login')).toThrow('ADMIN_ROUTE_INVALID')
  expect(() => boundedAdminCommandRoute('unknown', 'read')).toThrow('ADMIN_ROUTE_INVALID')
})

test('deployable Admin entrypoint remains unavailable until its independent server switch is enabled', async () => {
  process.env.K2_ADMIN_BFF_ENABLED = 'false'
  const disabled = response()
  await adminEntrypoint(request('POST', { query: { route: 'auth/login' } }), disabled)
  expect(disabled.statusCode).toBe(404)

  process.env.K2_ADMIN_BFF_ENABLED = 'true'
  process.env.K2_DEPLOYMENT_TARGET = 'storefront'
  const wrongArtifact = response()
  await adminEntrypoint(request('POST', { query: { route: 'auth/login' } }), wrongArtifact)
  expect(wrongArtifact.statusCode).toBe(404)

  process.env.K2_DEPLOYMENT_TARGET = 'admin'
  const routed = response()
  await adminEntrypoint(request('GET', { query: { route: 'auth/login' } }), routed)
  expect(routed.statusCode).toBe(405)
  expect(routed.headers.get('allow')).toBe('POST')
})

test('failed intake evidence registration removes the unregistered private object', async () => {
  const calls = []
  const client = {
    storage: {
      from(bucket) {
        calls.push(['bucket', bucket])
        return {
          async remove(paths) {
            calls.push(['remove', paths])
            return { error: null }
          },
        }
      },
    },
  }
  const path = 'actor/session/primary-request-hash.png'
  await expect(removeUnregisteredEvidence(client, path)).resolves.toBe(true)
  expect(calls).toEqual([
    ['bucket', 'product-intake-evidence'],
    ['remove', [path]],
  ])
  await expect(removeUnregisteredEvidence(client, '')).resolves.toBe(false)
})

test('failed intake evidence cleanup is durable, retryable, and never exposes its private path', async () => {
  process.env.K2_ADMIN_BFF_REQUEST_SECRET = Buffer.alloc(32, 5).toString('base64')
  const actorId = '6a88b5f9-8be6-4f4d-a504-173c96f40df1'
  const sessionId = 'e74a4161-72ca-4d72-8f59-37aa690e1869'
  const requestId = '9c6bcb73-d41a-4217-8f60-c8dcaaf36723'
  const cleanupId = '6df7df67-60cf-4bc7-8975-c1987508621f'
  const objectPath = `${actorId}/${sessionId}/primary-${requestId}-6b86b273ff34fce1.png`
  const objectPathHash = createHash('sha256').update(objectPath, 'utf8').digest('hex')
  const calls = []
  const client = {
    async rpc(name, args) {
      calls.push(['rpc', name, args])
      if (name === 'record_admin_product_intake_evidence_cleanup_v1') {
        return { data: { cleanupId, status: 'pending' }, error: null }
      }
      if (name === 'claim_admin_product_intake_evidence_cleanup_v1') {
        return { data: { cleanupId, objectPath, objectPathHash, status: 'pending' }, error: null }
      }
      if (name === 'complete_admin_product_intake_evidence_cleanup_v1') {
        return { data: { cleanupId, status: 'completed' }, error: null }
      }
      throw new Error(`unexpected RPC ${name}`)
    },
    storage: {
      from(bucket) {
        expect(bucket).toBe('product-intake-evidence')
        return { remove: async (paths) => {
          calls.push(['remove', paths])
          return { error: null }
        } }
      },
    },
  }
  const identity = { userId: actorId, role: 'Staff' }
  const pending = await recordPendingEvidenceCleanup(
    client, identity, requestId, sessionId, objectPath,
  )
  expect(pending).toEqual({ cleanupId, status: 'pending' })

  const reconciled = await reconcilePendingEvidenceCleanup(
    client, identity, 'e2898343-a635-49a2-8546-a2ad33a9198a', cleanupId,
  )
  expect(reconciled).toEqual({ cleanupId, cleanupPending: false })
  expect(calls.find((call) => call[0] === 'remove')).toEqual(['remove', [objectPath]])
  expect(JSON.stringify(reconciled)).not.toContain(objectPath)
})

test('provider cleanup failure stays pending and is not falsely marked complete', async () => {
  process.env.K2_ADMIN_BFF_REQUEST_SECRET = Buffer.alloc(32, 5).toString('base64')
  const cleanupId = '6df7df67-60cf-4bc7-8975-c1987508621f'
  const objectPath = '6a88b5f9-8be6-4f4d-a504-173c96f40df1/e74a4161-72ca-4d72-8f59-37aa690e1869/back.png'
  const rpcNames = []
  const client = {
    async rpc(name) {
      rpcNames.push(name)
      return {
        data: {
          cleanupId, objectPath,
          objectPathHash: createHash('sha256').update(objectPath, 'utf8').digest('hex'),
          status: 'pending',
        },
        error: null,
      }
    },
    storage: { from: () => ({ remove: async () => ({ error: { message: 'provider unavailable' } }) }) },
  }
  const result = await reconcilePendingEvidenceCleanup(
    client,
    { userId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', role: 'Staff' },
    'e2898343-a635-49a2-8546-a2ad33a9198a',
    cleanupId,
  )
  expect(result).toEqual({ cleanupId, cleanupPending: true })
  expect(rpcNames).toEqual(['claim_admin_product_intake_evidence_cleanup_v1'])
})

test('flight consignment BFF is session/idempotency gated and validates exact scan truth', async () => {
  const noSession = response()
  await consignmentsHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const noIdempotency = response()
  await consignmentScanHandler(request('POST'), noIdempotency)
  expect(noIdempotency.statusCode).toBe(400)
  expect(JSON.parse(noIdempotency.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  const validScan = validateConsignmentCommand('consignment_scan', {
    consignmentId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1',
    itemId: 'e74a4161-72ca-4d72-8f59-37aa690e1869', stage: 'manila', scannedCode: '8001234567890',
  })
  expect(validScan.stage).toBe('manila')
  expect(validScan.scannedCode).toBe('8001234567890')
  expect(() => validateConsignmentCommand('consignment_scan', { ...validScan, quantity: 50 })).toThrow('REQUEST_INVALID')
  expect(() => validateConsignmentCommand('consignment_advance', {
    consignmentId: validScan.consignmentId, toStatus: 'Completed', reason: 'Skip receiving',
  })).toThrow('REQUEST_INVALID')
  expect(() => validateConsignmentCommand('consignment_finalize', {
    consignmentId: validScan.consignmentId, notes: 'short',
  })).toThrow('REQUEST_INVALID')
})

test('prepared flight boundary preserves unit scans, reasons, durable retry, and direct-RPC cutover', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_consignments_bff_boundary.sql', import.meta.url), 'utf8')
  const manager = await readFile(new URL('../src/views/admin/ConsignmentManager.jsx', import.meta.url), 'utf8')
  const reconciliation = await readFile(new URL('../src/views/admin/DiscrepancyReconciliationModal.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_consignment_command_v1')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain('K2_SCAN_CODE_MISMATCH')
  expect(migration).toContain("p_action='consignment_scan' then 300 else 30")
  expect(migration).toContain('revoke execute on function public.record_consignment_item_scan')
  expect(migration).toContain("'reason',trim(v_payload->>'reason')")
  expect(manager).toContain('adminBffEnabled()')
  expect(manager).toContain('recordConsignmentScanBff')
  expect(manager).toContain('commandKeysRef')
  expect(manager).not.toContain('window.confirm')
  expect(reconciliation).toContain('Finalize receipt and create lots')
})

test('customer BFF is session-gated and keeps canonical identities separate', async () => {
  const noSession = response()
  await customersHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const rows = {
    customers: { data: [{
      id: 'c1', display_name: 'Guest customer', status: 'active', created_source: 'website_guest',
      created_at: '2026-08-12T00:00:00Z', updated_at: '2026-08-12T00:00:00Z',
      customer_contact_points: [{ contact_kind: 'email', contact_value: 'guest@example.test', verification_status: 'unverified', source: 'website_guest' }],
      customer_accounts: [], channel_identities: [{ channel: 'website', link_status: 'unlinked' }],
    }], error: null },
    order_requests: { data: [{ id: 'o1', customer_id: 'c1', total_amount: 1500, status: 'submitted' }], error: null },
    pasabuy_requests: { data: [], error: null },
    conversations: { data: [{ id: 'x1', customer_id: 'c1', status: 'open', unread_count: 2 }], error: null },
  }
  const client = { from(table) { const chain = { select() { return chain }, order() { return chain }, in() { return chain }, limit() { return Promise.resolve(rows[table]) } }; return chain } }
  const result = await readAdminCustomers(client)
  expect(result.mode).toBe('canonical')
  expect(result.customers[0].account.linked).toBe(false)
  expect(result.customers[0].channels[0].linkStatus).toBe('unlinked')
  expect(result.customers[0].metrics.orderValue).toBe(1500)
})

test('Wholesale inquiry projection is staff/AAL2-only, fixed, and has no commercial authority', async () => {
  const noSession=response(); await wholesaleInquiriesHandler(request('GET'),noSession); expect(noSession.statusCode).toBe(401)
  const projected=[{publicReference:'WI-0123456789ABCDEF',conversationReference:'CV-0123456789ABCDEF',organizationName:'Launch Cafe',status:'submitted'}]
  const result=await readAdminWholesaleInquiries({rpc:async(name)=>({data:name==='list_admin_wholesale_inquiries_v1'?projected:null,error:null})})
  expect(result).toMatchObject({inquiries:projected,commercialAuthorityAvailable:false})
  const [migration,screen]=await Promise.all([
    readFile(new URL('../supabase/migrations/20260822_wholesale_inquiry_boundary.sql',import.meta.url),'utf8'),
    readFile(new URL('../src/views/admin/Customers.jsx',import.meta.url),'utf8'),
  ])
  for(const required of ["auth.jwt()->>'aal'",'list_admin_wholesale_inquiries_v1','limit 200',"grant execute on function public.list_admin_wholesale_inquiries_v1() to authenticated",'execute_admin_wholesale_inquiry_command_v1','wholesale_inquiry_events','commercialAuthorityAvailable']) expect(migration).toContain(required)
  expect(migration).not.toMatch(/price_list_id|credit_limit|pricing_approved|terms_approved/)
  for(const required of ['Wholesale inquiries','No commercial approval','inquiryError','getAdminWholesaleInquiries','Review inquiry','records triage only']) expect(screen).toContain(required)

  const noKey=response(); await wholesaleInquiryReviewHandler(request('POST'),noKey)
  expect(noKey.statusCode).toBe(400)
  expect(JSON.parse(noKey.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')
  expect(validateWholesaleInquiryReview({inquiryReference:'WI-0123456789ABCDEF',toStatus:'under_review',reason:'Qualified for staff review'})).toEqual({inquiryReference:'WI-0123456789ABCDEF',toStatus:'under_review',reason:'Qualified for staff review'})
  expect(()=>validateWholesaleInquiryReview({inquiryReference:'WI-0123456789ABCDEF',toStatus:'approved',reason:'Approve price'})).toThrow('REQUEST_INVALID')
  expect(()=>validateWholesaleInquiryReview({inquiryReference:'WI-0123456789ABCDEF',toStatus:'closed',reason:'Done',pricingApproved:true})).toThrow('REQUEST_INVALID')
})

test('coupon BFF is session/idempotency gated and validates exact financial rules', async () => {
  const noSession = response()
  await couponsHandler(request('GET'), noSession)
  expect(noSession.statusCode).toBe(401)

  const noIdempotency = response()
  await couponCreateHandler(request('POST'), noIdempotency)
  expect(noIdempotency.statusCode).toBe(400)
  expect(JSON.parse(noIdempotency.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  const valid = validateCouponCommand('coupon_create', {
    code: 'MILANO10', description: 'August direct-store campaign',
    discountType: 'percentage', discountValue: 10, minSpend: 1000,
    maxRedemptions: 100, startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    isActive: false, isHunt: false, clue: null,
    reason: 'Approved August direct-store campaign.',
  })
  expect(valid.code).toBe('MILANO10')
  expect(() => validateCouponCommand('coupon_create', { ...valid, discountValue: 101 })).toThrow('REQUEST_INVALID')
  expect(() => validateCouponCommand('coupon_create', { ...valid, surprise: true })).toThrow('REQUEST_INVALID')
  expect(() => validateCouponCommand('coupon_state', {
    couponId: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', active: true, reason: 'short',
  })).toThrow('REQUEST_INVALID')
})

test('prepared coupon boundary is admin-only, reasoned, auditable, and feature-gated', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_coupons_bff_boundary.sql', import.meta.url), 'utf8')
  const server = await readFile(new URL('../server/admin-bff/coupons.js', import.meta.url), 'utf8')
  const manager = await readFile(new URL('../src/views/admin/CouponManager.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_coupon_command_v1')
  expect(migration).toContain('coupon_change_events')
  expect(migration).toContain("role::text='Admin'")
  expect(migration).toContain('K2_COUPON_STATE_CONFLICT')
  expect(migration).toContain('revoke insert,update,delete on table public.coupons from authenticated')
  expect(server).toContain("authorized.identity.role !== 'Admin'")
  expect(server).not.toContain("select('*')")
  expect(manager).toContain('adminBffEnabled()')
  expect(manager).toContain('createCouponBff')
  expect(manager).toContain('Reason for creating this promotion')
  expect(manager).not.toContain('window.confirm')
  expect(manager).not.toContain('loadError.message)')
})

test('lot and expiry BFF is session/idempotency gated and rejects unsafe reconciliation input', async () => {
  const noSession = response()
  await lotsHandler(request('GET', { query: { sku: 'SKU-1' } }), noSession)
  expect(noSession.statusCode).toBe(401)

  const noIdempotency = response()
  await lotReconcileHandler(request('POST'), noIdempotency)
  expect(noIdempotency.statusCode).toBe(400)
  expect(JSON.parse(noIdempotency.body).error.code).toBe('IDEMPOTENCY_KEY_REQUIRED')

  const valid = validateLotCommand('lots_reconcile', {
    sku: 'SKU-1', reason: 'Manila physical recount after shelf transfer.',
    lots: [{
      id: '6a88b5f9-8be6-4f4d-a504-173c96f40df1', boxCode: 'MIL-104',
      batchCode: 'B-2026-08', quantity: 12, expiryDate: '2027-08-12',
      landedDate: '2026-08-12', hub: 'Manila Hub', custodian: 'Main stock room',
      channel: '', pinned: false, status: 'available',
    }],
  })
  expect(valid.lots[0].quantity).toBe(12)
  expect(() => validateLotCommand('lots_reconcile', {
    ...valid, reason: 'short',
  })).toThrow('REQUEST_INVALID')
  expect(() => validateLotCommand('lots_reconcile', {
    ...valid, lots: [{ ...valid.lots[0], hub: '' }],
  })).toThrow('REQUEST_INVALID')
  expect(() => validateLotCommand('lot_clearance', {
    batchId: valid.lots[0].id, approved: 'yes', reason: 'Owner approved disclosed clearance.',
  })).toThrow('REQUEST_INVALID')
})

test('prepared lot boundary derives sellable stock, preserves reservations, and replaces prompt-based decisions', async () => {
  const migration = await readFile(new URL('../supabase/migrations/20260812_admin_lots_bff_boundary.sql', import.meta.url), 'utf8')
  const editor = await readFile(new URL('../src/views/admin/BatchExpiryManagerModal.jsx', import.meta.url), 'utf8')
  const alerts = await readFile(new URL('../src/views/admin/DailyTaskNotificationDrawer.jsx', import.meta.url), 'utf8')
  expect(migration).toContain('execute_admin_lot_command_v1')
  expect(migration).toContain('admin_command_receipts')
  expect(migration).toContain('K2_LOT_RESERVED_CONFLICT')
  expect(migration).toContain('quantity_available=v_available')
  expect(migration).toContain('sum(quantity_available)')
  expect(migration).toContain('where b.quantity>0')
  expect(migration).toContain('revoke execute on function public.reconcile_product_batches')
  expect(editor).toContain('adminBffEnabled()')
  expect(editor).toContain('reconcileLotsBff')
  expect(editor).toContain('reserved units')
  expect(editor).not.toContain('window.prompt')
  expect(editor).not.toContain('Batch editor reconciliation')
  expect(alerts).toContain('getAdminLots')
  expect(alerts).not.toMatch(/[🔔✅📍🙋🛒]/u)
})
