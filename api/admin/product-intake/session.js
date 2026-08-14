import { authorizeAdminRequest } from '../../../server/admin-bff/authorize.js'
import { handleProductIntakeCommand, readProductIntakeSession } from '../../../server/admin-bff/product-intake.js'
import { requireAdminProject, safeJson } from '../../../server/admin-bff/security.js'

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method === 'POST') return handleProductIntakeCommand(req, res, 'intake_session_create')
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  const sessionId = String(req.query?.sessionId || '').trim()
  if (sessionId && !/^[0-9a-f-]{36}$/i.test(sessionId)) return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
  try { return safeJson(res, 200, { ok: true, data: await readProductIntakeSession(authorized.client, sessionId || null) }) }
  catch { return safeJson(res, 503, { error: { code: 'INTAKE_UNAVAILABLE' } }) }
}
