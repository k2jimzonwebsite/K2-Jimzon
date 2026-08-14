import { authorizeAdminRequest } from '../../../server/admin-bff/authorize.js'
import { readConversationHistory } from '../../../server/admin-bff/inbox.js'
import { requireAdminProject, safeJson } from '../../../server/admin-bff/security.js'

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  const conversationId = String(Array.isArray(req.query?.conversationId) ? req.query.conversationId[0] : req.query?.conversationId || '')
  try { return safeJson(res, 200, { ok: true, events: await readConversationHistory(authorized.client, conversationId) }) }
  catch (error) {
    const code = error?.message === 'REQUEST_INVALID' ? 'REQUEST_INVALID' : 'INBOX_HISTORY_UNAVAILABLE'
    return safeJson(res, code === 'REQUEST_INVALID' ? 400 : 503, { error: { code } })
  }
}
