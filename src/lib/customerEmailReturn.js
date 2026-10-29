const fields = ['token_hash', 'type', 'access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'error', 'error_code', 'error_description']
const invalid = () => ({ kind: 'error', message: 'This sign-in link is invalid. Request a new link.' })

// Capture before the lazy SDK initializes. Credentials stay in memory, never
// in HTTP request URLs, application storage, rendered text or diagnostics.
export function captureCustomerEmailReturn(locationLike = globalThis.window?.location, historyLike = globalThis.window?.history) {
  if (!locationLike || !historyLike) return null
  const url = new URL(locationLike.href)
  if (!['/', '/account', '/account/'].includes(url.pathname)) return null
  const fragment = new URLSearchParams(url.hash.slice(1))
  if (!['token_hash', 'access_token', 'refresh_token', 'error', 'error_code'].some(field => fragment.has(field))) return null
  let result = invalid()
  const unique = fields.every(field => fragment.getAll(field).length <= 1)
  const emailType = ['email', 'magiclink', 'signup'].includes(fragment.get('type'))
  if (unique && fragment.has('error')) {
    result = { kind: 'error', message: fragment.get('error_code') === 'otp_expired'
      ? 'This sign-in link has expired or was already used. Request a new link.'
      : 'This sign-in link could not be verified. Request a new link.' }
  } else if (unique && emailType && /^[a-zA-Z0-9_-]{40,256}$/.test(fragment.get('token_hash') || '')
      && !fragment.has('access_token') && !fragment.has('refresh_token')) {
    result = { kind: 'hash', tokenHash: fragment.get('token_hash') }
  } else if (unique && emailType && !fragment.has('token_hash')) {
    const accessToken = fragment.get('access_token') || ''
    const refreshToken = fragment.get('refresh_token') || ''
    if (accessToken.length <= 16384 && /^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/.test(accessToken)
        && /^[a-zA-Z0-9_-]{12,2048}$/.test(refreshToken)) {
      result = { kind: 'session', accessToken, refreshToken }
    }
  }
  fields.forEach(field => fragment.delete(field))
  url.hash = fragment.toString()
  url.pathname = '/account'
  url.searchParams.delete('account')
  try { historyLike.replaceState(historyLike.state ?? null, '', `${url.pathname}${url.search}${url.hash}`) }
  catch { return { kind: 'error', message: 'This browser could not open the sign-in link safely. Reopen the email in a regular browser.' } }
  return result
}
