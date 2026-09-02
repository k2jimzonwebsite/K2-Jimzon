/**
 * MAP-028 D3 — the marketplace-agnostic half of webhook ingress.
 *
 * The Shopee function's body reader is the only reviewed, hardened push intake
 * K2 has: a strict content-type gate, a 256 KiB ceiling checked against both the
 * declared length and the bytes actually read, an absolute read deadline with
 * stalled-stream cancellation, and strict UTF-8 decoding. None of that is
 * Shopee-specific — it is what any marketplace push needs.
 *
 * It lives here so Lazada and TikTok inherit the reviewed version instead of
 * each getting a fresh transcription with its own chance of dropping the
 * deadline or the length cross-check. One implementation, one security review.
 *
 * What deliberately does NOT live here: signature verification and event
 * identity. Every marketplace signs differently and describes its events
 * differently, and a shared "close enough" signature check is worse than none —
 * it would look verified while verifying the wrong string.
 */

export const MAX_PUSH_BYTES = 256 * 1024

const SAFE_EXTERNAL_VALUE = /^[A-Za-z0-9._:-]{1,128}$/

/**
 * Errors are prefixed per marketplace so a log line names the channel that
 * produced it without the caller having to add context.
 */
function failWith(prefix, code) {
  throw new Error(`${prefix}_${code}`)
}

/**
 * Read a push body under an absolute deadline and a hard byte ceiling.
 *
 * The deadline races the read rather than wrapping it, so a stalled stream is
 * cancelled instead of holding the function open until the platform kills it.
 * The declared Content-Length is checked both before reading (cheap rejection)
 * and against the bytes actually received (a mismatch means a truncated or
 * padded body, which must not be parsed).
 */
export async function readBoundedPushBody(request, { timeoutMs, prefix, maxBytes = MAX_PUSH_BYTES } = {}) {
  const fail = (code) => failWith(prefix, code)
  if (!prefix || typeof prefix !== 'string') throw new Error('PUSH_PREFIX_REQUIRED')
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    fail('BODY_TIMEOUT_INVALID')
  }

  const contentType = String(request.headers.get('content-type') || '').toLowerCase()
  if (!/^application\/json(?:\s*;|$)/.test(contentType)) fail('CONTENT_TYPE_INVALID')

  const declaredLength = request.headers.get('content-length')
  if (declaredLength !== null) {
    const bytes = Number(declaredLength)
    if (!Number.isSafeInteger(bytes) || bytes < 0) fail('CONTENT_LENGTH_INVALID')
    if (bytes > maxBytes) fail('PAYLOAD_TOO_LARGE')
  }

  if (!request.body) fail('PAYLOAD_INVALID')
  const reader = request.body.getReader()
  const chunks = []
  let total = 0
  let timeoutId
  const deadline = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${prefix}_BODY_READ_TIMEOUT`)), timeoutMs)
  })
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline])
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        fail('PAYLOAD_TOO_LARGE')
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
    fail('CONTENT_LENGTH_INVALID')
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    // The exact signed bytes are returned alongside the text. A signature must
    // be verified against what arrived, never against a re-serialised object.
    return {
      rawBody: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
      rawBytes: bytes,
    }
  } catch {
    fail('PAYLOAD_ENCODING_INVALID')
  }
}

/** Seconds or milliseconds to milliseconds, refusing anything else. */
export function normalizedTimestampMs(value, prefix) {
  const numeric = typeof value === 'string' && /^\d{10,13}$/.test(value)
    ? Number(value)
    : value
  if (!Number.isSafeInteger(numeric) || numeric <= 0) failWith(prefix, 'PAYLOAD_INVALID')
  return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric
}

/**
 * A value that will become part of an event identity or a log line.
 *
 * Bounded and character-restricted because it is concatenated into a
 * deterministic key: an unbounded marketplace string could otherwise collide
 * two distinct events onto one identity, or smuggle a separator.
 */
export function safeExternalValue(value, prefix) {
  const normalized = String(value ?? '').trim()
  if (!SAFE_EXTERNAL_VALUE.test(normalized)) failWith(prefix, 'PAYLOAD_INVALID')
  return normalized
}

/**
 * Reject an event outside the replay window.
 *
 * A small negative allowance absorbs clock skew between the marketplace and the
 * platform; anything further in the future is refused rather than trusted.
 */
export function assertWithinReplayWindow({ timestampMs, nowMs, maxAgeSeconds, prefix }) {
  assertReplayWindowConfig(maxAgeSeconds, prefix)
  const ageMs = nowMs - timestampMs
  if (ageMs > maxAgeSeconds * 1000 || ageMs < -60_000) failWith(prefix, 'EVENT_STALE')
}

/**
 * Validate the configured window on its own.
 *
 * Separate from the staleness check so a function with a misconfigured window
 * fails on its own configuration at the top of validation, rather than
 * appearing to reject a customer's event.
 */
export function assertReplayWindowConfig(maxAgeSeconds, prefix) {
  if (!Number.isInteger(maxAgeSeconds) || maxAgeSeconds < 60 || maxAgeSeconds > 86_400) {
    failWith(prefix, 'REPLAY_WINDOW_INVALID')
  }
}

/** A push envelope must be a plain object, never an array or a primitive. */
export function assertPlainObject(value, prefix, code = 'PAYLOAD_INVALID') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) failWith(prefix, code)
  return value
}
