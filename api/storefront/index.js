import storefrontBffRouter from '../../server/storefront-bff/router.js'
import { safeJson } from '../../server/storefront-bff/security.js'

// The legacy Vercel build allowlist ignores this export; match it in the Storefront project's Function settings.
export const maxDuration = 10

function storefrontBoundaryEnabled() {
  return process.env.K2_DEPLOYMENT_TARGET === 'storefront'
    && process.env.K2_STOREFRONT_BFF_ENABLED === 'true'
}

export default async function storefrontEntrypoint(req, res) {
  if (!storefrontBoundaryEnabled()) {
    return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  }
  return storefrontBffRouter(req, res)
}
