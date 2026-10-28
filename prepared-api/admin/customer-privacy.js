import { createCustomerPrivacyAdminHandler } from '../../server/admin-bff/customer-privacy.js'
import { requireAdminProject, safeJson } from '../../server/admin-bff/security.js'

const handle = createCustomerPrivacyAdminHandler()
export default function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  return handle(req, res)
}
