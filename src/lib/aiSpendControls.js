// Shared, side-effect-free contract for the optional paid AI intake path.
// The absence of a complete budget is intentional: it keeps the paid path
// fail-closed until the owner approves a provider/model and hard limits.

export const AI_SPEND_CONTROL_ACTION = 'ai_spend_controls_update'
export const AI_SPEND_CONTROL_CONFIRMATIONS = Object.freeze({
  ENABLE: 'ENABLE_PAID_AI',
  SAVE: 'SAVE_PAID_AI_CONTROLS',
})

export const AI_SPEND_CONTROL_DEFAULTS = Object.freeze({
  paidPathEnabled: false,
  providerModelSnapshot: null,
  perProductUsdMicros: null,
  perSessionUsdMicros: null,
  monthlyUsdMicros: null,
  contentConfirmationRequired: true,
  imageConfirmationRequired: true,
  manualFallbackRequired: true,
  version: 1,
  updatedAt: null,
  updatedBy: null,
})

// $1,000,000 is a validation ceiling, not a suggested operating budget.
// Owner values still need to be explicit and the paid path remains disabled
// until every required cap and the model snapshot are present.
export const MAX_AI_SPEND_USD_MICROS = 1_000_000_000_000

export function isSafeMicros(value, { allowNull = true, positive = false } = {}) {
  if (value === null && allowNull) return true
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_AI_SPEND_USD_MICROS) return false
  return !positive || value > 0
}

export function dollarsToMicros(value, { allowBlank = true } = {}) {
  if (value === null || value === undefined || (allowBlank && String(value).trim() === '')) return null
  const text = String(value).trim()
  if (!/^\d+(?:\.\d{1,6})?$/.test(text)) throw new Error('AI_SPEND_CONTROLS_INVALID')
  const [whole, fraction = ''] = text.split('.')
  const micros = Number(whole) * 1_000_000 + Number((fraction + '000000').slice(0, 6))
  if (!isSafeMicros(micros)) throw new Error('AI_SPEND_CONTROLS_INVALID')
  return micros
}

export function microsToDollars(value) {
  if (value === null || value === undefined || value === '') return ''
  const micros = Number(value)
  if (!isSafeMicros(micros)) return ''
  // Preserve the six-decimal control precision when values round-trip through
  // the owner screen; displaying cents here would silently change a cap on the
  // next save.
  return (micros / 1_000_000).toFixed(6).replace(/\.?(0+)$/, '')
}

export function normalizeAiSpendControls(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const normalized = {
    ...AI_SPEND_CONTROL_DEFAULTS,
    ...source,
  }
  normalized.paidPathEnabled = normalized.paidPathEnabled === true
  normalized.providerModelSnapshot = normalized.providerModelSnapshot
    ? String(normalized.providerModelSnapshot).trim()
    : null
  for (const field of ['perProductUsdMicros', 'perSessionUsdMicros', 'monthlyUsdMicros']) {
    if (normalized[field] !== null && normalized[field] !== undefined && normalized[field] !== '') {
      const number = Number(normalized[field])
      normalized[field] = Number.isSafeInteger(number) ? number : null
    } else normalized[field] = null
  }
  normalized.contentConfirmationRequired = normalized.contentConfirmationRequired !== false
  normalized.imageConfirmationRequired = normalized.imageConfirmationRequired !== false
  normalized.manualFallbackRequired = normalized.manualFallbackRequired !== false
  normalized.version = Number.isSafeInteger(Number(normalized.version)) ? Number(normalized.version) : 1
  normalized.updatedAt = normalized.updatedAt ? String(normalized.updatedAt) : null
  normalized.updatedBy = normalized.updatedBy ? String(normalized.updatedBy) : null
  return normalized
}

export function paidPathCanRun(value = {}) {
  const controls = normalizeAiSpendControls(value)
  return controls.paidPathEnabled
    && Boolean(controls.providerModelSnapshot)
    && isSafeMicros(controls.perProductUsdMicros, { allowNull: false, positive: true })
    && isSafeMicros(controls.perSessionUsdMicros, { allowNull: false, positive: true })
    && isSafeMicros(controls.monthlyUsdMicros, { allowNull: false, positive: true })
    && controls.perProductUsdMicros <= controls.perSessionUsdMicros
    && controls.perSessionUsdMicros <= controls.monthlyUsdMicros
    && controls.contentConfirmationRequired
    && controls.imageConfirmationRequired
    && controls.manualFallbackRequired
}
