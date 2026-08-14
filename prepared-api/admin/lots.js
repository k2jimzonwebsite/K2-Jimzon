import { authorizeAdminRequest } from '../../server/admin-bff/authorize.js'
import { readLotData } from '../../server/admin-bff/lots.js'
import { requireAdminProject, safeJson } from '../../server/admin-bff/security.js'

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  try {
    const requestedSku = typeof req.query?.sku === 'string' ? req.query.sku : ''
    return safeJson(res, 200, { ok: true, data: await readLotData(authorized.client, requestedSku) })
  } catch (error) {
    if (error?.message === 'REQUEST_INVALID') return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    return safeJson(res, 503, { error: { code: 'LOTS_UNAVAILABLE' } })
  }
}
