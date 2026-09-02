import { guestBffEndpoint } from './guestCommerceRoutes.js'
import { fetchWithTimeout, isRequestTimeoutError } from '../lib/fetchWithTimeout.js'

const ENABLED = import.meta.env.VITE_GUEST_BFF_ENABLED === 'true'

const PUBLIC_MESSAGES = {
  BOT_CHALLENGE_REQUIRED: 'Please complete the security check and try again.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  REQUEST_CONFLICT: 'This request changed while it was being retried. Please review and submit again.',
  GUEST_ACCESS_REQUIRED: 'This browser does not have access to that conversation.',
  GUEST_ACCESS_EXPIRED: 'This conversation access has expired. Contact K2 Jimzon for help.',
  CONVERSATION_NOT_AVAILABLE: 'That conversation is not available to this browser.',
  INVALID_OR_INELIGIBLE: 'That coupon is invalid or not eligible for this cart.',
  REQUEST_TIMEOUT: 'The request timed out. Check your connection, then retry the same request.',
  DELIVERY_QUOTE_UNAVAILABLE: 'We could not calculate delivery right now. Your order will be quoted after review.',
}

export async function listGuestConversations() {
  if (!ENABLED) return { ok: false, error: 'Guest messaging is not active yet.' }
  return postGuestCommerce('messages', {})
}

export async function listGuestOrders() {
  if (!ENABLED) return { ok: false, error: 'Order status is not active yet.' }
  return postGuestCommerce('order/status', {})
}

export async function replyToGuestConversation(conversationReference, message, idempotencyKey) {
  if (!ENABLED) return { ok: false, error: 'Guest messaging is not active yet.' }
  return postGuestCommerce('message', { conversationReference, message, idempotencyKey })
}

export async function startGuestConversation(payload) {
  if (!ENABLED) return { ok: false, error: 'Guest messaging is not active yet.' }
  return postGuestCommerce('conversation', payload)
}

// MAP-023. Returns a delivery charge only for an exact locality inside the
// owner-approved pilot. Every other case — including an unreachable service —
// leaves checkout on the existing quoted-after-review path, so a failure here
// can never turn into a wrong number in front of a customer.
export async function quoteGuestDelivery(payload) {
  if (!ENABLED) return { ok: false, error: 'Delivery quotation is not active yet.' }
  return postGuestCommerce('delivery/quote', payload)
}

export function guestBffEnabled() {
  return ENABLED
}

export async function postGuestCommerce(path, body) {
  const endpoint = guestBffEndpoint(path)
  if (!endpoint) {
    return { ok: false, code: 'REQUEST_INVALID', error: 'The request could not be completed.' }
  }
  let response
  try {
    response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, 15000)
  } catch (error) {
    if (isRequestTimeoutError(error)) {
      return { ok: false, code: 'REQUEST_TIMEOUT', error: PUBLIC_MESSAGES.REQUEST_TIMEOUT }
    }
    return { ok: false, error: 'The service could not be reached. Check your connection and try again.' }
  }

  let result = null
  try { result = await response.json() } catch { /* stable fallback below */ }
  if (!response.ok || !result?.ok) {
    const code = result?.error?.code || 'SERVICE_UNAVAILABLE'
    return {
      ok: false,
      code,
      retryAfter: Number(response.headers.get('Retry-After') || 0),
      error: PUBLIC_MESSAGES[code] || 'The request could not be completed. Please try again.',
    }
  }
  return { ok: true, data: result.receipt || result.preview || result.conversations || result.orders }
}
