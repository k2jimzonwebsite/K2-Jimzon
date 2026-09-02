// MAP-023 — the customer-facing delivery estimate.
//
// This handler carries no rate logic of its own. It validates the shape of the
// request, hands it to the security-definer function that owns the rules, and
// returns only what a customer may see: the outcome and, when the order is
// inside the owner-approved pilot, the final charge. Costs, courier identity,
// and evidence never reach the browser.

import {
  publicFailure, readJson, requireAllowedOrigin, requireStorefrontProject, safeJson,
  signedRpcArguments, text,
} from '../../../server/storefront-bff/security.js'
import { createStorefrontServerSupabase, mapBoundaryResult } from '../../../server/storefront-bff/supabase.js'

const FIELDS = [
  'channel', 'service', 'localityId', 'parcelCount', 'weightG',
  'merchandiseSubtotalMinor', 'oversize', 'remoteArea', 'specialProtection',
]
const CHANNELS = new Set(['Website', 'Pasabuy'])
const SERVICES = new Set(['K2 Standard Delivery', 'K2 Pickup'])
const ID = /^[A-Z][A-Z0-9-]{2,63}$/

function integer(value, { min, max }) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error('REQUEST_INVALID')
  return value
}

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => !FIELDS.includes(key))) {
    throw new Error('REQUEST_INVALID')
  }
  const channel = text(body.channel, 'CHANNEL', { required: true, min: 1, max: 32 })
  if (!CHANNELS.has(channel)) throw new Error('REQUEST_INVALID')
  const service = text(body.service, 'SERVICE', { required: true, min: 1, max: 32 })
  if (!SERVICES.has(service)) throw new Error('REQUEST_INVALID')
  const localityId = text(body.localityId, 'LOCALITY', { required: true, min: 3, max: 64 })
  if (!ID.test(localityId)) throw new Error('REQUEST_INVALID')
  // Each exception must be answered explicitly. A missing flag is unknown, and
  // the database treats unknown as outside the pilot rather than as "no".
  for (const flag of ['oversize', 'remoteArea', 'specialProtection']) {
    if (typeof body[flag] !== 'boolean') throw new Error('REQUEST_INVALID')
  }
  return {
    channel,
    service,
    localityId,
    parcelCount: integer(body.parcelCount, { min: 1, max: 50 }),
    weightG: integer(body.weightG, { min: 1, max: 100_000 }),
    merchandiseSubtotalMinor: integer(body.merchandiseSubtotalMinor, { min: 0, max: 100_000_000 }),
    oversize: body.oversize,
    remoteArea: body.remoteArea,
    specialProtection: body.specialProtection,
  }
}

export default async function handler(req, res) {
  if (!requireStorefrontProject()) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'POST') {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  }
  if (!requireAllowedOrigin(req)) return safeJson(res, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } })
  try {
    const payload = validate(await readJson(req))
    const client = createStorefrontServerSupabase()
    const { data, error } = await client.rpc(
      'quote_guest_delivery_v1',
      signedRpcArguments(req, 'delivery_quote', payload),
    )
    if (error) return safeJson(res, 503, { error: { code: 'DELIVERY_QUOTE_UNAVAILABLE' } })
    const mapped = mapBoundaryResult(data)
    if (!mapped.ok) {
      return safeJson(res, mapped.status, { error: { code: mapped.code } },
        mapped.retryAfter ? { 'Retry-After': mapped.retryAfter } : {})
    }
    const {
      ok: _ok, error_code: _error, retry_after_seconds: _retry,
      outcome, fee_minor: feeMinor, currency, customer_visible: customerVisible,
    } = mapped.result
    return safeJson(res, 200, {
      ok: true,
      // Only these two outcomes carry a number. Anything else leaves checkout on
      // the existing quoted-after-review path.
      quote: {
        outcome,
        feeMinor: customerVisible ? feeMinor : null,
        currency: currency || 'PHP',
        customerVisible: Boolean(customerVisible),
      },
    })
  } catch (error) {
    const [status, code] = publicFailure(error)
    return safeJson(res, status, { error: { code } })
  }
}
