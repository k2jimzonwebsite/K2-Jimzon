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
