// Public Google identifier. No account, order, search text or URL parameters
// enter this boundary. Preview hosts and Admin never collect analytics.
export const GA4_MEASUREMENT_ID = 'G-4JQ3D0GDB9'
export const ANALYTICS_CHOICE_EVENT = 'k2:analytics-choices'
const CONSENT_KEY = 'k2-analytics-consent-v1'
const SIX_MONTHS = 180 * 24 * 60 * 60 * 1000
let started = false
let lastPath = null

export function browserDeclinesAnalytics() {
  return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1'
}

export function readAnalyticsConsent() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONSENT_KEY))
    return saved?.expires > Date.now() && ['granted', 'denied'].includes(saved.choice) ? saved.choice : null
  } catch { return null }
}

export function analyticsConsentExpiresAt() {
  try { return Number(JSON.parse(localStorage.getItem(CONSENT_KEY))?.expires) || 0 }
  catch { return 0 }
}

export function saveAnalyticsConsent(choice) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ choice, expires: Date.now() + SIX_MONTHS }))
    return true
  } catch { return false }
}

export function publicAnalyticsPath(view, product) {
  const paths = { home: '/', catalog: '/catalog', pasabuy: '/pasabuy', wholesale: '/trade', contact: '/contact', store: '/store', privacy: '/privacy', terms: '/terms', returns: '/returns', policies: '/policies' }
  if (view !== 'master_product') return paths[view] || null
  return product?.sku && /^[A-Za-z0-9_-]{1,160}$/.test(product.sku) ? `/product/${encodeURIComponent(product.sku)}` : null
}

function forgetAnalyticsCookies() {
  const names = document.cookie.split(';').map(value => value.trim().split('=')[0]).filter(name => /^_ga(?:_|$)/.test(name))
  for (const name of names) {
    for (const domain of ['', '; domain=www.k2jimzon.com', '; domain=.k2jimzon.com']) {
      document.cookie = `${name}=; max-age=0; path=/${domain}; SameSite=Lax`
    }
  }
}

export function updateAnalytics(choice, path) {
  const hostAllowed = window.location.hostname === 'www.k2jimzon.com'
    || (import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(window.location.hostname))
  const expires = analyticsConsentExpiresAt()
  const enabled = hostAllowed && choice === 'granted' && (!expires || expires > Date.now()) && !browserDeclinesAnalytics() && Boolean(path)
  window[`ga-disable-${GA4_MEASUREMENT_ID}`] = !enabled
  if (!enabled) {
    lastPath = null
    if (started) window.gtag('consent', 'update', { analytics_storage: 'denied' })
    if (choice !== 'granted' || browserDeclinesAnalytics()) forgetAnalyticsCookies()
    return
  }
  const location = `https://www.k2jimzon.com${path}`
  let referrer = ''
  try { referrer = new URL(document.referrer).origin } catch { /* No referrer. */ }
  if (!started) {
    window.dataLayer = window.dataLayer || []
    window.gtag = function () { window.dataLayer.push(arguments) }
    window.gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' })
    window.gtag('js', new Date())
    window.gtag('config', GA4_MEASUREMENT_ID, { send_page_view: false, page_location: location, page_referrer: referrer, page_title: 'K2 Jimzon', allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: SIX_MONTHS / 1000 })
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`
    document.head.appendChild(script)
    started = true
  }
  window.gtag('consent', 'update', { analytics_storage: 'granted' })
  window.gtag('set', { page_location: location, page_referrer: referrer, page_title: 'K2 Jimzon' })
  if (path !== lastPath) {
    window.gtag('event', 'page_view', { send_to: GA4_MEASUREMENT_ID, page_location: location, page_referrer: referrer, page_title: 'K2 Jimzon' })
    lastPath = path
  }
}
