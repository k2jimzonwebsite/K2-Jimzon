import { authorizeAdminRequest } from '../../../server/admin-bff/authorize.js'
import { lookupBarcodeCatalog } from '../../../server/admin-bff/barcode-catalog.js'
import { requireAdminProject, safeJson } from '../../../server/admin-bff/security.js'
import { createRateShield } from '../../../server/rate-shield.js'

const catalogRate = createRateShield({ windowMs: 60_000, limit: 10, maxKeys: 1 })

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  const rate = catalogRate.consume('open-food-facts')
  if (!rate.allowed) return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': String(rate.retryAfter) })
  try {
    return safeJson(res, 200, { ok: true, data: await lookupBarcodeCatalog(req.query?.barcode) })
  } catch (error) {
    const code = ['BARCODE_INVALID', 'CATALOG_MISMATCH'].includes(error?.message)
      ? error.message : 'CATALOG_UNAVAILABLE'
    return safeJson(res, code === 'BARCODE_INVALID' ? 400 : 503, { error: { code } })
  }
}
