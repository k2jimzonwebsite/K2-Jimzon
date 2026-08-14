import { authorizeAdminRequest } from '../../server/admin-bff/authorize.js'
import { readAdminInbox } from '../../server/admin-bff/inbox.js'
import { requireAdminProject, safeJson } from '../../server/admin-bff/security.js'

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  try { return safeJson(res, 200, { ok: true, data: await readAdminInbox(authorized.client) }) }
  catch { return safeJson(res, 503, { error: { code: 'INBOX_UNAVAILABLE' } }) }
}
