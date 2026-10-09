import { guestBffEndpoint } from './guestCommerceRoutes.js'
import { fetchWithTimeout, isRequestTimeoutError } from '../lib/fetchWithTimeout.js'

const ENABLED = import.meta.env.VITE_GUEST_BFF_ENABLED === 'true'

const PUBLIC_MESSAGES = {
  BOT_CHALLENGE_REQUIRED: 'Please complete the security check and try again.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  REQUEST_CONFLICT: 'This request changed while it was being retried. Please review and submit again.',
  IDEMPOTENCY_CONFLICT: 'This request key already belongs to different details. Check the original request with K2 staff before starting another.',
  GUEST_ACCESS_REQUIRED: 'This browser does not have access to that conversation.',
  GUEST_ACCESS_EXPIRED: 'This conversation access has expired. Contact K2 Jimzon for help.',
  CONVERSATION_NOT_AVAILABLE: 'That conversation is not available to this browser.',
  INVALID_OR_INELIGIBLE: 'That coupon is invalid or not eligible for this cart.',
  REQUEST_TIMEOUT: 'The request timed out. Check your connection, then retry the same request.',
  DELIVERY_QUOTE_UNAVAILABLE: 'We could not calculate delivery right now. Retry the delivery check before submitting.',
  DELIVERY_QUOTE_CHANGED: 'The delivery quote changed. Review the updated charge before submitting again.',
  DELIVERY_REVIEW_REQUIRED: 'Please review delivery before submitting this order.',
  DELIVERY_ACCEPTANCE_REQUIRED: 'Please accept the delivery quote before continuing.',
  EXPRESS_QUOTE_STALE: 'The quote changed. Refresh the order and review the complete total again.',
  EXPRESS_QUOTE_EXPIRED: 'This quote expired. Ask staff for a current quote, then refresh the order.',
  EXPRESS_ORDER_INELIGIBLE: 'This order cannot accept another quote. Refresh its current status or contact K2.',
  DELIVERY_ACCESS_REQUIRED: 'This browser no longer has access. Your saved approval is kept; contact K2 before starting another.',
  // Someone reached the last unit first. Said plainly, and while the customer
  // can still act on it, rather than after they have paid for it.
  INSUFFICIENT_STOCK: 'Someone else just took the last of one item in your cart. Nothing was charged. Review your cart and try again.',
}

export async function listGuestConversations() {
  if (!ENABLED) return { ok: false, error: 'Guest messaging is not active yet.' }
  return postGuestCommerce('messages', {})
}

export async function listGuestOrders() {
  if (!ENABLED) return { ok: false, error: 'Order status is not active yet.' }
  return postGuestCommerce('order/status', {})
}

export async function acceptGuestExpressDelivery(body) {
  if (!ENABLED) return { ok: false, error: 'Delivery approval is not active yet.' }
  return postGuestCommerce('order/delivery-accept', body)
}

export async function replyToGuestConversation(conversationReference, message, idempotencyKey) {
  if (!ENABLED) return { ok: false, error: 'Guest messaging is not active yet.' }
  return postGuestCommerce('message', { conversationReference, message, idempotencyKey })
}

export async function startGuestConversation(payload) {
  if (!ENABLED) return { ok: false, error: 'Guest messaging is not active yet.' }
  return postGuestCommerce('conversation', payload)
}

// MAP-023. Identifiers only; canonical weights and customer tariffs stay server-side.
export async function quoteGuestDelivery(payload) {
  if (!ENABLED) return { ok: false, error: 'Delivery quotation is not active yet.' }
  return postGuestCommerce('delivery/quote', payload)
}

export async function listDeliveryLocations(parent = null) {
  if (!ENABLED) return { ok: false, error: 'Delivery selection is not active yet.' }
  if (parent !== null && !/^[0-9]{10}$/.test(parent)) return { ok: false, error: 'Choose a delivery area again.' }
  try {
    const endpoint = guestBffEndpoint('delivery/locations')
    const response = await fetchWithTimeout(`${endpoint}${parent ? `?parent=${parent}` : ''}`, {
      method: 'GET', credentials: 'same-origin',
    }, 15000)
    const result = await response.json()
    if (!response.ok || !result?.ok || result.sourceVersion !== 'psgc-2026-06-30'
        || !Array.isArray(result.children) || result.children.length > 1000
        || result.children.some(place => !/^[0-9]{10}$/.test(place.code || '')
          || typeof place.name !== 'string' || !['Reg','Prov','Group','City','Mun','SubMun','Bgy'].includes(place.level)
          || place.sourceVersion !== result.sourceVersion)) throw new Error('LOCATIONS_UNAVAILABLE')
    return { ok: true, sourceVersion: result.sourceVersion, children: result.children }
  } catch {
    return { ok: false, error: 'We could not load delivery areas. Retry the area check.' }
  }
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
  return {
    ok: true,
    data: result.receipt || result.preview || result.conversations || result.orders || result.quote,
    quote: result.quote,
  }
}

