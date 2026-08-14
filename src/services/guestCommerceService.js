const ENABLED = import.meta.env.VITE_GUEST_BFF_ENABLED === 'true'

const PUBLIC_MESSAGES = {
  BOT_CHALLENGE_REQUIRED: 'Please complete the security check and try again.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  REQUEST_CONFLICT: 'This request changed while it was being retried. Please review and submit again.',
  GUEST_ACCESS_REQUIRED: 'This browser does not have access to that conversation.',
  GUEST_ACCESS_EXPIRED: 'This conversation access has expired. Contact K2 Jimzon for help.',
  CONVERSATION_NOT_AVAILABLE: 'That conversation is not available to this browser.',
  INVALID_OR_INELIGIBLE: 'That coupon is invalid or not eligible for this cart.',
}

export async function listGuestConversations() {
  if (!ENABLED) return { ok: false, error: 'Guest messaging is not active yet.' }
  return postGuestCommerce('messages', {})
}

export async function replyToGuestConversation(conversationReference, message, idempotencyKey) {
  if (!ENABLED) return { ok: false, error: 'Guest messaging is not active yet.' }
  return postGuestCommerce('message', { conversationReference, message, idempotencyKey })
}

export function guestBffEnabled() {
  return ENABLED
}

export async function postGuestCommerce(path, body) {
  let response
  try {
    response = await fetch(`/api/storefront/${path}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
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
  return { ok: true, data: result.receipt || result.preview || result.conversations }
}
