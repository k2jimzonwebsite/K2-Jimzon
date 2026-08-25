import { supabase } from '../lib/supabaseClient'
import { guestBffEnabled } from './guestCommerceService'
import { guestBffEndpoint } from './guestCommerceRoutes'
import { fetchWithTimeout, isRequestTimeoutError } from '../lib/fetchWithTimeout'

const ACCOUNT_ENABLED = import.meta.env.VITE_CUSTOMER_ACCOUNT_ENABLED === 'true'

const ACCOUNT_ERRORS = {
  ACCOUNT_AUTH_REQUIRED: 'Your account session has expired. Sign in again.',
  ACCOUNT_NOT_LINKED: 'This account is not linked to a K2 customer record yet.',
  ACCOUNT_CONTACT_NOT_VERIFIED: 'Verify this email address or phone number before linking records.',
  CLAIM_CONTACT_MISMATCH: 'This browser’s guest records use a different verified contact.',
  ACCOUNT_IDENTITY_CONFLICT: 'These records already belong to another verified identity. Contact K2 for a careful review.',
  GUEST_ACCESS_REQUIRED: 'This browser has no active guest records to link.',
  GUEST_ACCESS_EXPIRED: 'This browser’s guest access has expired. Contact K2 if you need help finding a record.',
  CONVERSATION_NOT_AVAILABLE: 'That conversation is not available to this account.',
  REQUEST_CONFLICT: 'This request changed while retrying. Review it and try again.',
  RATE_LIMITED: 'Too many attempts. Wait a moment and try again.',
  BOT_CHALLENGE_REQUIRED: 'Complete the security check and try again.',
  REQUEST_TIMEOUT: 'The request timed out. Check your connection and retry.',
}

export function customerAccountEnabled() {
  return ACCOUNT_ENABLED && guestBffEnabled()
}

export function customerAuthClient() {
  return customerAccountEnabled() ? supabase : null
}

async function accountAuthRequest(path, body) {
  const endpoint = guestBffEndpoint(path)
  if (!customerAccountEnabled() || !endpoint) {
    return { ok: false, error: 'Customer account access is not active yet.' }
  }
  try {
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }, 15000)
    const result = await response.json().catch(() => null)
    if (!response.ok || !result?.ok) {
      return { ok: false, code: result?.error?.code || 'SERVICE_UNAVAILABLE' }
    }
    return { ok: true, data: result }
  } catch (error) {
    return { ok: false, code: isRequestTimeoutError(error) ? 'REQUEST_TIMEOUT' : 'SERVICE_UNAVAILABLE' }
  }
}

export async function requestCustomerEmailLink(email, botToken) {
  const result = await accountAuthRequest('account/auth/email', { email, botToken })
  return result.ok ? { ok: true } : {
    ok: false, error: ACCOUNT_ERRORS[result.code]
      || 'The sign-in email could not be sent. Check the address and try again.',
  }
}

export async function requestCustomerPhoneCode(phone, botToken) {
  const result = await accountAuthRequest('account/auth/phone', { phone, botToken })
  return result.ok ? { ok: true } : {
    ok: false, error: ACCOUNT_ERRORS[result.code]
      || 'The text code could not be sent. Check the number and try again.',
  }
}

export async function verifyCustomerPhoneCode(phone, token) {
  const client = customerAuthClient()
  if (!client) return { ok: false, error: 'Customer account access is not active yet.' }
  const result = await accountAuthRequest('account/auth/verify', { phone, code: token })
  if (!result.ok) return {
    ok: false, error: result.code === 'RATE_LIMITED'
      ? ACCOUNT_ERRORS.RATE_LIMITED : 'That code could not be verified. Request a new code and try again.',
  }
  const { data, error } = await client.auth.setSession({
    access_token: result.data.session.accessToken,
    refresh_token: result.data.session.refreshToken,
  })
  return error || !data?.session
    ? { ok: false, error: 'That code could not be verified. Request a new code and try again.' }
    : { ok: true, session: data.session }
}

async function accountRequest(path, body, accessToken) {
  const endpoint = guestBffEndpoint(path)
  if (!customerAccountEnabled() || !endpoint || !accessToken) {
    return { ok: false, code: 'ACCOUNT_AUTH_REQUIRED', error: ACCOUNT_ERRORS.ACCOUNT_AUTH_REQUIRED }
  }
  let response
  try {
    response = await fetchWithTimeout(endpoint, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(body),
    }, 15000)
  } catch (error) {
    const code = isRequestTimeoutError(error) ? 'REQUEST_TIMEOUT' : 'SERVICE_UNAVAILABLE'
    return { ok: false, code, error: ACCOUNT_ERRORS[code] || 'The account service could not be reached. Check your connection and try again.' }
  }
  let result = null
  try { result = await response.json() } catch { /* stable fallback below */ }
  if (!response.ok || !result?.ok) {
    const code = result?.error?.code || 'SERVICE_UNAVAILABLE'
    return { ok: false, code, error: ACCOUNT_ERRORS[code] || 'The account request could not be completed. Try again.' }
  }
  return { ok: true, data: result.history || result.receipt }
}

export const loadCustomerHistory = (accessToken) => accountRequest('account/history', {}, accessToken)
export const claimGuestCustomer = (accessToken, contactKind, idempotencyKey) =>
  accountRequest('account/claim', { contactKind, idempotencyKey }, accessToken)
export const replyAsCustomerAccount = (accessToken, conversationReference, message, idempotencyKey) =>
  accountRequest('account/message', { conversationReference, message, idempotencyKey }, accessToken)
