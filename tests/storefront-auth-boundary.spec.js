import { expect, test } from '@playwright/test'
import { createHmac } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

function response() {
  const headers = new Map()
  return {
    headers, statusCode: 0, body: '',
    setHeader(name, value) { headers.set(name.toLowerCase(), value) },
    end(value = '') { this.body = value },
  }
}

function request(body, ip = '203.0.113.61') {
  return {
    method: 'POST',
    headers: { origin: 'https://shop.example.test', 'content-type': 'application/json' },
    socket: { remoteAddress: ip },
    body,
  }
}

test.beforeEach(() => {
  process.env.NODE_ENV = 'production'
  process.env.K2_DEPLOYMENT_TARGET = 'storefront'
  process.env.K2_STOREFRONT_BFF_ENABLED = 'true'
  process.env.K2_STOREFRONT_ORIGINS = 'https://shop.example.test'
  process.env.K2_GUEST_BFF_SECRET = Buffer.alloc(32, 21).toString('base64')
})

test('customer Auth payloads and HMAC subjects are exact and never expose raw identifiers', async () => {
  const auth = await import('../server/storefront-bff/customer-auth.js')
  const rate = await import('../server/storefront-bff/preauth-rate.js')

  expect(auth.validateCustomerEmailAuth({ email: ' Buyer@Example.Test ', botToken: 'verified-turnstile-token' }))
    .toEqual({ email: 'buyer@example.test', botToken: 'verified-turnstile-token' })
  expect(auth.validateCustomerPhoneAuth({ phone: '+63 917 123 4567', botToken: 'verified-turnstile-token' }))
    .toEqual({ phone: '+639171234567', botToken: 'verified-turnstile-token' })
  expect(auth.validateCustomerPhoneVerification({ phone: '+639171234567', code: '123456' }))
    .toEqual({ phone: '+639171234567', code: '123456' })
  expect(() => auth.validateCustomerEmailAuth({ email: 'buyer@example.test', botToken: 'verified-turnstile-token', redirect: 'https://evil.test' }))
    .toThrow('CUSTOMER_AUTH_REQUEST_INVALID')
  expect(() => auth.validateCustomerEmailAuth({ email: 'buyer@example.test', botToken: '' }))
    .toThrow('CUSTOMER_AUTH_REQUEST_INVALID')
  expect(() => auth.validateCustomerPhoneVerification({ phone: '+639171234567', code: '123456', role: 'Admin' }))
    .toThrow('CUSTOMER_AUTH_REQUEST_INVALID')

  const req = request({ email: 'buyer@example.test' })
  const args = rate.signedStorefrontPreauthRateArguments(
    req, 'customer_auth_email_request', 'buyer@example.test',
  )
  expect(args.p_action).toBe('customer_auth_email_request')
  expect(args.p_ip_hash).toMatch(/^[0-9a-f]{64}$/)
  expect(args.p_subject_hash).toMatch(/^[0-9a-f]{64}$/)
  expect(JSON.stringify(args)).not.toContain('203.0.113.61')
  expect(JSON.stringify(args)).not.toContain('buyer@example.test')
  const message = [args.p_action, args.p_timestamp, args.p_nonce, args.p_ip_hash, args.p_subject_hash].join('\n')
  expect(args.p_signature).toBe(createHmac('sha256', Buffer.alloc(32, 21)).update(message).digest('hex'))
  const phoneArgs = rate.signedStorefrontPreauthRateArguments(
    req, 'customer_auth_sms_request', '+639171234567',
  )
  const verifyArgs = rate.signedStorefrontPreauthRateArguments(
    req, 'customer_auth_sms_verify', '+639171234567',
  )
  expect(phoneArgs.p_subject_hash).not.toBe(verifyArgs.p_subject_hash)
  expect(() => rate.signedStorefrontPreauthRateArguments(req, 'unknown', 'buyer@example.test'))
    .toThrow('CUSTOMER_AUTH_RATE_UNAVAILABLE')
})

test('durable customer Auth denials happen before every provider email, SMS, or verification call', async () => {
  const auth = await import('../server/storefront-bff/customer-auth.js')
  let providerCalls = 0
  const client = { auth: {
    async signInWithOtp() { providerCalls += 1; return { error: null } },
    async verifyOtp() { providerCalls += 1; return { data: null, error: null } },
  } }
  const overrides = {
    createStorefrontServerSupabase: () => client,
    consumeStorefrontPreauthRate: async () => ({ allowed: false, retryAfter: 347 }),
    verifyBotChallenge: async () => { throw new Error('BOT_CHECK_MUST_NOT_RUN') },
  }
  const cases = [
    [auth.createCustomerEmailAuthHandler(overrides), { email: 'buyer@example.test', botToken: 'verified-turnstile-token' }],
    [auth.createCustomerPhoneAuthHandler(overrides), { phone: '+639171234567', botToken: 'verified-turnstile-token' }],
    [auth.createCustomerPhoneVerifyHandler(overrides), { phone: '+639171234567', code: '123456' }],
  ]
  for (const [handler, body] of cases) {
    const res = response()
    await handler(request(body), res)
    expect(res.statusCode).toBe(429)
    expect(res.headers.get('retry-after')).toBe('347')
    expect(JSON.parse(res.body).error.code).toBe('RATE_LIMITED')
  }
  expect(providerCalls).toBe(0)
})

test('customer Auth issuance bot denial happens after durable budget consumption and before provider delivery', async () => {
  const auth = await import('../server/storefront-bff/customer-auth.js')
  const calls = []
  const client = { auth: {
    async signInWithOtp() { calls.push('provider'); return { error: null } },
  } }
  const overrides = {
    createStorefrontServerSupabase: () => client,
    consumeStorefrontPreauthRate: async () => { calls.push('budget'); return { allowed: true, retryAfter: 0 } },
    verifyBotChallenge: async (token, ip, action) => {
      calls.push(['bot', token, ip, action])
      return false
    },
  }
  for (const [handler, body] of [
    [auth.createCustomerEmailAuthHandler(overrides), { email: 'buyer@example.test', botToken: 'verified-turnstile-token' }],
    [auth.createCustomerPhoneAuthHandler(overrides), { phone: '+639171234567', botToken: 'verified-turnstile-token' }],
  ]) {
    calls.length = 0
    const res = response()
    await handler(request(body), res)
    expect(res.statusCode).toBe(403)
    expect(JSON.parse(res.body).error.code).toBe('BOT_CHALLENGE_REQUIRED')
    expect(calls).toEqual(['budget', ['bot', 'verified-turnstile-token', '203.0.113.61', 'customer_auth']])
  }
})

test('customer Auth BFF preserves generic delivery truth and returns only a bounded SMS session', async () => {
  const auth = await import('../server/storefront-bff/customer-auth.js')
  const calls = []
  const client = { auth: {
    async signInWithOtp(payload) { calls.push(['send', payload]); return { error: null } },
    async verifyOtp(payload) {
      calls.push(['verify', payload])
      return { data: { session: {
        access_token: 'customer-access-token', refresh_token: 'customer-refresh-token',
        expires_at: 1787625000, token_type: 'bearer', user: { email: 'private@example.test' },
      } }, error: null }
    },
  } }
  const overrides = {
    createStorefrontServerSupabase: () => client,
    consumeStorefrontPreauthRate: async () => ({ allowed: true, retryAfter: 0 }),
    verifyBotChallenge: async () => true,
  }

  const email = response()
  await auth.createCustomerEmailAuthHandler(overrides)(request({ email: 'buyer@example.test', botToken: 'verified-turnstile-token' }), email)
  expect(email.statusCode).toBe(202)
  expect(JSON.parse(email.body)).toEqual({ ok: true })
  expect(calls[0][1].options.emailRedirectTo).toBe('https://shop.example.test/?account=continue')

  const phone = response()
  await auth.createCustomerPhoneAuthHandler(overrides)(request({ phone: '+639171234567', botToken: 'verified-turnstile-token' }), phone)
  expect(phone.statusCode).toBe(202)

  const verified = response()
  await auth.createCustomerPhoneVerifyHandler(overrides)(request({
    phone: '+639171234567', code: '123456',
  }), verified)
  expect(verified.statusCode).toBe(200)
  expect(JSON.parse(verified.body)).toEqual({
    ok: true,
    session: { accessToken: 'customer-access-token', refreshToken: 'customer-refresh-token' },
  })
  expect(verified.body).not.toContain('private@example.test')
})

test('customer account browser service uses only fixed same-origin Auth routes', async () => {
  const [service, routes, router] = await Promise.all([
    source('src/services/customerAccountService.js'),
    import('../src/services/guestCommerceRoutes.js'),
    import('../server/storefront-bff/router.js'),
  ])
  for (const path of ['account/auth/email', 'account/auth/phone']) {
    expect(routes.GUEST_BFF_CLIENT_ROUTES).toContain(path)
    expect(router.STOREFRONT_BFF_ROUTES).toContain(path)
    expect(router.STOREFRONT_BFF_ROUTE_CONTROLS[path]).toMatchObject({
      method: 'POST', origin: true, signed: true, databaseRateLimit: true,
      bot: true, guestGrant: 'none', accountAuth: 'preauth', idempotency: false,
    })
  }
  expect(router.STOREFRONT_BFF_ROUTE_CONTROLS['account/auth/verify']).toMatchObject({
    method: 'POST', origin: true, signed: true, databaseRateLimit: true,
    bot: false, guestGrant: 'none', accountAuth: 'preauth', idempotency: false,
  })
  expect(service).not.toContain('signInWithOtp')
  expect(service).not.toContain('verifyOtp')
  expect(service).toContain("accountAuthRequest('account/auth/email'")
  expect(service).toContain("accountAuthRequest('account/auth/phone'")
  expect(service).toContain("accountAuthRequest('account/auth/verify'")
  expect(service).toContain('client.auth.setSession')
})
