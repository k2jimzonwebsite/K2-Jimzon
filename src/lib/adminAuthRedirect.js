export const ADMIN_ROUTE = '/admin-portal-k2-secure'
export const ADMIN_PRODUCTION_ORIGIN = 'https://k2-jimzon-admin-seven.vercel.app'

const ADMIN_OAUTH_RETURN_KEY = 'k2_admin_oauth_return_to'

function isLocalAdminOrigin(origin) {
  try {
    const hostname = new URL(origin).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export function buildAdminOAuthRedirectUrl(origin, productionOrigin = ADMIN_PRODUCTION_ORIGIN) {
  const safeOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  const redirectOrigin = isLocalAdminOrigin(safeOrigin) ? safeOrigin : productionOrigin
  return new URL(ADMIN_ROUTE, redirectOrigin).toString()
}

export function rememberAdminOAuthReturn() {
  try {
    window.sessionStorage.setItem(ADMIN_OAUTH_RETURN_KEY, ADMIN_ROUTE)
  } catch (error) {
    // OAuth still works when storage is unavailable; the explicit callback
    // URL remains the primary way back to the protected admin route.
  }
}

export function consumeAdminOAuthReturn() {
  try {
    const returnTo = window.sessionStorage.getItem(ADMIN_OAUTH_RETURN_KEY)
    window.sessionStorage.removeItem(ADMIN_OAUTH_RETURN_KEY)
    return returnTo === ADMIN_ROUTE ? ADMIN_ROUTE : null
  } catch (error) {
    return null
  }
}

export function clearAdminOAuthReturn() {
  try {
    window.sessionStorage.removeItem(ADMIN_OAUTH_RETURN_KEY)
  } catch (error) {
    // Ignore storage errors in restricted browsers.
  }
}

const OAUTH_QUERY_FIELDS = [
  'code', 'error', 'error_code', 'error_description',
  'access_token', 'refresh_token', 'provider_token', 'provider_refresh_token',
]

export function clearAdminOAuthCredentialsFromUrl(
  locationLike = typeof window !== 'undefined' ? window.location : null,
  historyLike = typeof window !== 'undefined' ? window.history : null,
) {
  if (!locationLike || !historyLike) return false

  const hashParams = new URLSearchParams(String(locationLike.hash || '').replace(/^#/, ''))
  const searchParams = new URLSearchParams(String(locationLike.search || '').replace(/^\?/, ''))
  const hasOAuthCredentials = OAUTH_QUERY_FIELDS.some(
    (field) => hashParams.has(field) || searchParams.has(field),
  )
  if (!hasOAuthCredentials) return false

  OAUTH_QUERY_FIELDS.forEach((field) => searchParams.delete(field))
  const safeSearch = searchParams.toString()
  const safeUrl = `${locationLike.pathname || ADMIN_ROUTE}${safeSearch ? `?${safeSearch}` : ''}`
  historyLike.replaceState(historyLike.state ?? null, '', safeUrl)
  return true
}
