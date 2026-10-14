import { expect, test } from '@playwright/test'
import router from '../server/storefront-bff/router.js'
import { createHash } from 'node:crypto'

test('order conversation transport signs scoped operations and strips private receipt fields', async () => {
  const env = { NODE_ENV: 'production', K2_DEPLOYMENT_TARGET: 'storefront', K2_STOREFRONT_BFF_ENABLED: 'true',
    K2_STOREFRONT_ORIGINS: 'https://shop.example.test', K2_GUEST_BFF_SECRET: Buffer.alloc(32, 21).toString('base64'),
    SUPABASE_URL: 'https://fixture.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' }
  const saved = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]))
  const previousFetch = globalThis.fetch
  Object.assign(process.env, env)
  const calls = []
  globalThis.fetch = async (url, init) => {
    expect(String(url)).toMatch(/\/rpc\/guest_order_conversation_v1$/)
    const args = JSON.parse(init.body); calls.push(args)
    expect(args.p_signature).toMatch(/^[a-f0-9]{64}$/)
    expect(args.p_guest_grant_hash).toMatch(/^[a-f0-9]{64}$/)
    return new Response(JSON.stringify({ ok: true, public_reference: 'WEB-0123456789ABCDEF',
      order_status: 'submitted', payment_status: 'awaiting_instructions', total_amount: 735,
      shipping_quote_status: 'customer_confirmed', delivery_review_required: false,
      messages: [{ id: 'private-message-id', content: 'Staff reply', direction: 'outbound', created_at: '2026-10-14T00:00:00Z' }],
      receipt_id: 'private-receipt-id', idempotency_key: 'private-order-key', contents: 'private-proof' }), { status: 200 })
  }
  async function invoke(body) {
    const res = { statusCode: 0, body: '', setHeader() {}, end(value) { this.body = value } }
    await router({ url: '/api/storefront/order/conversation', method: 'POST',
      headers: { origin: 'https://shop.example.test', 'content-type': 'application/json', cookie: `k2_guest_access=${'a'.repeat(64)}` },
      socket: { remoteAddress: '127.0.0.1' }, body }, res)
    return res
  }
  try {
    const base = { operation: 'read', orderReference: 'WEB-0123456789ABCDEF' }
    const read = await invoke(base)
    expect(read.statusCode).toBe(200)
    expect(JSON.parse(read.body).receipt.messages[0].content).toBe('Staff reply')
    expect(read.body).not.toContain('private-')
    const receipt = { ...base, operation: 'receipt', paymentReference: 'GC-123', mediaType: 'image/png',
      base64: Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(30000)]).toString('base64'),
      idempotencyKey: '11111111-1111-4111-8111-111111111111' }
    expect((await invoke(receipt)).statusCode).toBe(200)
    const { base64, ...metadata } = receipt
    expect(JSON.parse(calls.at(-1).p_payload_text)).toEqual({ ...metadata, proofSha256: createHash('sha256').update(Buffer.from(base64, 'base64')).digest('hex') })
    expect(calls.at(-1).p_base64).toBe(base64)
    const count = calls.length
    for (const invalid of [{ ...base, orderId: 'other-order' }, { ...receipt, paymentStatus: 'verified' },
      { ...receipt, base64: 'invalid' }, { ...receipt, mediaType: 'text/html' }, { ...base, operation: 'delete' }]) {
      expect((await invoke(invalid)).statusCode).toBe(400)
    }
    expect(calls).toHaveLength(count)
  } finally {
    globalThis.fetch = previousFetch
    for (const [key, value] of Object.entries(saved)) if (value === undefined) delete process.env[key]; else process.env[key] = value
  }
})
