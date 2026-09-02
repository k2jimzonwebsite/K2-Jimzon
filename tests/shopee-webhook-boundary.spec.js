import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

import {
  MAX_SHOPEE_PUSH_BYTES,
  buildShopeeEventEnvelope,
  readShopeePushBody,
} from '../supabase/functions/shopee-webhook/validation.js'

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
  const bodyAt = source.indexOf('await readShopeePushBody(request, { timeoutMs: SHOPEE_BODY_READ_TIMEOUT_MS })')
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
  expect(source).toContain('readShopeePushBody(request, { timeoutMs: SHOPEE_BODY_READ_TIMEOUT_MS })')
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
