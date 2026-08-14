import { authorizeAdminRequest } from '../../../server/admin-bff/authorize.js'
import { searchProductIntakeDuplicates } from '../../../server/admin-bff/product-intake.js'
import { requireAdminProject, safeJson } from '../../../server/admin-bff/security.js'

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  try {
    return safeJson(res, 200, { ok: true, data: await searchProductIntakeDuplicates(authorized.client, req.query?.query) })
  } catch (error) {
    const code = error?.message === 'REQUEST_INVALID' ? 'REQUEST_INVALID' : 'INTAKE_DUPLICATES_UNAVAILABLE'
    return safeJson(res, code === 'REQUEST_INVALID' ? 400 : 503, { error: { code } })
  }
}
