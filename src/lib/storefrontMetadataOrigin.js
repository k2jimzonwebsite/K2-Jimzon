export const PUBLIC_STOREFRONT_ORIGIN = 'https://www.k2jimzon.com'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

export function resolveStorefrontMetadataOrigin({ origin = '', hostname = '', isDev = false } = {}) {
  const host = String(hostname).toLowerCase()
  if (isDev || LOCAL_HOSTS.has(host)) return origin
  if (host === 'www.k2jimzon.com' || host === 'k2jimzon.com' || host.endsWith('.vercel.app')) {
    return PUBLIC_STOREFRONT_ORIGIN
  }
  return origin
}

