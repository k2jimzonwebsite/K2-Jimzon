import { expect, test } from '@playwright/test'
import orderHandler from '../api/storefront/order.js'
import pasabuyHandler from '../api/storefront/pasabuy.js'
import couponHandler from '../api/storefront/coupon.js'
import messagesHandler from '../api/storefront/messages.js'
import messageHandler from '../api/storefront/message.js'
import conversationHandler from '../api/storefront/conversation.js'

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
  process.env.K2_STOREFRONT_ORIGINS = 'https://shop.example.test'
  process.env.K2_GUEST_BFF_SECRET = Buffer.alloc(32, 21).toString('base64')
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
