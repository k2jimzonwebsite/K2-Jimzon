import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import accountClaimHandler, { validateAccountClaim } from '../prepared-api/storefront/account/claim.js'
import accountHistoryHandler from '../prepared-api/storefront/account/history.js'
import accountMessageHandler, { validateAccountMessage } from '../prepared-api/storefront/account/message.js'
import orderHandler, { validateGuestOrder } from '../prepared-api/storefront/order.js'
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
import { hasFinalOrderCharge, projectOrderCharge } from '../src/lib/orderChargeState.js'
import { validateExpressAcceptance } from '../server/express-delivery-contract.js'
import { handleExpressAcceptance } from '../server/storefront-bff/express-delivery.js'

test('express acceptance transport signs exact version and rejects buyer-supplied amounts', async () => {
  const body = { orderReference: 'WEB-SYNTHETIC01', quoteVersion: 1, idempotencyKey: '11111111-1111-4111-8111-111111111111' }
  expect(validateExpressAcceptance(body)).toEqual(body)
  for (const invalid of [{ ...body, feeMinor: 0 }, { ...body, totalAmount: 0 }, { ...body, customerConfirmed: true },
    { ...body, quoteVersion: '1' }, { ...body, quoteVersion: 0 }, { ...body, idempotencyKey: 'new-key' }]) {
    expect(() => validateExpressAcceptance(invalid)).toThrow('REQUEST_INVALID')
  }
  const savedFetch = globalThis.fetch, names = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']
  const saved = Object.fromEntries(names.map(key => [key, process.env[key]]))
  process.env.SUPABASE_URL = 'https://express-fixture.supabase.co'
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture'
  let calls = 0
  const receipt = { ok: true, orderReference: body.orderReference, quoteVersion: 1, shippingQuoteStatus: 'customer_confirmed', totalAmount: 830.15, acceptedAt: '2026-10-08T04:00:00.000Z', privateEvidence: 'must not leak' }
  try {
    globalThis.fetch = async (url, init) => {
      if (String(url).endsWith('/auth/v1/user')) return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111' }), { status: 200 })
      calls++
      expect(String(url)).toMatch(/\/rpc\/accept_(guest|account)_express_delivery_v1$/)
      const args = JSON.parse(init.body)
      expect(JSON.parse(args.p_payload_text)).toEqual(body)
      expect(args.p_signature).toMatch(/^[a-f0-9]{64}$/)
      expect(Object.hasOwn(args, 'p_guest_grant_hash')).toBe(String(url).includes('accept_guest_'))
      return new Response(JSON.stringify(receipt), { status: 200 })
    }
    const unauthorized = response()
    await handleExpressAcceptance({ ...request(), body }, unauthorized, { account: true })
    expect(unauthorized.statusCode).toBe(401)
    expect(calls).toBe(0)
    for (const account of [false, true]) {
      const req = { ...request(), body }
      if (account) req.headers.authorization = 'Bearer fixture-account-token'
      const res = response()
      await handleExpressAcceptance(req, res, { account })
      expect(res.statusCode).toBe(200)
      expect(JSON.parse(res.body).receipt.totalAmount).toBe(830.15)
      expect(res.body).not.toContain('privateEvidence')
    }
    receipt.totalAmount = null
    const unknown = response()
    await handleExpressAcceptance({ ...request(), body }, unknown)
    expect(unknown.statusCode).toBe(503)
  } finally {
    globalThis.fetch = savedFetch
    for (const key of names) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]
  }
})

test('pending delivery readers hide provisional bills while preserving accepted totals', async () => {
  const savedFetch = globalThis.fetch
  const names = ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']
  const saved = Object.fromEntries(names.map(key => [key, process.env[key]]))
  process.env.SUPABASE_URL = 'https://charge-fixture.supabase.co'
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture'
  const orders = [
    { id: 'pending', shipping_quote_status: 'pending', total_amount: 735, shipping_amount: 0 },
    { id: 'quoted', shipping_quote_status: 'quoted', total_amount: 830, shipping_amount: 95 },
    { id: 'unknown', total_amount: 735 },
    { id: 'accepted', shipping_quote_status: 'customer_confirmed', total_amount: 830, shipping_amount: 95 },
    { id: 'pickup', shipping_quote_status: 'waived', total_amount: 0, shipping_amount: 0 },
    { id: 'missing', shipping_quote_status: 'customer_confirmed', total_amount: null },
  ]
  const expected = orders.map(projectOrderCharge)
  expect(expected.map(order => order.total_amount)).toEqual([null, null, null, 830, 0, null])
  for (const value of ['', ' ', -1, Infinity, true, {}, undefined]) {
    expect(hasFinalOrderCharge({ shipping_quote_status: 'customer_confirmed', total_amount: value })).toBe(false)
  }
  try {
    globalThis.fetch = async (url, init) => {
      if (String(url).endsWith('/auth/v1/user')) {
        expect(init.headers.get ? init.headers.get('Authorization') : init.headers.Authorization).toBe('Bearer fixture-account-token')
        return new Response(JSON.stringify({ id: '11111111-1111-4111-8111-111111111111' }), { status: 200 })
      }
      expect(String(url)).toMatch(/\/rpc\/(read_guest_order_status_v1|list_customer_account_history_v1)$/)
      expect(JSON.parse(init.body).p_signature).toMatch(/^[a-f0-9]{64}$/)
      return new Response(JSON.stringify({ ok: true, orders, linked_at: '2026-10-08T00:00:00Z' }), { status: 200 })
    }
    const guest = response()
    await orderStatusHandler(request(), guest)
    expect(guest.statusCode).toBe(200)
    expect(JSON.parse(guest.body).orders).toEqual(expected)
    const account = response()
    const req = request()
    req.headers.authorization = 'Bearer fixture-account-token'
    await accountHistoryHandler(req, account)
    expect(account.statusCode).toBe(200)
    expect(JSON.parse(account.body).history.orders).toEqual(expected)
  } finally {
    globalThis.fetch = savedFetch
    for (const key of names) if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]
  }
})

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

test('Website eligibility rejection returns a safe conflict without exposing database details', async () => {
  const savedFetch = globalThis.fetch
  const saved = Object.fromEntries(['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'K2_TURNSTILE_SECRET_KEY',
    'K2_TURNSTILE_ALLOW_UNCONFIGURED'].map(key => [key, process.env[key]]))
  const calls = []
  process.env.SUPABASE_URL = 'https://website-fixture.supabase.co'
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture'
  delete process.env.K2_TURNSTILE_SECRET_KEY
  process.env.K2_TURNSTILE_ALLOW_UNCONFIGURED = 'true'
  globalThis.fetch = async (url, init) => {
    expect(String(url)).toBe('https://website-fixture.supabase.co/rest/v1/rpc/submit_guest_order_v1')
    calls.push(JSON.parse(init.body))
    return new Response(JSON.stringify({ code: 'K2WEB', message: 'Private database SKU details',
      details: 'Never expose internal product state', hint: null }),
    { status: 400, headers: { 'content-type': 'application/json' } })
  }
  try {
    const res = response()
    await orderHandler({ ...request(), body: { customerName: 'Website fixture', email: 'buyer@example.test',
      address: 'Fixture-only delivery address', fulfillmentMethod: 'Courier delivery',
      items: [{ sku: 'LOCAL-WEBSITE-OFFER', quantity: 1 }],
      idempotencyKey: '41000000-0000-4000-8000-000000000003' } }, res)
    expect(res.statusCode).toBe(409)
    expect(JSON.parse(res.body)).toEqual({ error: { code: 'PRODUCT_NOT_AVAILABLE' } })
    expect(calls).toHaveLength(1)
    expect(calls[0].p_signature).toMatch(/^[0-9a-f]{64}$/)
    expect(res.headers.has('set-cookie')).toBe(false)
  } finally {
    globalThis.fetch = savedFetch
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})

test('single-function Storefront router allowlists every prepared endpoint and rejects unknown paths', async () => {
  expect(STOREFRONT_BFF_ROUTES.length).toBeGreaterThan(0)
  expect(new Set(STOREFRONT_BFF_ROUTES).size).toBe(STOREFRONT_BFF_ROUTES.length)
  expect(Object.keys(STOREFRONT_BFF_ROUTE_CONTROLS).sort()).toEqual([...STOREFRONT_BFF_ROUTES].sort())
  expect(Object.entries(STOREFRONT_BFF_ROUTE_CONTROLS).filter(([route]) => route !== 'delivery/locations').every(([, control]) =>
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

test('canonical delivery boundary validates only SKU quantities and complete destination identifiers', async () => {
  const module = await import('../prepared-api/storefront/delivery/quote.js')
  expect(typeof module.validateCustomerDeliveryRequest).toBe('function')
  const validate = module.validateCustomerDeliveryRequest
  const body = {service:'standard',items:[{sku:'SYNTHETIC-A',quantity:2}],destination:{sourceVersion:'psgc-2026-06-30',path:['1300000000','1380100000','1380100001']}}
  expect(validate(body)).toEqual(body)
  expect(validate({...body,items:[{sku:'ABC/123',quantity:1}]}).items).toEqual([{sku:'ABC/123',quantity:1}])
  expect(validate({service:'pickup',items:body.items})).toEqual({service:'pickup',items:body.items,destination:null})
  for (const invalid of [ {...body,weightG:1}, {...body,feeMinor:0}, {...body,items:[...body.items,...body.items]}, {...body,items:[{sku:'SYNTHETIC-A',quantity:1.5}]}, {...body,items:[{sku:'SYNTHETIC-A',quantity:100}]}, {...body,items:[{sku:'A',quantity:1,weightG:1}]}, {...body,destination:{...body.destination,path:['1300000000','1380100000']}}, {...body,destination:{...body.destination,sourceVersion:'old'}}, {...body,destination:{...body.destination,area:'NCR'}} ]) expect(()=>validate(invalid)).toThrow('REQUEST_INVALID')
})

test('canonical order delivery preserves acceptance and historical retry normalization without accepting mixed price input', () => {
  const body={customerName:'Synthetic accepted quote',email:'accepted@example.test',address:'Synthetic address only',fulfillmentMethod:'Standard Courier Delivery',items:[{sku:'ABC/123',quantity:1}],idempotencyKey:'41000000-0000-4000-8000-000000000017',delivery:{service:'standard',destination:{sourceVersion:'psgc-2026-06-30',path:['1300000000','1380100000','1380100001']},acceptance:{inputFingerprint:'a'.repeat(64),rateVersion:1}}}
  expect(validateGuestOrder(body).payload.delivery).toEqual(body.delivery)
  for(const bad of [{...body,shippingAmount:0},{...body,shippingQuoteStatus:'waived'},{...body,delivery:{...body.delivery,acceptance:{...body.delivery.acceptance,feeMinor:0}}},{...body,delivery:{...body.delivery,acceptance:{inputFingerprint:'a'.repeat(64),rateVersion:'1'}}},{...body,fulfillmentMethod:'Pickup'},{...body,delivery:{...body.delivery,acceptance:null}}])expect(()=>validateGuestOrder(bad)).toThrow('DELIVERY_INPUT_INVALID')
  const legacy={...body,delivery:undefined,shippingAmount:7,shippingQuoteStatus:'customer_confirmed'}
  const normalized=validateGuestOrder(legacy).payload
  expect(normalized.delivery).toBeUndefined();expect(normalized.shippingAmount).toBe(7);expect(normalized.shippingQuoteStatus).toBe('customer_confirmed')
  const express={...body,fulfillmentMethod:'Metro Manila Express Dispatch',delivery:{service:'express',destination:body.delivery.destination,acceptance:null}}
  expect(validateGuestOrder(express).payload.delivery.acceptance).toBeNull()
})

test('canonical order delivery failures return a safe review refusal without an order receipt or guest cookie', async () => {
  const savedFetch=globalThis.fetch,names=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','K2_TURNSTILE_SECRET_KEY','K2_TURNSTILE_ALLOW_UNCONFIGURED'],saved=Object.fromEntries(names.map(k=>[k,process.env[k]]))
  process.env.SUPABASE_URL='https://delivery-fixture.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_fixture';delete process.env.K2_TURNSTILE_SECRET_KEY;process.env.K2_TURNSTILE_ALLOW_UNCONFIGURED='true'
  const body={customerName:'Synthetic accepted quote',email:'accepted@example.test',address:'Synthetic address only',fulfillmentMethod:'Standard Courier Delivery',items:[{sku:'ABC/123',quantity:1}],idempotencyKey:'41000000-0000-4000-8000-000000000018',delivery:{service:'standard',destination:{sourceVersion:'psgc-2026-06-30',path:['1300000000','1380100000','1380100001']},acceptance:{inputFingerprint:'a'.repeat(64),rateVersion:1}}}
  try{
    for(const [message,status] of [['K2_DELIVERY_QUOTE_CHANGED',409],['K2_DELIVERY_REVIEW_REQUIRED',409],['K2_DELIVERY_ACCEPTANCE_REQUIRED',409],['K2_DELIVERY_INPUT_INVALID',400]]){
      globalThis.fetch=async(url,init)=>{expect(String(url)).toBe('https://delivery-fixture.supabase.co/rest/v1/rpc/submit_guest_order_v1');const args=JSON.parse(init.body);expect(JSON.parse(args.p_payload_text).delivery).toEqual(body.delivery);expect(args.p_signature).toMatch(/^[a-f0-9]{64}$/);return new Response(JSON.stringify({code:'22023',message,details:'Private snapshot and address',hint:'Never expose this'}),{status:400,headers:{'content-type':'application/json'}})}
      const res=response();await orderHandler({...request(),body},res);expect(res.statusCode).toBe(status);expect(JSON.parse(res.body)).toEqual({error:{code:message.slice(3)}});expect(res.headers.has('set-cookie')).toBe(false)
    }
  }finally{globalThis.fetch=savedFetch;for(const k of names)if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}
})

test('canonical delivery boundary signs canonical input and exposes only the reviewed quote projection', async () => {
  const handler = (await import('../prepared-api/storefront/delivery/quote.js')).default
  const savedFetch=globalThis.fetch, names=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY'],saved=Object.fromEntries(names.map(k=>[k,process.env[k]])),calls=[]
  process.env.SUPABASE_URL='https://delivery-fixture.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_fixture'
  const quote={service:'standard',status:'customer_confirmed',feeMinor:9500,currency:'PHP',rateVersion:1,weightG:500,weightBasis:'estimated',inputFingerprint:'a'.repeat(64),area:'NCR',sourceVersion:'psgc-2026-06-30',messageCode:'STANDARD_RATE'}
  globalThis.fetch=async(url,init)=>{expect(String(url)).toBe('https://delivery-fixture.supabase.co/rest/v1/rpc/quote_customer_delivery_v1');calls.push(JSON.parse(init.body));return new Response(JSON.stringify({ok:true,quote:{...quote,privateCost:123,actorId:'private'}}),{headers:{'content-type':'application/json'}})}
  try {
    const body={service:'standard',items:[{sku:'SYNTHETIC-A',quantity:1}],destination:{sourceVersion:'psgc-2026-06-30',path:['1300000000','1380100000','1380100001']}}
    const res=response();await handler({...request(),body},res)
    expect(res.statusCode).toBe(200);expect(JSON.parse(res.body)).toEqual({ok:true,quote});expect(JSON.parse(calls[0].p_payload_text)).toEqual(body);expect(calls[0].p_signature).toMatch(/^[0-9a-f]{64}$/)
    const bad=response();await handler({...request(),body:{...body,weightG:1}},bad);expect(bad.statusCode).toBe(400);expect(calls).toHaveLength(1)
    const denied=response();await handler({...request('POST','https://untrusted.example.test'),body},denied);expect(denied.statusCode).toBe(403);expect(calls).toHaveLength(1)
    for(const [result,status,code] of [[{ok:false,error_code:'RATE_LIMITED',retry_after_seconds:60},429,'RATE_LIMITED'],[{ok:false,error_code:'REQUEST_REPLAYED'},409,'REQUEST_REJECTED'],[{ok:true,quote:{...quote,feeMinor:null}},503,'DELIVERY_QUOTE_UNAVAILABLE']]){
      globalThis.fetch=async()=>new Response(JSON.stringify(result),{headers:{'content-type':'application/json'}})
      const failure=response();await handler({...request(),body},failure);expect(failure.statusCode).toBe(status);expect(JSON.parse(failure.body)).toEqual({error:{code}})
    }
  } finally {globalThis.fetch=savedFetch;for(const k of names)if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}
})

test('canonical delivery locations route is a bounded public reference read with no signing or business writes', async () => {
  expect(STOREFRONT_BFF_ROUTES).toContain('delivery/locations')
  expect(STOREFRONT_BFF_ROUTE_CONTROLS['delivery/locations']).toMatchObject({method:'GET',signed:false,databaseRateLimit:false})
  const handler=(await import('../prepared-api/storefront/delivery/locations.js')).default
  const savedFetch=globalThis.fetch,names=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY'],saved=Object.fromEntries(names.map(k=>[k,process.env[k]]));let calls=0
  process.env.SUPABASE_URL='https://delivery-fixture.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_fixture'
  const child={code:'1380601000',name:'Tondo',level:'SubMun',sourceVersion:'psgc-2026-06-30'}
  globalThis.fetch=async(url,init)=>{calls++;expect(String(url)).toBe('https://delivery-fixture.supabase.co/rest/v1/rpc/read_delivery_locations_v1');expect(JSON.parse(init.body)).toEqual({p_parent_code:'1380600000'});return new Response(JSON.stringify({sourceVersion:'psgc-2026-06-30',children:[{...child,private:'hidden'}]}),{headers:{'content-type':'application/json'}})}
  try {
    const res=response();await handler({...request('GET'),query:{parent:'1380600000'}},res);expect(res.statusCode).toBe(200);expect(JSON.parse(res.body)).toEqual({ok:true,sourceVersion:'psgc-2026-06-30',children:[child]})
    const bad=response();await handler({...request('GET'),query:{parent:['1380600000','1300000000']}},bad);expect(bad.statusCode).toBe(400);expect(calls).toBe(1)
    const method=response();await handler(request('POST'),method);expect(method.statusCode).toBe(405);expect(calls).toBe(1)
  } finally {globalThis.fetch=savedFetch;for(const k of names)if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}
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

test('starting another guest conversation carries the existing browser grant hash', () => {
  const token = 'a'.repeat(64)
  const req = request()
  req.headers.cookie = `k2_guest_access=${token}`
  const args = signedRpcArguments(req, 'guest_start', {
    customerName: 'Fixture guest', email: 'guest@example.test', phone: '',
    message: 'A second conversation.', idempotencyKey: crypto.randomUUID(), origin: 'storefront',
  })
  expect(args.p_guest_grant_hash).toBe(createHash('sha256').update(token).digest('hex'))
  expect(JSON.stringify(args)).not.toContain(token)
})

test('guest conversation start passes no grant for missing or malformed cookies', () => {
  for (const cookie of ['', 'k2_guest_access=%', 'k2_guest_access=not-a-grant', `k2_guest_access=${'a'.repeat(63)}`]) {
    const req = request()
    req.headers.cookie = cookie
    expect(signedRpcArguments(req, 'guest_start', {}).p_guest_grant_hash).toBeNull()
  }
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

test('customer numerics reject booleans and null while accepting canonical numbers', async () => {
  const orderBase = {
    customerName: 'Guest Buyer', email: 'guest@example.test', address: '1 Test Street, Manila',
    fulfillmentMethod: 'Courier delivery', idempotencyKey: crypto.randomUUID(), botToken: 'test-token',
  }
  const orderBody = (quantity) => ({ ...orderBase, items: [{ sku: 'SKU-A', quantity }] })

  // Boolean true used to coerce to quantity 1 via Number(true).
  const coerced = response()
  await orderHandler({ ...request(), body: orderBody(true) }, coerced)
  expect(coerced.statusCode).toBe(400)

  // A canonical numeric string still passes validation and stops at the bot
  // challenge instead (403), proving validation accepted it.
  const canonical = response()
  await orderHandler({ ...request(), body: orderBody('2') }, canonical)
  expect(canonical.statusCode).toBe(403)
  expect(JSON.parse(canonical.body).error.code).toBe('BOT_CHALLENGE_REQUIRED')

  const pasabuyBase = {
    customerName: 'Guest Buyer', email: 'guest@example.test', item: 'Parmigiano',
    quantity: 1, shipping: 'sea', idempotencyKey: crypto.randomUUID(), botToken: 'test-token',
  }
  const badQty = response()
  await pasabuyHandler({ ...request(), body: { ...pasabuyBase, quantity: true } }, badQty)
  expect(badQty.statusCode).toBe(400)

  const badBudget = response()
  await pasabuyHandler({ ...request(), body: { ...pasabuyBase, budget: true } }, badBudget)
  expect(badBudget.statusCode).toBe(400)

  const badSubtotal = response()
  await couponHandler({ ...request(), body: { code: 'WELCOME', subtotal: true } }, badSubtotal)
  expect(badSubtotal.statusCode).toBe(400)
})
