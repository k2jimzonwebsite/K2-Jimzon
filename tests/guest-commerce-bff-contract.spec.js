import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import accountClaimHandler, { validateAccountClaim } from '../prepared-api/storefront/account/claim.js'
import accountHistoryHandler from '../prepared-api/storefront/account/history.js'
import accountMessageHandler, { validateAccountMessage } from '../prepared-api/storefront/account/message.js'
import orderHandler from '../prepared-api/storefront/order.js'
import orderStatusHandler from '../prepared-api/storefront/order/status.js'
import pasabuyHandler from '../prepared-api/storefront/pasabuy.js'
import couponHandler from '../prepared-api/storefront/coupon.js'
import messagesHandler from '../prepared-api/storefront/messages.js'
import messageHandler from '../prepared-api/storefront/message.js'
import conversationHandler from '../prepared-api/storefront/conversation.js'
import wholesaleHandler, { validateWholesaleInquiry } from '../prepared-api/storefront/wholesale.js'
import storefrontBffRouter, {
  STOREFRONT_BFF_ROUTES, STOREFRONT_BFF_ROUTE_CONTROLS, extractStorefrontRoute,
} from '../server/storefront-bff/router.js'
import storefrontEntrypoint from '../api/storefront/index.js'
import {
  GUEST_BFF_CLIENT_ROUTES, guestBffEndpoint, isGuestBffRoute,
} from '../src/services/guestCommerceRoutes.js'
import { authorizationBearer, signedRpcArguments } from '../server/storefront-bff/security.js'
import { addCartItems, productStock, validateCartForSubmission } from '../src/lib/cartInventory.js'

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('cart inventory commands reject zero, unknown, repeated, stale, and partial bundle additions', () => {
  const available = { id: 'A', sku: 'A', stock_available: 1 }
  const partner = { id: 'B', sku: 'B', stock_available: 1 }
  const soldOut = { id: 'ZERO', sku: 'ZERO', stock_available: 0 }
  const unknown = { id: 'UNKNOWN', sku: 'UNKNOWN', stock_available: null, stock: null }

  expect(productStock(unknown)).toBeNull()
  expect(addCartItems([], [soldOut], [{ id: 'ZERO', qty: 1 }])).toMatchObject({ ok: false, code: 'OUT_OF_STOCK', cart: [] })
  expect(addCartItems([], [unknown], [{ id: 'UNKNOWN', qty: 1 }])).toMatchObject({ ok: false, code: 'STOCK_UNKNOWN', cart: [] })

  const first = addCartItems([], [available], [{ id: 'A', qty: 1 }])
  expect(first).toEqual({ ok: true, code: null, cart: [{ id: 'A', qty: 1 }] })
  const repeated = addCartItems(first.cart, [available], [{ id: 'A', qty: 1 }])
  expect(repeated).toMatchObject({ ok: false, code: 'INSUFFICIENT_STOCK' })
  expect(repeated.cart).toBe(first.cart)

  expect(addCartItems([], [available, soldOut], [
    { id: 'A', qty: 1 }, { id: 'ZERO', qty: 1 },
  ])).toMatchObject({ ok: false, cart: [] })
  expect(addCartItems([], [available, partner], [
    { id: 'A', qty: 1 }, { id: 'B', qty: 1 },
  ])).toEqual({ ok: true, code: null, cart: [{ id: 'A', qty: 1 }, { id: 'B', qty: 1 }] })

  expect(validateCartForSubmission([{ id: 'A', qty: 1 }], [{ ...available, stock_available: 0 }]))
    .toEqual({ ok: false, code: 'OUT_OF_STOCK', id: 'A' })
  expect(validateCartForSubmission([{ id: 'A', qty: 1 }], [{ ...available, stock_available: null, stock: null }]))
    .toEqual({ ok: false, code: 'STOCK_UNKNOWN', id: 'A' })
  expect(validateCartForSubmission([{ id: 'A', qty: 2 }], [available]))
    .toEqual({ ok: false, code: 'INSUFFICIENT_STOCK', id: 'A' })
})

test('storefront public copy does not claim unverified stock sync or a Pasabuy response SLA', async () => {
  const [hero, store] = await Promise.all([
    source('src/components/home/Hero.jsx'),
    source('src/context/StoreContext.jsx'),
  ])
  expect(hero).not.toMatch(/multi-channel stock sync/i)
  expect(hero).toContain('Availability checked before payment')
  expect(store).not.toMatch(/quote review within 24 hours/i)
  expect(store).toContain("eta: 'Staff review required'")
})

test('production Storefront excludes the prototype VIP direct-auth rail', async () => {
  const [storefront, combined, verifier] = await Promise.all([
    source('src/StorefrontApp.jsx'),
    source('src/App.jsx'),
    source('scripts/verify-build-boundary.mjs'),
  ])
  expect(storefront).not.toContain('DemoRail')
  expect(storefront).not.toContain("hash === '#demo'")
  expect(combined).toContain('DemoRail')
  expect(verifier).toContain('/VIP Portal Login/')
  expect(verifier).toContain('/Authenticate to unlock tier pricing/')
})

function response() {
  const headers = new Map()
  return {
    headers, statusCode: 0, body: '',
    setHeader(name, value) { headers.set(name.toLowerCase(), value) },
    end(value = '') { this.body = value },
  }
}

function request(method='POST', origin='https://shop.example.test') {
  return {
    method,
    headers: { origin, 'content-type': 'application/json' },
    socket: { remoteAddress: '127.0.0.1' },
    body: {},
  }
}

test.beforeEach(() => {
  process.env.NODE_ENV = 'production'
  process.env.K2_DEPLOYMENT_TARGET = 'storefront'
  process.env.K2_STOREFRONT_BFF_ENABLED = 'true'
  process.env.K2_STOREFRONT_ORIGINS = 'https://shop.example.test'
  process.env.K2_GUEST_BFF_SECRET = Buffer.alloc(32, 21).toString('base64')
})

test('single-function Storefront router allowlists every prepared endpoint and rejects unknown paths', async () => {
  expect(STOREFRONT_BFF_ROUTES.length).toBeGreaterThan(0)
  expect(new Set(STOREFRONT_BFF_ROUTES).size).toBe(STOREFRONT_BFF_ROUTES.length)
  expect(Object.keys(STOREFRONT_BFF_ROUTE_CONTROLS).sort()).toEqual([...STOREFRONT_BFF_ROUTES].sort())
  expect(Object.values(STOREFRONT_BFF_ROUTE_CONTROLS).every((control) =>
    control.method === 'POST' && control.origin && control.signed && control.databaseRateLimit)).toBe(true)
  expect(Object.entries(STOREFRONT_BFF_ROUTE_CONTROLS)
    .filter(([, control]) => control.bot).map(([route]) => route).sort()).toEqual([
      'account/auth/email', 'account/auth/phone', 'conversation', 'order', 'pasabuy', 'wholesale',
    ])
  expect(STOREFRONT_BFF_ROUTE_CONTROLS.message).toMatchObject({
    guestGrant: 'required', idempotency: true,
  })
  expect(STOREFRONT_BFF_ROUTE_CONTROLS['order/status']).toMatchObject({
    guestGrant: 'required', idempotency: false, bot: false,
  })
  expect(STOREFRONT_BFF_ROUTE_CONTROLS['account/claim']).toMatchObject({
    guestGrant: 'required', accountAuth: 'required', idempotency: true,
  })
  expect(STOREFRONT_BFF_ROUTE_CONTROLS['account/history']).toMatchObject({
    guestGrant: 'none', accountAuth: 'required', idempotency: false,
  })
  expect(STOREFRONT_BFF_ROUTE_CONTROLS['account/message']).toMatchObject({
    guestGrant: 'none', accountAuth: 'required', idempotency: true,
  })
  expect(extractStorefrontRoute({ query: { route: ['order'] } })).toBe('order')
  expect(extractStorefrontRoute({ url: '/api/storefront/messages?cursor=next', query: {} }))
    .toBe('messages')

  const routed = response()
  await storefrontBffRouter({ ...request('GET'), query: { route: 'pasabuy' } }, routed)
  expect(routed.statusCode).toBe(405)

  const unknown = response()
  await storefrontBffRouter({ ...request('GET'), query: { route: '../admin' } }, unknown)
  expect(unknown.statusCode).toBe(404)
  expect(JSON.parse(unknown.body).error.code).toBe('NOT_FOUND')
  expect(isGuestBffRoute('order')).toBe(true)
  expect(isGuestBffRoute('../admin')).toBe(false)
  expect(guestBffEndpoint('order')).toBe('/api/storefront/order')
  expect(guestBffEndpoint('order/status')).toBe('/api/storefront/order/status')
  expect(guestBffEndpoint('account/claim')).toBe('/api/storefront/account/claim')
  expect(guestBffEndpoint('account/history')).toBe('/api/storefront/account/history')
  expect([...GUEST_BFF_CLIENT_ROUTES].sort()).toEqual([...STOREFRONT_BFF_ROUTES].sort())
})

test('guest order status is read only through the scoped browser grant', async () => {
  const denied = response()
  await orderStatusHandler({ ...request('GET'), body: {} }, denied)
  expect(denied.statusCode).toBe(405)

  const [handler, migration] = await Promise.all([
    source('prepared-api/storefront/order/status.js'),
    source('supabase/migrations/20260831_guest_order_status_boundary.sql'),
  ])
  for (const required of [
    'read_guest_order_status_v1', "signedRpcArguments(req, 'guest_read', {})",
    'ORDER_STATUS_SERVICE_UNAVAILABLE',
  ]) expect(handler).toContain(required)
  for (const required of [
    'security definer', "set search_path = ''", "token_hash=decode(p_guest_grant_hash,'hex')",
    "scope_kind='order_request'", "'read'=any(s.permissions)", 'public_reference',
    'payment_status', 'total_amount', 'created_at',
    'revoke all on function public.read_guest_order_status_v1',
    'grant execute on function public.read_guest_order_status_v1',
  ]) expect(migration).toContain(required)
  expect(migration).not.toMatch(/customer_(?:name|email|phone)|delivery_address/i)
})

test('wholesale inquiry is exact, bot-gated, signed, and structurally unable to grant commercial authority', async () => {
  const idempotencyKey=crypto.randomUUID()
  const valid={organizationName:'Launch Cafe',businessType:'cafe_restaurant',customerName:'Maria Buyer',contactRole:'Owner',email:'buyer@example.com',phone:'',deliveryArea:'Makati City',volumeBand:'starter',targetItems:'Coffee beans',notes:'',idempotencyKey,botToken:'test-token'}
  expect(validateWholesaleInquiry(valid).payload).toMatchObject({organizationName:'Launch Cafe',volumeBand:'starter'})
  for(const forbidden of ['pricingApproved','creditLimit','termsApproved','customerId','organizationId']) {
    expect(()=>validateWholesaleInquiry({...valid,[forbidden]:true})).toThrow('REQUEST_INVALID')
  }
  expect(signedRpcArguments(request(),'wholesale_inquiry',valid).p_guest_grant_hash).toBeNull()
  const denied=response(); await wholesaleHandler({...request('GET'),body:{}},denied); expect(denied.statusCode).toBe(405)
  const [handler,migration]=await Promise.all([source('prepared-api/storefront/wholesale.js'),source('supabase/migrations/20260822_wholesale_inquiry_boundary.sql')])
  for(const required of ['verifyBotChallenge','submit_wholesale_inquiry_v1','pricing_approved:false','credit_approved:false','terms_approved:false']) expect(handler).toContain(required)
  for(const required of ['force row level security','wholesale_inquiry_receipts','IDEMPOTENCY_CONFLICT',"response_due_at)","'wholesale_inquiry'"]) expect(migration).toContain(required)
  expect(migration).not.toMatch(/price_list_id|credit_limit|pricing_approved|terms_approved/)
})

test('account continuity routes require customer auth and do not depend on the revoked guest grant', async () => {
  const readArgs = signedRpcArguments(request(), 'account_read', {})
  expect(readArgs.p_guest_grant_hash).toBeUndefined()
  const replyArgs = signedRpcArguments(request(), 'account_reply', {
    conversationReference: 'CV-0123456789ABCDEF', message: 'Please confirm.', idempotencyKey: crypto.randomUUID(),
  })
  expect(replyArgs.p_guest_grant_hash).toBeUndefined()
  expect(validateAccountMessage({
    conversationReference: 'CV-0123456789ABCDEF', message: 'Please confirm.', idempotencyKey: crypto.randomUUID(),
  })).toMatchObject({ conversationReference: 'CV-0123456789ABCDEF' })
  expect(() => validateAccountMessage({
    conversationReference: 'CV-0123456789ABCDEF', message: 'Hello', idempotencyKey: crypto.randomUUID(), customerId: 'guessed',
  })).toThrow('REQUEST_INVALID')

  for (const handler of [accountHistoryHandler, accountMessageHandler]) {
    const missingAuth = response()
    await handler({ ...request(), body: {} }, missingAuth)
    expect(missingAuth.statusCode).toBe(401)
    expect(JSON.parse(missingAuth.body).error.code).toBe('ACCOUNT_AUTH_REQUIRED')
  }
})

test('account continuity projection is owner-scoped, bounded, and excludes internal messages', async () => {
  const [migration, historyHandler, messageHandler] = await Promise.all([
    source('supabase/migrations/20260822_guest_account_claim_boundary.sql'),
    source('prepared-api/storefront/account/history.js'),
    source('prepared-api/storefront/account/message.js'),
  ])
  for (const required of [
    'list_customer_account_history_v1', 'append_customer_account_message_v1',
    "user_id=auth.uid() and status='active'", 'where customer_id=v_account.customer_id',
    "delivery_status<>'internal_only'", 'order by created_at desc limit 20',
    'order by last_message_at desc limit 20', "v_key:='account:'||auth.uid()::text",
  ]) expect(migration).toContain(required)
  expect(historyHandler).toContain('client.auth.getUser(accessToken)')
  expect(messageHandler).toContain('client.auth.getUser(accessToken)')
  expect(historyHandler).not.toMatch(/customer_email|customer_phone|delivery_address|staff|raw/i)
  expect(messageHandler).not.toMatch(/customerId|userId/)
})

test('customer account UI is independently gated, passwordless, honest, and keeps account outside primary mobile navigation', async () => {
  const [service, accountHook, accountUi, header, mobileNav, storefront, env] = await Promise.all([
    source('src/services/customerAccountService.js'), source('src/hooks/useCustomerAccount.js'),
    source('src/views/CustomerAccount.jsx'),
    source('src/components/StoreHeader.jsx'), source('src/components/nav/MobileNavBar.jsx'),
    source('src/StorefrontApp.jsx'), source('.env.example'),
  ])
  expect(service).toContain("VITE_CUSTOMER_ACCOUNT_ENABLED === 'true'")
  expect(service).toContain('guestBffEnabled()')
  expect(service).not.toContain('signInWithOtp')
  expect(service).not.toContain('verifyOtp')
  expect(service).toContain("accountAuthRequest('account/auth/email'")
  expect(service).toContain("accountAuthRequest('account/auth/phone'")
  expect(service).toContain("accountAuthRequest('account/auth/verify'")
  expect(service).toContain('client.auth.setSession')
  expect(service).not.toContain('signInWithPassword')
  expect(service).toContain('Authorization: `Bearer ${accessToken}`')
  expect(accountHook).toContain('await customerAuthClient()')
  expect(accountHook).not.toContain('const client = customerAuthClient()')
  expect(header).toContain('customerAccountEnabled()')
  expect(header).toContain('Customer account')
  expect(mobileNav).not.toContain("key: 'account'")
  expect(storefront).toContain("import('./views/CustomerAccount')")
  expect(env).toContain('VITE_CUSTOMER_ACCOUNT_ENABLED=false')
  for (const required of [
    'No password to remember.', 'No automatic identity merge from matching text.',
    'No VIP or wholesale pricing promise.', 'You are offline.',
    'Link verified guest records', 'customer-visible Website messages',
  ]) expect(accountUi).toContain(required)
  expect(accountUi).toContain('min-h-12')
  expect(accountUi).toContain('role="alert"')
})

test('account claim requires exact origin, customer bearer auth, and a bounded payload', async () => {
  expect(validateAccountClaim({ contactKind: 'email', idempotencyKey: crypto.randomUUID() }))
    .toMatchObject({ contactKind: 'email' })
  expect(() => validateAccountClaim({ contactKind: 'sms', idempotencyKey: crypto.randomUUID() }))
    .toThrow('CONTACT_KIND_INVALID')
  expect(() => validateAccountClaim({ contactKind: 'email', idempotencyKey: crypto.randomUUID(), customerId: 'guessed' }))
    .toThrow('REQUEST_INVALID')
  expect(authorizationBearer({ headers: { authorization: `Bearer ${'a'.repeat(20)}` } })).toBe('a'.repeat(20))
  expect(authorizationBearer({ headers: { authorization: 'Basic unsafe' } })).toBeNull()

  const missingAuth = response()
  await accountClaimHandler({ ...request(), body: {
    contactKind: 'email', idempotencyKey: crypto.randomUUID(),
  } }, missingAuth)
  expect(missingAuth.statusCode).toBe(401)
  expect(JSON.parse(missingAuth.body).error.code).toBe('ACCOUNT_AUTH_REQUIRED')

  const wrongOrigin = response()
  await accountClaimHandler({ ...request('POST', 'https://evil.example'), headers: {
    ...request().headers, origin: 'https://evil.example', authorization: `Bearer ${'a'.repeat(20)}`,
  } }, wrongOrigin)
  expect(wrongOrigin.statusCode).toBe(403)
})

test('prepared account claim is verified-contact, guest-scoped, conflict-safe, one-time, and auditable', async () => {
  const [migration, handler, supabaseServer] = await Promise.all([
    source('supabase/migrations/20260822_guest_account_claim_boundary.sql'),
    source('prepared-api/storefront/account/claim.js'),
    source('server/storefront-bff/supabase.js'),
  ])
  for (const required of [
    "auth.uid() is null", "email_confirmed_at is not null", "phone_confirmed_at is not null",
    "token_hash=decode(p_guest_grant_hash,'hex')", "CLAIM_CONTACT_MISMATCH",
    "ACCOUNT_IDENTITY_CONFLICT", "IDEMPOTENCY_CONFLICT", "status='consumed'",
    "revoke_reason='claimed_by_verified_account'", 'guest_account_claim_events',
    "grant execute on function public.claim_guest_customer_account_v1",
  ]) expect(migration).toContain(required)
  expect(migration).toContain("'account_claim'")
  expect(migration).toContain('request_fingerprint')
  expect(migration).toContain("to authenticated")
  expect(migration).toContain('from public,anon,authenticated')
  expect(handler).toContain("client.auth.getUser(accessToken)")
  expect(handler).not.toMatch(/customerId|contactValue|email\s*:/)
  expect(supabaseServer).toContain('Authorization: `Bearer ${accessToken}`')
})

test('deployable Storefront entrypoint remains unavailable until its independent server switch is enabled', async () => {
  process.env.K2_STOREFRONT_BFF_ENABLED = 'false'
  const disabled = response()
  await storefrontEntrypoint({ ...request(), query: { route: 'order' } }, disabled)
  expect(disabled.statusCode).toBe(404)

  process.env.K2_STOREFRONT_BFF_ENABLED = 'true'
  process.env.K2_DEPLOYMENT_TARGET = 'admin'
  const wrongArtifact = response()
  await storefrontEntrypoint({ ...request(), query: { route: 'order' } }, wrongArtifact)
  expect(wrongArtifact.statusCode).toBe(404)

  process.env.K2_DEPLOYMENT_TARGET = 'storefront'
  const routed = response()
  await storefrontEntrypoint({ ...request('GET'), query: { route: 'order' } }, routed)
  expect(routed.statusCode).toBe(405)
})

test('storefront boundary fails closed on wrong artifact, method, and origin', async () => {
  process.env.K2_DEPLOYMENT_TARGET = 'admin'
  const wrongArtifact = response()
  await orderHandler(request(), wrongArtifact)
  expect(wrongArtifact.statusCode).toBe(404)

  process.env.K2_DEPLOYMENT_TARGET = 'storefront'
  const wrongMethod = response()
  await pasabuyHandler(request('GET'), wrongMethod)
  expect(wrongMethod.statusCode).toBe(405)

  const wrongOrigin = response()
  await couponHandler(request('POST', 'https://evil.example'), wrongOrigin)
  expect(wrongOrigin.statusCode).toBe(403)
  expect(JSON.parse(wrongOrigin.body).error.code).toBe('ORIGIN_NOT_ALLOWED')
})

test('storefront validation rejects unknown fields before a database call', async () => {
  const invalidOrder = response()
  await orderHandler({ ...request(), body: { admin: true } }, invalidOrder)
  expect(invalidOrder.statusCode).toBe(400)
  expect(JSON.parse(invalidOrder.body).error.code).toBe('REQUEST_INVALID')

  const invalidCoupon = response()
  await couponHandler({ ...request(), body: { code: '<script>', subtotal: 100 } }, invalidCoupon)
  expect(invalidCoupon.statusCode).toBe(400)
  expect(JSON.parse(invalidCoupon.body).error.code).toBe('COUPON_INVALID')

  const invalidReply = response()
  await messageHandler({ ...request(), body: {
    conversationReference: 'wrong', message: 'Hello', idempotencyKey: crypto.randomUUID(),
  } }, invalidReply)
  expect(invalidReply.statusCode).toBe(400)
  expect(JSON.parse(invalidReply.body).error.code).toBe('CONVERSATION_INVALID')

  const invalidConversation = response()
  await conversationHandler({ ...request(), body: { customerName: 'Guest', message: 'Hello', admin: true } }, invalidConversation)
  expect(invalidConversation.statusCode).toBe(400)
  expect(JSON.parse(invalidConversation.body).error.code).toBe('REQUEST_INVALID')
})

test('starting a conversation fails closed on method and origin', async () => {
  const wrongMethod = response()
  await conversationHandler(request('GET'), wrongMethod)
  expect(wrongMethod.statusCode).toBe(405)

  const wrongOrigin = response()
  await conversationHandler(request('POST', 'https://evil.example'), wrongOrigin)
  expect(wrongOrigin.statusCode).toBe(403)
})

test('guest conversation listing is unavailable on the wrong production artifact', async () => {
  process.env.K2_DEPLOYMENT_TARGET = 'admin'
  const result = response()
  await messagesHandler(request(), result)
  expect(result.statusCode).toBe(404)
})
