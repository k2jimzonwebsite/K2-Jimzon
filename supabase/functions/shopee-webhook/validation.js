import {
  MAX_PUSH_BYTES, assertPlainObject, assertReplayWindowConfig, assertWithinReplayWindow,
  normalizedTimestampMs, readBoundedPushBody, safeExternalValue,
} from '../_shared/marketplace-push.js'

/**
 * Shopee push validation.
 *
 * The bounded body read, replay window, and value-safety rules moved to
 * `_shared/marketplace-push.js` (MAP-028 D3) so Lazada and TikTok inherit the
 * reviewed implementation rather than a re-transcription. Error codes and
 * exports are unchanged: every `SHOPEE_*` string this module produced before
 * the extraction is still the string it produces.
 *
 * What stays here is the part that is genuinely Shopee's: how it identifies an
 * event. `code` is Shopee's push type, and an order-status push (code 3) is
 * keyed by shop, order number and status so a redelivery of the same transition
 * resolves to the same identity while a real status change does not.
 */

const PREFIX = 'SHOPEE'

export const MAX_SHOPEE_PUSH_BYTES = MAX_PUSH_BYTES

export async function readShopeePushBody(request, { timeoutMs } = {}) {
  return readBoundedPushBody(request, { timeoutMs, prefix: PREFIX })
}

export function buildShopeeEventEnvelope(payload, { nowMs = Date.now(), maxAgeSeconds } = {}) {
  // Checked before the payload so a misconfigured function fails on its own
  // configuration rather than appearing to reject a customer's event.
  assertReplayWindowConfig(maxAgeSeconds, PREFIX)
  assertPlainObject(payload, PREFIX)

  const code = payload.code
  const shopId = payload.shop_id
  if (!Number.isSafeInteger(code) || code < 0 || code > 1_000_000
      || !Number.isSafeInteger(shopId) || shopId <= 0) {
    throw new Error('SHOPEE_PAYLOAD_INVALID')
  }

  const timestampMs = normalizedTimestampMs(payload.timestamp, PREFIX)
  assertWithinReplayWindow({ timestampMs, nowMs, maxAgeSeconds, prefix: PREFIX })

  const data = assertPlainObject(payload.data, PREFIX)

  if (code === 3) {
    const orderNumber = safeExternalValue(data.ordersn, PREFIX)
    const status = safeExternalValue(data.status, PREFIX)
    return {
      externalEventId: `${shopId}:${orderNumber}:${status}`,
      eventType: 'order_status',
      payload,
    }
  }

  return {
    externalEventId: `${shopId}:${safeExternalValue(payload.event_id, PREFIX)}`,
    eventType: `push_${code}`,
    payload,
  }
}
