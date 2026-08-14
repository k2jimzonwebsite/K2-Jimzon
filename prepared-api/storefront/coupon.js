import {
  publicFailure, readJson, requireAllowedOrigin, requireStorefrontProject, safeJson,
  signedRpcArguments, text,
} from '../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../server/storefront-bff/supabase.js'

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => !['code','subtotal'].includes(key))) throw new Error('REQUEST_INVALID')
  const code = text(body.code, 'COUPON', { required: true, min: 1, max: 64 }).toUpperCase()
  if (!/^[A-Z0-9_-]+$/.test(code)) throw new Error('COUPON_INVALID')
  const subtotal = Number(body.subtotal)
  if (!Number.isFinite(subtotal) || subtotal < 0 || subtotal > 10000000) throw new Error('SUBTOTAL_INVALID')
  return { code, subtotal: Math.round(subtotal * 100) / 100 }
}

export default async function handler(req, res) {
  if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
  try {
    const payload = validate(await readJson(req))
    const client = createStorefrontServerSupabase()
    const { data, error } = await client.rpc('preview_guest_coupon_v1', signedRpcArguments(req, 'coupon', payload))
    if (error) return safeJson(res, 503, { error: { code: 'COUPON_SERVICE_UNAVAILABLE' } })
    const mapped = mapBoundaryResult(data)
    if (!mapped.ok) return safeJson(res, mapped.status, { error: { code: mapped.code } },
      mapped.retryAfter ? { 'Retry-After': mapped.retryAfter } : {})
    const { ok: _ok, error_code: _error, retry_after_seconds: _retry, ...preview } = mapped.result
    return safeJson(res, 200, { ok: true, preview })
  } catch (error) {
    const [status, code] = publicFailure(error)
    return safeJson(res, status, { error: { code } })
  }
}
