import { AI_SPEND_CONTROL_ACTION, AI_SPEND_CONTROL_CONFIRMATIONS, MAX_AI_SPEND_USD_MICROS, isSafeMicros } from '../../src/lib/aiSpendControls.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,159}$/

export function isAiSpendControlsConfigured(env = process.env) {
  return String(env.K2_AI_SPEND_CONTROLS_ENABLED || '').toLowerCase() === 'true'
}

function exactObject(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).length !== keys.length
      || !keys.every((key) => Object.hasOwn(value, key))) throw new Error('AI_SPEND_CONTROLS_INVALID')
}

function micros(value, { allowNull = true, positive = false } = {}) {
  if (value === null && allowNull) return null
  if (!isSafeMicros(value, { allowNull: false, positive })) throw new Error('AI_SPEND_CONTROLS_INVALID')
  return value
}

function model(value) {
  if (value === null) return null
  if (typeof value !== 'string') throw new Error('AI_SPEND_CONTROLS_INVALID')
  const normalized = value.trim()
  if (!normalized || !MODEL.test(normalized)) throw new Error('AI_SPEND_CONTROLS_INVALID')
  return normalized
}

function reason(value) {
  const normalized = String(value || '').trim()
  if (normalized.length < 8 || normalized.length > 500) throw new Error('AI_SPEND_CONTROLS_INVALID')
  return normalized
}

export function validateAiSpendControlsCommand(body) {
  exactObject(body, ['action', 'payload'])
  if (body.action !== AI_SPEND_CONTROL_ACTION) throw new Error('AI_SPEND_CONTROLS_INVALID')
  const keys = [
    'paidPathEnabled', 'providerModelSnapshot', 'perProductUsdMicros',
    'perSessionUsdMicros', 'monthlyUsdMicros', 'contentConfirmationRequired',
    'imageConfirmationRequired', 'manualFallbackRequired', 'expectedVersion',
    'reason', 'confirmation',
  ]
  exactObject(body.payload, keys)
  if (typeof body.payload.paidPathEnabled !== 'boolean'
      || typeof body.payload.contentConfirmationRequired !== 'boolean'
      || typeof body.payload.imageConfirmationRequired !== 'boolean'
      || typeof body.payload.manualFallbackRequired !== 'boolean'
      || !Number.isSafeInteger(body.payload.expectedVersion) || body.payload.expectedVersion < 1
      || body.payload.contentConfirmationRequired !== true
      || body.payload.imageConfirmationRequired !== true
      || body.payload.manualFallbackRequired !== true) throw new Error('AI_SPEND_CONTROLS_INVALID')

  const normalized = {
    paidPathEnabled: body.payload.paidPathEnabled,
    providerModelSnapshot: model(body.payload.providerModelSnapshot),
    perProductUsdMicros: micros(body.payload.perProductUsdMicros),
    perSessionUsdMicros: micros(body.payload.perSessionUsdMicros),
    monthlyUsdMicros: micros(body.payload.monthlyUsdMicros),
    contentConfirmationRequired: true,
    imageConfirmationRequired: true,
    manualFallbackRequired: true,
    expectedVersion: body.payload.expectedVersion,
    reason: reason(body.payload.reason),
    confirmation: String(body.payload.confirmation || ''),
  }
  if (![AI_SPEND_CONTROL_CONFIRMATIONS.ENABLE, AI_SPEND_CONTROL_CONFIRMATIONS.SAVE].includes(normalized.confirmation)) {
    throw new Error('AI_SPEND_CONTROLS_INVALID')
  }
  if (normalized.paidPathEnabled && normalized.confirmation !== AI_SPEND_CONTROL_CONFIRMATIONS.ENABLE) {
    throw new Error('AI_SPEND_CONTROLS_CONFIRMATION_REQUIRED')
  }
  if (!normalized.paidPathEnabled && normalized.confirmation !== AI_SPEND_CONTROL_CONFIRMATIONS.SAVE) {
    throw new Error('AI_SPEND_CONTROLS_INVALID')
  }
  if (normalized.paidPathEnabled) {
    if (!normalized.providerModelSnapshot
        || !isSafeMicros(normalized.perProductUsdMicros, { allowNull: false, positive: true })
        || !isSafeMicros(normalized.perSessionUsdMicros, { allowNull: false, positive: true })
        || !isSafeMicros(normalized.monthlyUsdMicros, { allowNull: false, positive: true })
        || normalized.perProductUsdMicros > normalized.perSessionUsdMicros
        || normalized.perSessionUsdMicros > normalized.monthlyUsdMicros) {
      throw new Error('AI_SPEND_CONTROLS_LIMIT_REQUIRED')
    }
  }
  return { action: AI_SPEND_CONTROL_ACTION, payload: normalized }
}

export function aiSpendControlsErrorCode(error) {
  const raw = String(error?.message || '')
  if (raw.includes('K2_ADMIN_RATE_LIMITED')) return 'RATE_LIMITED'
  if (raw.includes('K2_ADMIN_IDEMPOTENCY_CONFLICT')) return 'IDEMPOTENCY_CONFLICT'
  if (raw.includes('K2_ADMIN_COMMAND_IN_PROGRESS')) return 'COMMAND_IN_PROGRESS'
  if (raw.includes('K2_AI_SPEND_VERSION_CONFLICT')) return 'AI_SPEND_CONTROLS_VERSION_CONFLICT'
  if (raw.includes('K2_AI_SPEND_LIMIT_REQUIRED')) return 'AI_SPEND_CONTROLS_LIMIT_REQUIRED'
  if (raw.includes('K2_AI_SPEND_CONFIRMATION_REQUIRED')) return 'AI_SPEND_CONTROLS_CONFIRMATION_REQUIRED'
  if (raw.includes('K2_AI_SPEND_INVALID')) return 'AI_SPEND_CONTROLS_INVALID'
  if (raw.includes('K2_AI_SPEND_SUPER_ADMIN_REQUIRED')) return 'AI_SPEND_SUPER_ADMIN_REQUIRED'
  if (raw.includes('K2_AI_SPEND_UNAVAILABLE')) return 'AI_SPEND_CONTROLS_UNAVAILABLE'
  return 'AI_SPEND_CONTROLS_UNAVAILABLE'
}

export { UUID, MAX_AI_SPEND_USD_MICROS }
