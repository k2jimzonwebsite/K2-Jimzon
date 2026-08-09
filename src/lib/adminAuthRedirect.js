export const ADMIN_ROUTE = '/admin-portal-k2-secure'

const ADMIN_OAUTH_RETURN_KEY = 'k2_admin_oauth_return_to'

export function buildAdminOAuthRedirectUrl(origin) {
  const safeOrigin = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  return new URL(ADMIN_ROUTE, safeOrigin).toString()
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
