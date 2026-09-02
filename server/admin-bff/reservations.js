// MAP-023 reservation holds.
//
// Staff need three things from a hold: to see which ones are about to lapse, to
// extend one when a customer is genuinely still coming, and to return expired
// units to the sellable pool.
//
// K2 has no scheduled-job infrastructure, so the release sweep is deliberately
// staff-initiated rather than automatic. That is an honest limitation, not a
// design preference: a button someone presses is visible and attributable, where
// a cron job K2 does not have would be a promise the system cannot keep. The
// upgrade path to a real scheduler is recorded in MAP-023.

import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson } from './security.js'
import { RESERVATION_POLICY, extensionRefusalReason } from '../../src/lib/reservationPolicy.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REQUEST_INVALID')
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
}

export function validateReservationCommand(action, body) {
  if (action === 'reservation_extend') {
    exactObject(body, ['reservationId', 'minutes', 'reason'])
    const reservationId = String(body.reservationId ?? '').trim()
    if (!UUID.test(reservationId)) throw new Error('REQUEST_INVALID')
    // Same bounds the database enforces. Checking here too means staff get a
    // useful message instead of a generic provider error.
    if (extensionRefusalReason(body.minutes) !== null) throw new Error('REQUEST_INVALID')
    const reason = String(body.reason ?? '').trim()
    if (reason.length < 10 || reason.length > 500) throw new Error('REQUEST_INVALID')
    return { reservationId, minutes: body.minutes, reason }
  }

  if (action === 'reservation_release_expired') {
    exactObject(body, ['limit', 'reason'])
    if (!Number.isInteger(body.limit) || body.limit < 1 || body.limit > 5000) {
      throw new Error('REQUEST_INVALID')
    }
    const reason = String(body.reason ?? '').trim()
    if (reason.length < 10 || reason.length > 500) throw new Error('REQUEST_INVALID')
    return { limit: body.limit, reason }
  }

  throw new Error('REQUEST_INVALID')
}

/** Holds that are active and carry a real deadline, soonest first. */
export async function readReservationsDue(client) {
  const { data, error } = await client
    .from('v_reservations_due')
    .select('id,order_request_id,sku,quantity,expires_at,extension_count,minutes_remaining,is_overdue')
    .order('expires_at', { ascending: true })
    .limit(500)
  if (error) throw new Error('RESERVATIONS_UNAVAILABLE')
  const rows = data || []
  return {
    reservations: rows,
    overdueCount: rows.filter((row) => row.is_overdue).length,
    policy: RESERVATION_POLICY,
    // Stated in the payload so the UI cannot quietly imply automation K2 lacks.
    automaticRelease: false,
    asOf: new Date().toISOString(),
  }
}

export async function handleReservationsRead(req, res) {
  if (req.method !== 'GET') {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: false })
  if (!authorized) return undefined
  try {
    return safeJson(res, 200, await readReservationsDue(authorized.client))
  } catch {
    return safeJson(res, 503, { error: { code: 'RESERVATIONS_UNAVAILABLE' } })
  }
}

const PROVIDER_ERRORS = new Map([
  ['RESERVATION_EXTENSION_OUT_OF_BOUNDS', [409, 'RESERVATION_EXTENSION_OUT_OF_BOUNDS']],
  ['RESERVATION_EXTENSION_REASON_REQUIRED', [400, 'REQUEST_INVALID']],
  ['RESERVATION_ALREADY_EXPIRED', [409, 'RESERVATION_ALREADY_EXPIRED']],
  ['RESERVATION_NOT_ACTIVE', [409, 'RESERVATION_NOT_ACTIVE']],
  ['RESERVATION_HAS_NO_DEADLINE', [409, 'RESERVATION_HAS_NO_DEADLINE']],
  ['RESERVATION_NOT_FOUND', [404, 'RESERVATION_NOT_FOUND']],
  ['STAFF_REQUIRED', [403, 'STAFF_ACCESS_REQUIRED']],
])

export async function handleReservationCommand(req, res, action) {
  if (req.method !== 'POST') {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  }
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) {
    return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const payload = validateReservationCommand(action, await readJson(req))
    const rpc = action === 'reservation_extend'
      ? authorized.client.rpc('extend_reservation_v1', {
          p_reservation_id: payload.reservationId,
          p_minutes: payload.minutes,
          p_reason: payload.reason,
        })
      : authorized.client.rpc('release_expired_reservations_v1', { p_limit: payload.limit })

    const { data, error } = await rpc
    if (error) {
      const message = String(error.message || '')
      for (const [providerCode, [status, code]] of PROVIDER_ERRORS) {
        if (message.includes(providerCode)) return safeJson(res, status, { error: { code } })
      }
      return safeJson(res, 503, { error: { code: 'RESERVATION_COMMAND_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: Array.isArray(data) ? data[0] : data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'RESERVATION_COMMAND_UNAVAILABLE' } })
  }
}
