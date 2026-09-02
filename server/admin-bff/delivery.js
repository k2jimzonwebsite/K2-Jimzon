// MAP-023 delivery quotation BFF.
//
// Reads the control tables for the dashboard, and validates every write before it
// reaches the signed admin command. The validation here is a first gate, not the
// boundary: the database re-checks each rule, because this process is replaceable
// and the table constraints are not.

import { authorizeAdminRequest } from './authorize.js'
import { readJson, safeJson, signedAdminCommandArguments } from './security.js'
import { isAdminRole } from './supabase.js'
import {
  COURIER_ELIGIBILITY,
  DELIVERY_OUTCOMES,
  resolveDeliveryQuote,
} from '../../src/lib/deliveryQuote.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ID = /^[A-Z][A-Z0-9-]{2,63}$/
const MATCH_KEY = /^[A-Z0-9*|.-]{3,160}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const ORIGINS = new Set(['WAREHOUSE_A', 'CEBU_TRANSIT_HUB'])
const SCOPES = new Set(['EXACT_PILOT', 'REFERENCE_ONLY'])
const LOCALITY_STATUSES = new Set([
  'DRAFT', 'PILOT_APPROVED', 'PLANNING_FLOOR_NOT_QUOTABLE', 'RETIRED',
])
const FRESHNESS = new Set(['CURRENT', 'REVIEW_DUE', 'SUPERSEDED'])
const COMPLETENESS = new Set(['PROVIDER_TOTAL_COMPLETE', 'PARTIAL', 'UNKNOWN'])

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('REQUEST_INVALID')
  const allowed = new Set(keys)
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error('REQUEST_INVALID')
}

function text(value, { required = false, min = 0, max = 500 } = {}) {
  const result = String(value ?? '').trim()
  if ((required && result.length < Math.max(1, min)) || result.length > max) {
    throw new Error('REQUEST_INVALID')
  }
  return result
}

function identifier(value) {
  const result = text(value, { required: true, max: 64 })
  if (!ID.test(result)) throw new Error('REQUEST_INVALID')
  return result
}

function oneOf(value, allowed) {
  const result = text(value, { required: true, max: 64 })
  if (!allowed.has(result)) throw new Error('REQUEST_INVALID')
  return result
}

function bool(value) {
  if (typeof value !== 'boolean') throw new Error('REQUEST_INVALID')
  return value
}

function calendarDate(value, optional = false) {
  if (optional && (value === null || value === undefined || value === '')) return null
  const result = text(value, { required: true, max: 10 })
  if (!DATE.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00Z`))) {
    throw new Error('REQUEST_INVALID')
  }
  return result
}

/** Centavos only. A float amount would round differently here than in Postgres. */
function amountMinor(value) {
  if (!Number.isInteger(value) || value <= 0 || value > 1_000_000) throw new Error('REQUEST_INVALID')
  return value
}

export function validateDeliveryCommand(action, body) {
  if (action === 'delivery_courier_upsert') {
    exactObject(body, [
      'optionId', 'providerId', 'providerName', 'serviceCode', 'serviceName',
      'originId', 'eligibility', 'approved', 'sortOrder', 'notes', 'reason',
    ])
    const eligibility = oneOf(body.eligibility, new Set(COURIER_ELIGIBILITY))
    const approved = bool(body.approved)
    // Mirrors the table constraint: a selectable courier must be an approved one.
    if (eligibility === 'AUTO_QUOTE_ELIGIBLE' && !approved) throw new Error('REQUEST_INVALID')
    if (!Number.isInteger(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 10_000) {
      throw new Error('REQUEST_INVALID')
    }
    return {
      optionId: identifier(body.optionId),
      providerId: identifier(body.providerId),
      providerName: text(body.providerName, { required: true, min: 2, max: 120 }),
      serviceCode: text(body.serviceCode, { required: true, min: 2, max: 60 }),
      serviceName: text(body.serviceName, { required: true, min: 2, max: 120 }),
      originId: oneOf(body.originId, ORIGINS),
      eligibility,
      approved,
      sortOrder: body.sortOrder,
      notes: text(body.notes, { max: 2000 }),
      reason: text(body.reason, { required: true, min: 10, max: 500 }),
    }
  }

  if (action === 'delivery_courier_state') {
    exactObject(body, ['optionId', 'eligibility', 'approved', 'reason'])
    const eligibility = oneOf(body.eligibility, new Set(COURIER_ELIGIBILITY))
    const approved = bool(body.approved)
    if (eligibility === 'AUTO_QUOTE_ELIGIBLE' && !approved) throw new Error('REQUEST_INVALID')
    return {
      optionId: identifier(body.optionId),
      eligibility,
      approved,
      reason: text(body.reason, { required: true, min: 10, max: 500 }),
    }
  }

  if (action === 'delivery_locality_upsert') {
    exactObject(body, [
      'localityId', 'matchKey', 'scope', 'status', 'profileId', 'psgcCode', 'region',
      'islandGroup', 'province', 'cityMunicipality', 'barangay', 'evidenceNote', 'reason',
    ])
    const matchKey = text(body.matchKey, { required: true, min: 3, max: 160 })
    if (!MATCH_KEY.test(matchKey)) throw new Error('REQUEST_INVALID')
    const scope = oneOf(body.scope, SCOPES)
    const status = oneOf(body.status, LOCALITY_STATUSES)
    // The rule that stops a regional fallback: only an exact locality is quotable,
    // and an exact locality that is approved must be quotable.
    if ((status === 'PILOT_APPROVED') !== (scope === 'EXACT_PILOT')) {
      throw new Error('REQUEST_INVALID')
    }
    return {
      localityId: identifier(body.localityId),
      matchKey,
      scope,
      status,
      profileId: identifier(body.profileId),
      psgcCode: text(body.psgcCode, { max: 20 }) || null,
      region: text(body.region, { max: 120 }),
      islandGroup: text(body.islandGroup, { max: 60 }),
      province: text(body.province, { max: 120 }) || null,
      cityMunicipality: text(body.cityMunicipality, { max: 120 }),
      barangay: text(body.barangay, { max: 120 }),
      evidenceNote: text(body.evidenceNote, { max: 2000 }),
      reason: text(body.reason, { required: true, min: 10, max: 500 }),
    }
  }

  if (action === 'delivery_cost_publish') {
    exactObject(body, [
      'costId', 'optionId', 'originId', 'localityId', 'profileId', 'sourceId',
      'completeness', 'amountMinor', 'approvedByOwner', 'effectiveFrom', 'notes', 'reason',
    ])
    const completeness = oneOf(body.completeness, COMPLETENESS)
    const approvedByOwner = bool(body.approvedByOwner)
    // An approved row prices real orders, so it must be a complete provider total.
    if (approvedByOwner && completeness !== 'PROVIDER_TOTAL_COMPLETE') {
      throw new Error('REQUEST_INVALID')
    }
    return {
      costId: identifier(body.costId),
      optionId: identifier(body.optionId),
      originId: oneOf(body.originId, ORIGINS),
      localityId: identifier(body.localityId),
      profileId: identifier(body.profileId),
      sourceId: identifier(body.sourceId),
      completeness,
      amountMinor: amountMinor(body.amountMinor),
      approvedByOwner,
      effectiveFrom: calendarDate(body.effectiveFrom),
      notes: text(body.notes, { max: 2000 }),
      reason: text(body.reason, { required: true, min: 10, max: 500 }),
    }
  }

  if (action === 'delivery_source_state') {
    exactObject(body, ['sourceId', 'freshness', 'reviewDueOn', 'reason'])
    return {
      sourceId: identifier(body.sourceId),
      freshness: oneOf(body.freshness, FRESHNESS),
      reviewDueOn: calendarDate(body.reviewDueOn, true),
      reason: text(body.reason, { required: true, min: 10, max: 500 }),
    }
  }

  throw new Error('REQUEST_INVALID')
}

/** Everything the dashboard needs to render and test the rules, in one read. */
export async function readDeliveryControl(client) {
  const { data, error } = await client.rpc('read_delivery_control_v1')
  if (error) throw new Error('DELIVERY_CONTROL_UNAVAILABLE')
  const tables = data || {}
  return {
    controls: DELIVERY_PILOT_CONTROLS,
    sources: tables.sources || [],
    courierOptions: tables.courierOptions || [],
    localityRules: tables.localityRules || [],
    costRows: tables.costRows || [],
    outcomes: Object.values(DELIVERY_OUTCOMES),
    asOf: new Date().toISOString(),
  }
}

// The owner-approved pilot boundary. These are deliberately not editable from the
// dashboard: widening them is a commercial decision that needs a new MAP scope and
// an owner sign-off, not a form field.
export const DELIVERY_PILOT_CONTROLS = Object.freeze({
  originId: 'WAREHOUSE_A',
  maxParcels: 1,
  maxWeightG: 3000,
  maxMerchandiseSubtotalMinor: 200_000,
  roundingIncrementMinor: 500,
  currency: 'PHP',
})

export async function handleDeliveryRead(req, res) {
  if (req.method !== 'GET') {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: false })
  if (!authorized) return undefined
  try {
    return safeJson(res, 200, await readDeliveryControl(authorized.client))
  } catch {
    return safeJson(res, 503, { error: { code: 'DELIVERY_CONTROL_UNAVAILABLE' } })
  }
}

/**
 * Resolve a quote for staff without writing anything. The tester runs the same
 * function the storefront estimate runs, against the same live tables, so the
 * dashboard can never show staff a fee the customer path would not produce.
 */
export async function handleDeliveryQuote(req, res) {
  if (req.method !== 'POST') {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  }
  // Quoting writes nothing, but it stays on the same envelope as every other admin
  // POST rather than becoming the one route with a weaker contract.
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) {
    return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  try {
    const body = await readJson(req)
    exactObject(body, [
      'channel', 'service', 'originId', 'localityId', 'parcelCount', 'weightG',
      'weightBasis', 'oversize', 'remoteArea', 'specialProtection',
      'merchandiseSubtotalMinor', 'recalculationConfirmed', 'quoteDate',
    ])
    const tables = await readDeliveryControl(authorized.client)
    const quote = resolveDeliveryQuote(body, tables)
    return safeJson(res, 200, { ok: true, quote })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'DELIVERY_CONTROL_UNAVAILABLE' } })
  }
}

export async function handleDeliveryCommand(req, res, action) {
  if (req.method !== 'POST') {
    return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' })
  }
  const idempotencyKey = String(req.headers['x-k2-idempotency-key'] || '').trim()
  if (!UUID.test(idempotencyKey)) {
    return safeJson(res, 400, { error: { code: 'IDEMPOTENCY_KEY_REQUIRED' } })
  }
  const authorized = await authorizeAdminRequest(req, res, { csrf: true })
  if (!authorized) return undefined
  // Rates are a commercial commitment, so staff roles below Admin may read the
  // tables but never change what a customer will be charged.
  if (!isAdminRole(authorized.identity.role)) {
    return safeJson(res, 403, { error: { code: 'DELIVERY_ADMIN_REQUIRED' } })
  }
  try {
    const payload = validateDeliveryCommand(action, await readJson(req))
    const signed = signedAdminCommandArguments(action, authorized.identity.userId, idempotencyKey, payload)
    const { data, error } = await authorized.client.rpc('execute_admin_delivery_command_v1', signed)
    if (error) {
      const providerCode = String(error.message || '')
      if (providerCode.includes('K2_ADMIN_RATE_LIMITED')) {
        return safeJson(res, 429, { error: { code: 'RATE_LIMITED' } }, { 'Retry-After': '60' })
      }
      if (providerCode.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) {
        return safeJson(res, 409, { error: { code: 'IDEMPOTENCY_CONFLICT' } })
      }
      if (providerCode.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) {
        return safeJson(res, 409, { error: { code: 'COMMAND_IN_PROGRESS' } }, { 'Retry-After': '1' })
      }
      if (providerCode.includes('K2_DELIVERY_ADMIN_REQUIRED')) {
        return safeJson(res, 403, { error: { code: 'DELIVERY_ADMIN_REQUIRED' } })
      }
      if (providerCode.includes('K2_DELIVERY_EFFECTIVE_IN_PAST')) {
        return safeJson(res, 409, { error: { code: 'DELIVERY_EFFECTIVE_IN_PAST' } })
      }
      if (providerCode.includes('K2_DELIVERY_COST_ID_TAKEN')) {
        return safeJson(res, 409, { error: { code: 'DELIVERY_COST_ID_TAKEN' } })
      }
      if (providerCode.includes('K2_DELIVERY_LOCALITY_MISSING')
        || providerCode.includes('K2_DELIVERY_OPTION_MISSING')
        || providerCode.includes('K2_DELIVERY_SOURCE_MISSING')) {
        return safeJson(res, 409, { error: { code: 'DELIVERY_REFERENCE_MISSING' } })
      }
      if (error.code === '23505') return safeJson(res, 409, { error: { code: 'DELIVERY_RULE_CONFLICT' } })
      if (error.code === '23514') return safeJson(res, 409, { error: { code: 'DELIVERY_RULE_REJECTED' } })
      return safeJson(res, 503, { error: { code: 'DELIVERY_COMMAND_UNAVAILABLE' } })
    }
    return safeJson(res, 200, { ok: true, result: data })
  } catch (error) {
    if (['REQUEST_INVALID', 'BODY_TOO_LARGE', 'JSON_REQUIRED', 'INVALID_JSON'].includes(error?.message)) {
      return safeJson(res, 400, { error: { code: 'REQUEST_INVALID' } })
    }
    return safeJson(res, 503, { error: { code: 'DELIVERY_COMMAND_UNAVAILABLE' } })
  }
}
