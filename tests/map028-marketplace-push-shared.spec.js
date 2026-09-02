import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  MAX_PUSH_BYTES, assertPlainObject, assertReplayWindowConfig, assertWithinReplayWindow,
  normalizedTimestampMs, readBoundedPushBody, safeExternalValue,
} from '../supabase/functions/_shared/marketplace-push.js'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

/**
 * Source with comments stripped.
 *
 * A presence check has to look at what the module actually does. Its own
 * documentation names the marketplaces it deliberately excludes, and matching
 * that prose would fail the very assertion it explains.
 */
const readCode = async (path) => (await read(path))
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

/** A Request-alike carrying an exact byte body, as the platform delivers one. */
function pushRequest(body, { contentType = 'application/json', contentLength = null } = {}) {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body
  const headers = new Map([['content-type', contentType]])
  if (contentLength !== null) headers.set('content-length', String(contentLength))
  return {
    headers: { get: key => headers.get(key) ?? null },
    body: {
      getReader() {
        let sent = false
        return {
          read: async () => (sent ? { done: true } : (sent = true, { done: false, value: bytes })),
          cancel: async () => {},
          releaseLock: () => {},
        }
      },
    },
  }
}

test('the bounded reader returns the exact signed bytes alongside the text', async () => {
  const body = '{"code":3,"shop_id":7}'
  const result = await readBoundedPushBody(pushRequest(body), { timeoutMs: 5000, prefix: 'TEST' })

  expect(result.rawBody).toBe(body)
  // A signature must be verified against what arrived, never a re-serialisation.
  expect(new TextDecoder().decode(result.rawBytes)).toBe(body)
})

test('the reader refuses a body that disagrees with its declared length', async () => {
  const body = '{"a":1}'
  await expect(readBoundedPushBody(
    pushRequest(body, { contentLength: body.length + 5 }),
    { timeoutMs: 5000, prefix: 'TEST' },
  )).rejects.toThrow('TEST_CONTENT_LENGTH_INVALID')
})

test('the reader refuses a non-JSON content type and an oversized declared body', async () => {
  await expect(readBoundedPushBody(
    pushRequest('{}', { contentType: 'text/plain' }),
    { timeoutMs: 5000, prefix: 'TEST' },
  )).rejects.toThrow('TEST_CONTENT_TYPE_INVALID')

  await expect(readBoundedPushBody(
    pushRequest('{}', { contentLength: MAX_PUSH_BYTES + 1 }),
    { timeoutMs: 5000, prefix: 'TEST' },
  )).rejects.toThrow('TEST_PAYLOAD_TOO_LARGE')
})

test('the reader refuses an absent or out-of-range read deadline', async () => {
  for (const timeoutMs of [undefined, 0, 30_001, 1.5]) {
    await expect(readBoundedPushBody(pushRequest('{}'), { timeoutMs, prefix: 'TEST' }))
      .rejects.toThrow('TEST_BODY_TIMEOUT_INVALID')
  }
})

test('the reader refuses bytes that are not valid UTF-8', async () => {
  // A lone continuation byte is never valid UTF-8. Decoding it leniently would
  // hand a corrupted string to JSON.parse and to signature verification.
  await expect(readBoundedPushBody(
    pushRequest(new Uint8Array([0x7b, 0x80, 0x7d])),
    { timeoutMs: 5000, prefix: 'TEST' },
  )).rejects.toThrow('TEST_PAYLOAD_ENCODING_INVALID')
})

test('event identity values are bounded and cannot smuggle a separator', () => {
  expect(safeExternalValue('ORDER-123.a:b', 'TEST')).toBe('ORDER-123.a:b')
  for (const bad of ['', ' ', 'a b', 'a/b', 'a'.repeat(129), null, undefined, {}]) {
    expect(() => safeExternalValue(bad, 'TEST')).toThrow('TEST_PAYLOAD_INVALID')
  }
})

test('timestamps normalise to milliseconds and refuse anything unparseable', () => {
  expect(normalizedTimestampMs(1_700_000_000, 'TEST')).toBe(1_700_000_000_000)
  expect(normalizedTimestampMs('1700000000', 'TEST')).toBe(1_700_000_000_000)
  expect(normalizedTimestampMs(1_700_000_000_000, 'TEST')).toBe(1_700_000_000_000)
  for (const bad of [0, -1, 'soon', null, 1.5]) {
    expect(() => normalizedTimestampMs(bad, 'TEST')).toThrow('TEST_PAYLOAD_INVALID')
  }
})

test('the replay window refuses stale events, far-future events, and bad configuration', () => {
  const now = 1_700_000_000_000
  const within = () => assertWithinReplayWindow({
    timestampMs: now - 1000, nowMs: now, maxAgeSeconds: 300, prefix: 'TEST',
  })
  expect(within).not.toThrow()

  expect(() => assertWithinReplayWindow({
    timestampMs: now - 400_000, nowMs: now, maxAgeSeconds: 300, prefix: 'TEST',
  })).toThrow('TEST_EVENT_STALE')

  // Clock skew is absorbed; a genuinely future event is not trusted.
  expect(() => assertWithinReplayWindow({
    timestampMs: now + 30_000, nowMs: now, maxAgeSeconds: 300, prefix: 'TEST',
  })).not.toThrow()
  expect(() => assertWithinReplayWindow({
    timestampMs: now + 120_000, nowMs: now, maxAgeSeconds: 300, prefix: 'TEST',
  })).toThrow('TEST_EVENT_STALE')

  for (const bad of [undefined, 59, 86_401, 300.5]) {
    expect(() => assertReplayWindowConfig(bad, 'TEST')).toThrow('TEST_REPLAY_WINDOW_INVALID')
  }
})

test('a push envelope must be a plain object', () => {
  expect(assertPlainObject({ a: 1 }, 'TEST')).toEqual({ a: 1 })
  for (const bad of [null, undefined, [], 'x', 5]) {
    expect(() => assertPlainObject(bad, 'TEST')).toThrow('TEST_PAYLOAD_INVALID')
  }
})

test('Shopee reuses the shared reader rather than carrying its own copy', async () => {
  const shopee = await read('../supabase/functions/shopee-webhook/validation.js')
  const shopeeCode = await readCode('../supabase/functions/shopee-webhook/validation.js')

  expect(shopee).toContain("from '../_shared/marketplace-push.js'")
  // The duplicated implementation must be gone, or the shared module is just a
  // second place for the same rules to drift apart.
  expect(shopeeCode).not.toContain('getReader()')
  expect(shopeeCode).not.toContain('TextDecoder')
  expect(shopeeCode).not.toContain('setTimeout')

  // Its published error vocabulary is unchanged by the extraction.
  expect(shopee).toContain("const PREFIX = 'SHOPEE'")
})

test('the shared module carries no marketplace-specific signature logic', async () => {
  const shared = await readCode('../supabase/functions/_shared/marketplace-push.js')

  // A shared "close enough" signature check would look verified while verifying
  // the wrong string, which is worse than having none.
  expect(shared).not.toMatch(/hmac|createHmac|signature|partner_key/i)
  expect(shared).not.toMatch(/shopee|lazada|tiktok/i)
})
