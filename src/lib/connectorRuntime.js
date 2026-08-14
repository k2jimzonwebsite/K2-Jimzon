/**
 * Connector Runtime Foundation (MAP-011)
 * Idempotent event intake, queue runner, retries, and dead-letter handling.
 */

export const ADAPTER_STATUSES = Object.freeze({
  IDLE: 'idle',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  RETRYING: 'retrying',
  DEAD_LETTER: 'dead_letter'
})

export const MAX_RETRY_ATTEMPTS = 3

/**
 * Normalizes incoming channel events into an idempotent envelope.
 * @param {string} channel Channel key (shopee, tiktok, lazada)
 * @param {string} eventType Event type name
 * @param {string} eventId External event unique ID
 * @param {object} payload Event payload
 * @returns {object} Idempotent event envelope
 */
export function createEventEnvelope(channel, eventType, eventId, payload = {}) {
  if (!channel || !eventType || !eventId) {
    throw new Error('Connector event requires channel, eventType, and eventId.')
  }
  return {
    idempotencyKey: `${channel}:${eventType}:${eventId}`,
    channel,
    eventType,
    eventId,
    payload,
    attempts: 0,
    status: ADAPTER_STATUSES.IDLE,
    receivedAt: new Date().toISOString(),
    lastError: null
  }
}

/**
 * Process event queue item with retries and dead-letter routing.
 * @param {object} envelope Event envelope
 * @param {function} handler Process function returning boolean/Promise
 * @returns {Promise<object>} Updated envelope
 */
export async function processEventEnvelope(envelope, handler) {
  const item = { ...envelope, attempts: envelope.attempts + 1 }
  try {
    const success = await handler(item.payload)
    if (success !== false) {
      item.status = ADAPTER_STATUSES.COMPLETED
      item.lastError = null
    } else {
      throw new Error('Handler returned non-success result.')
    }
  } catch (err) {
    item.lastError = err.message || 'Unknown processing error'
    if (item.attempts >= MAX_RETRY_ATTEMPTS) {
      item.status = ADAPTER_STATUSES.DEAD_LETTER
    } else {
      item.status = ADAPTER_STATUSES.RETRYING
    }
  }
  return item
}
