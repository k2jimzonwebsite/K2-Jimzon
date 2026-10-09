// MAP-023: customer tariffs are separate from the carrier-cost pilot.
import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'

const AREAS = ['NCR', 'Greater Luzon', 'Visayas', 'Mindanao']
const FIELDS = ['baseMinor', 'includedWeightG', 'extraKgMinor', 'roundMinor']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    throw new Error('REQUEST_INVALID')
  }
}

export function validateCustomerDeliveryRates(payload) {
  exact(payload, ['expectedVersion', 'reason', 'evidenceRef', 'rates'])
  if (!Number.isInteger(payload.expectedVersion) || payload.expectedVersion < 0 || payload.expectedVersion > 2147483646) {
    throw new Error('REQUEST_INVALID')
  }
  for (const key of ['reason', 'evidenceRef']) {
    if (typeof payload[key] !== 'string' || !payload[key].trim() || payload[key].trim().length > 500) {
      throw new Error('REQUEST_INVALID')
    }
  }
  exact(payload.rates, AREAS)
  for (const area of AREAS) {
    const row = payload.rates[area]
    exact(row, FIELDS)
    for (const field of FIELDS) {
      const min = field === 'extraKgMinor' ? 0 : 1
      const max = field === 'includedWeightG' ? 100000 : 10000000
      if (!Number.isInteger(row[field]) || row[field] < min || row[field] > max) throw new Error('REQUEST_INVALID')
    }
  }
  return payload
}

export async function handleCustomerDeliveryRates(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET, POST' })
  }
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (req.method === 'POST' && !UUID.test(idempotencyKey)) {
    return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: req.method === 'POST' })
  if (!authorized) return undefined
  if (!['Admin', 'Staff'].includes(authorized.identity.role)) {
    return safeJson(res, 403, { error: { code: 'CUSTOMER_TARIFF_STAFF_REQUIRED' } })
  }
  try {
    const writing = req.method === 'POST'
    const args = writing
      ? signedAdminCommandArguments('delivery_customer_rates_publish', authorized.identity.userId, idempotencyKey,
        validateCustomerDeliveryRates(await readJson(req)))
      : undefined
    const { data, error } = await authorized.client.rpc(
      writing ? 'execute_customer_delivery_rates_v1' : 'read_customer_delivery_rates_v1', args,
    )
    if (error) {
      if (error.code === '40001') return safeJson(res, 409, { error: { code: 'CUSTOMER_TARIFF_VERSION_STALE' } })
      if (String(error.message).includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      if (error.code === '42501') return safeJson(res, 403, { error: { code: 'CUSTOMER_TARIFF_STAFF_REQUIRED' } })
      if (error.code === '22023') return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
      if (error.code === '54000') return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      return safeJson(res, 503, { error: { code: 'CUSTOMER_TARIFF_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'CUSTOMER_TARIFF_UNAVAILABLE' } })
  }
}
