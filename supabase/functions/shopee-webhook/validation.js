export const MAX_SHOPEE_PUSH_BYTES = 256 * 1024

const SAFE_EXTERNAL_VALUE = /^[A-Za-z0-9._:-]{1,128}$/

function fail(code) {
  throw new Error(code)
}

export async function readShopeePushBody(request, { timeoutMs } = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    fail('SHOPEE_BODY_TIMEOUT_INVALID')
  }
  const contentType = String(request.headers.get('content-type') || '').toLowerCase()
  if (!/^application\/json(?:\s*;|$)/.test(contentType)) fail('SHOPEE_CONTENT_TYPE_INVALID')

  const declaredLength = request.headers.get('content-length')
  if (declaredLength !== null) {
    const bytes = Number(declaredLength)
    if (!Number.isSafeInteger(bytes) || bytes < 0) fail('SHOPEE_CONTENT_LENGTH_INVALID')
    if (bytes > MAX_SHOPEE_PUSH_BYTES) fail('SHOPEE_PAYLOAD_TOO_LARGE')
  }

  if (!request.body) fail('SHOPEE_PAYLOAD_INVALID')
  const reader = request.body.getReader()
  const chunks = []
  let total = 0
  let timeoutId
  const deadline = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('SHOPEE_BODY_READ_TIMEOUT')), timeoutMs)
  })
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline])
      if (done) break
      total += value.byteLength
      if (total > MAX_SHOPEE_PUSH_BYTES) {
        await reader.cancel()
        fail('SHOPEE_PAYLOAD_TOO_LARGE')
      }
      chunks.push(value)
    }
  } catch (error) {
    await reader.cancel().catch(() => {})
    throw error
  } finally {
    clearTimeout(timeoutId)
    reader.releaseLock()
  }

  if (declaredLength !== null && total !== Number(declaredLength)) {
    fail('SHOPEE_CONTENT_LENGTH_INVALID')
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return {
      rawBody: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      rawBytes: bytes,
    }
  } catch {
    fail('SHOPEE_PAYLOAD_ENCODING_INVALID')
  }
}

function normalizedTimestampMs(value) {
  const numeric = typeof value === 'string' && /^\d{10,13}$/.test(value)
    ? Number(value)
    : value
  if (!Number.isSafeInteger(numeric) || numeric <= 0) fail('SHOPEE_PAYLOAD_INVALID')
  return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric
}

function safeExternalValue(value) {
  const normalized = String(value ?? '').trim()
  if (!SAFE_EXTERNAL_VALUE.test(normalized)) fail('SHOPEE_PAYLOAD_INVALID')
  return normalized
}

export function buildShopeeEventEnvelope(payload, { nowMs = Date.now(), maxAgeSeconds } = {}) {
  if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds < 60 || maxAgeSeconds > 86_400) {
    fail('SHOPEE_REPLAY_WINDOW_INVALID')
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    fail('SHOPEE_PAYLOAD_INVALID')
  }

  const code = payload.code
  const shopId = payload.shop_id
  if (!Number.isSafeInteger(code) || code < 0 || code > 1_000_000
      || !Number.isSafeInteger(shopId) || shopId <= 0) {
    fail('SHOPEE_PAYLOAD_INVALID')
  }

  const timestampMs = normalizedTimestampMs(payload.timestamp)
  const ageMs = nowMs - timestampMs
  if (ageMs > maxAgeSeconds * 1000 || ageMs < -60_000) fail('SHOPEE_EVENT_STALE')

  const data = payload.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('SHOPEE_PAYLOAD_INVALID')

  if (code === 3) {
    const orderNumber = safeExternalValue(data.ordersn)
    const status = safeExternalValue(data.status)
    return {
      externalEventId: `${shopId}:${orderNumber}:${status}`,
      eventType: 'order_status',
      payload,
    }
  }

  return {
    externalEventId: `${shopId}:${safeExternalValue(payload.event_id)}`,
    eventType: `push_${code}`,
    payload,
  }
}
