import {
  authorizationBearer, idempotencyKey, publicFailure, readJson,
  requireAllowedOrigin, requireStorefrontProject, safeJson,
  signedRpcArguments, text,
} from '../../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../../server/storefront-bff/supabase.js'

export function validateAccountClaim(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => !['contactKind', 'idempotencyKey'].includes(key))) {
    throw new Error('REQUEST_INVALID')
  }
  const contactKind = text(body.contactKind, 'CONTACT_KIND', { required: true, min: 5, max: 5 })
  if (!['email', 'phone'].includes(contactKind)) throw new Error('CONTACT_KIND_INVALID')
  return { contactKind, idempotencyKey: idempotencyKey(body.idempotencyKey) }
}

export default async function handler(req, res) {
  if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
  const accessToken = authorizationBearer(req)
  if (!accessToken) return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })

  try {
    const payload = validateAccountClaim(await readJson(req))
    const client = createStorefrontServerSupabase(accessToken)
    const { data: identity, error: identityError } = await client.auth.getUser(accessToken)
    if (identityError || !identity?.user?.id) {
      return safeJson(res, 401, { error: { code: 'ACCOUNT_AUTH_REQUIRED' } })
    }
    const { data, error } = await client.rpc(
      'claim_guest_customer_account_v1', signedRpcArguments(req, 'account_claim', payload)
    )
    if (error) return safeJson(res, 503, { error: { code: 'ACCOUNT_CLAIM_UNAVAILABLE' } })
    const mapped = mapBoundaryResult(data)
    if (!mapped.ok) return safeJson(res, mapped.status, { error: { code: mapped.code } },
      mapped.retryAfter ? { 'Retry-After': mapped.retryAfter } : {})
    return safeJson(res, 200, {
      ok: true,
      receipt: {
        claimed: mapped.result.claimed === true,
        guest_access_revoked: mapped.result.guest_access_revoked === true,
        linked_at: mapped.result.linked_at,
      },
    })
  } catch (error) {
    const [status, code] = publicFailure(error)
    return safeJson(res, status, { error: { code } })
  }
}
