import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

import {
  MAX_SHOPEE_PUSH_BYTES,
  buildShopeeEventEnvelope,
  readShopeePushBody,
} from '../supabase/functions/shopee-webhook/validation.js'
import {
  createPrefilterBucket,
  strictEnvInt,
} from '../supabase/functions/_shared/marketplace-push.js'

test('Shopee push body is bounded JSON and preserves the exact signed text', async () => {
  const rawBody = JSON.stringify({ code: 3, shop_id: 42, timestamp: 1_787_616_000 })
  const request = new Request('https://example.test/shopee', {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-length': String(Buffer.byteLength(rawBody)),
    },
    body: rawBody,
  })

  const bounded = await readShopeePushBody(request, { timeoutMs: 1000 })
  expect(bounded.rawBody).toBe(rawBody)
  expect([...bounded.rawBytes]).toEqual([...new TextEncoder().encode(rawBody)])
  await expect(readShopeePushBody(new Request('https://example.test/shopee', {
    method: 'POST', headers: { 'content-type': 'text/plain' }, body: rawBody,
  }), { timeoutMs: 1000 })).rejects.toThrow('SHOPEE_CONTENT_TYPE_INVALID')
  await expect(readShopeePushBody(new Request('https://example.test/shopee', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'content-length': String(MAX_SHOPEE_PUSH_BYTES + 1),
    },
    body: rawBody,
  }), { timeoutMs: 1000 })).rejects.toThrow('SHOPEE_PAYLOAD_TOO_LARGE')
})

test('Shopee push body has a required bounded read deadline', async () => {
  let timer
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{'))
      timer = setTimeout(() => controller.close(), 50)
    },
    cancel() {
      clearTimeout(timer)
    },
  })
  const request = new Request('https://example.test/shopee', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body, duplex: 'half',
  })

  await expect(readShopeePushBody(request, { timeoutMs: 10 }))
    .rejects.toThrow('SHOPEE_BODY_READ_TIMEOUT')
  await expect(readShopeePushBody(new Request('https://example.test/shopee', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
  }), { timeoutMs: 0 })).rejects.toThrow('SHOPEE_BODY_TIMEOUT_INVALID')
})

test('Shopee push identity and replay window are deterministic and fail closed', () => {
  const nowMs = Date.parse('2026-08-25T03:00:00.000Z')
  const payload = {
    code: 3,
    shop_id: 42,
    timestamp: Math.floor(nowMs / 1000),
    data: { ordersn: '260825ABC123', status: 'READY_TO_SHIP' },
  }

  expect(buildShopeeEventEnvelope(payload, { nowMs, maxAgeSeconds: 900 })).toEqual({
    externalEventId: '42:260825ABC123:READY_TO_SHIP',
    eventType: 'order_status',
    payload,
  })
  expect(buildShopeeEventEnvelope({
    code: 99, shop_id: 42, event_id: 'evt-001', timestamp: Math.floor(nowMs / 1000), data: {},
  }, { nowMs, maxAgeSeconds: 900 }).externalEventId).toBe('42:evt-001')

  for (const invalid of [
    { ...payload, shop_id: undefined },
    { ...payload, timestamp: undefined },
    { ...payload, data: { ordersn: '260825ABC123' } },
    { code: 99, shop_id: 42, timestamp: Math.floor(nowMs / 1000), data: {} },
  ]) {
    expect(() => buildShopeeEventEnvelope(invalid, { nowMs, maxAgeSeconds: 900 }))
      .toThrow('SHOPEE_PAYLOAD_INVALID')
  }

  expect(() => buildShopeeEventEnvelope({
    ...payload, timestamp: Math.floor((nowMs - 901_000) / 1000),
  }, { nowMs, maxAgeSeconds: 900 })).toThrow('SHOPEE_EVENT_STALE')
  expect(() => buildShopeeEventEnvelope(payload, { nowMs, maxAgeSeconds: 0 }))
    .toThrow('SHOPEE_REPLAY_WINDOW_INVALID')
})

test('Shopee intake verifies the bounded exact body before deterministic capture', async () => {
  const source = await readFile(new URL(
    '../supabase/functions/shopee-webhook/index.ts', import.meta.url,
  ), 'utf8')
  const bodyAt = source.indexOf('await readShopeePushBody(request, { timeoutMs: PUSH_ENV.timeoutMs })')
  const signatureAt = source.indexOf('await verifyShopeeSignature(signedUrl, rawBytes, signature)')
  const envelopeAt = source.indexOf('buildShopeeEventEnvelope(payload')
  const captureAt = source.indexOf("rpc('capture_shopee_event_v1'")

  expect(bodyAt).toBeGreaterThan(-1)
  expect(signatureAt).toBeGreaterThan(bodyAt)
  expect(envelopeAt).toBeGreaterThan(signatureAt)
  expect(captureAt).toBeGreaterThan(envelopeAt)
  expect(source).not.toContain("from('channel_event_inbox').upsert")
  expect(source).toContain("result.status === 'rate_limited'")
  expect(source).toContain("result.status === 'conflict'")
  expect(source).toContain("result.status === 'unavailable'")
  expect(source).not.toContain('timestamp ?? Date.now()')
  expect(source).not.toContain('Signed event could not be stored: ${error.message}')
  expect(source).toContain("Deno.env.get('SHOPEE_BODY_READ_TIMEOUT_MS')")
  expect(source).toContain('readShopeePushBody(request, { timeoutMs: PUSH_ENV.timeoutMs })')
  expect(source).toContain("code === 'SHOPEE_BODY_READ_TIMEOUT'")
})

test('MAP-023 reuses the authoritative Shopee capture rehearsal with an exact recovery invariant', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  expect(packageJson.scripts['verify:map020-shopee-ingress-portable'])
    .toBe('node scripts/rehearse-map020-shopee-ingress.mjs')

  const behavior = await readFile(new URL('../supabase/tests/map020_shopee_ingress_behavior.sql', import.meta.url), 'utf8')
  expect(behavior).toContain('MAP-023 ambiguous-response replay acceptance')
  expect(behavior).toContain("external_event_id = '42:replay'\n    ) <> 1")
  expect(behavior).toContain("scope = 'shop' and shop_id = 42 and hit_count = 3")
  expect(behavior).toContain("scope = 'global' and shop_id = 0 and hit_count = 3")

  const runner = await readFile(new URL('../scripts/rehearse-map020-shopee-ingress.mjs', import.meta.url), 'utf8')
  expect(runner).toContain('MAP-023 inbound-event acceptance')
})

test('invalid-signature floods shed load before body parsing and verification', async () => {
  const entrypoint = await readFile(new URL('../supabase/functions/shopee-webhook/index.ts', import.meta.url), 'utf8')
  expect(entrypoint).toContain('preVerifyAllowed')
  expect(entrypoint).toContain("status: 429")
  // The pre-filter sits before body parsing: floods never reach HMAC or the DB.
  const gateAt = entrypoint.indexOf('preVerifyAllowed(senderIp)')
  expect(gateAt).toBeGreaterThan(-1)
  expect(gateAt).toBeLessThan(entrypoint.indexOf('readShopeePushBody(request,'))
  expect(gateAt).toBeLessThan(entrypoint.indexOf('verifyShopeeSignature(signedUrl'))
})

test('the push route denies GET instead of answering it', async () => {
  const entrypoint = await readFile(new URL('../supabase/functions/shopee-webhook/index.ts', import.meta.url), 'utf8')
  expect(entrypoint).not.toContain("new Response('ok', { status: 200 })")
  expect(entrypoint).toContain("request.method === 'GET'")
  expect(entrypoint).toContain('405')
})

test('the pre-filter fails closed and resets per window', () => {
  let now = 1_000_000
  const bucket = createPrefilterBucket({ windowMs: 60_000, limit: 3, now: () => now })
  expect(bucket.allowed('10.0.0.1')).toBe(true)
  expect(bucket.allowed('10.0.0.1')).toBe(true)
  expect(bucket.allowed('10.0.0.1')).toBe(true)
  expect(bucket.allowed('10.0.0.1')).toBe(false)
  expect(bucket.allowed('10.0.0.2')).toBe(true)
  now += 60_001
  expect(bucket.allowed('10.0.0.1')).toBe(true)
})

test('webhook env values are strict integers, never coerced defaults', () => {
  for (const value of ['', '   ', null, undefined, 'abc', '12.5', '-5', '0', '0x10']) {
    expect(() => strictEnvInt(value, { min: 60, max: 86_400, prefix: 'SHOPEE' }), JSON.stringify(value)).toThrow('SHOPEE_ENV_INVALID')
  }
  expect(strictEnvInt('900', { min: 60, max: 86_400, prefix: 'SHOPEE' })).toBe(900)
  expect(strictEnvInt(5000, { min: 1, max: 30_000, prefix: 'SHOPEE' })).toBe(5000)
})

test('a misconfigured function refuses pushes instead of running on coerced zeros', async () => {
  const entrypoint = await readFile(new URL('../supabase/functions/shopee-webhook/index.ts', import.meta.url), 'utf8')
  expect(entrypoint).toContain('strictEnvInt')
  expect(entrypoint).not.toContain("Number(Deno.env.get('SHOPEE_PUSH_MAX_AGE_SECONDS') ?? '')")
  expect(entrypoint).not.toContain("Number(Deno.env.get('SHOPEE_BODY_READ_TIMEOUT_MS') ?? '')")
})
