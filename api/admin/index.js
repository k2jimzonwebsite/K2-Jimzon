import adminBffRouter from '../../server/admin-bff/router.js'
import { safeJson } from '../../server/admin-bff/security.js'

// The legacy Vercel build allowlist ignores this export; match it in the Admin project's Function settings.
export const maxDuration = 180

function adminBoundaryEnabled() {
  return process.env.K2_DEPLOYMENT_TARGET === 'admin'
    && process.env.K2_ADMIN_BFF_ENABLED === 'true'
}

export default async function adminEntrypoint(req, res) {
  if (!adminBoundaryEnabled()) {
    return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  }
  return adminBffRouter(req, res)
}
