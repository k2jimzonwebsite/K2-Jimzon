const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const OWNER_CLOSE_STEPS = Object.freeze([
  { id: 'source_selection', label: 'Period & shops', shortLabel: 'Sources', available: true },
  { id: 'source_import', label: 'Import exports', shortLabel: 'Import', available: true },
  { id: 'product_matching', label: 'Resolve products', shortLabel: 'Match', available: true },
  { id: 'sales_reconciliation', label: 'Reconcile sales', shortLabel: 'Sales', available: true },
  { id: 'fee_estimates', label: 'Estimate fees', shortLabel: 'Fees', available: true },
  { id: 'stock_count', label: 'Count & reconcile', shortLabel: 'Count', available: true },
  { id: 'coverage_review', label: 'Review shop coverage', shortLabel: 'Coverage', available: true },
  { id: 'pasabuy_boxing', label: 'Check Pasabuy boxing', shortLabel: 'Pasabuy', available: true },
  { id: 'bookkeeping_handoff', label: 'Prepare handoff', shortLabel: 'Handoff', available: true },
])

const STEP_IDS = new Set(OWNER_CLOSE_STEPS.map((step) => step.id))

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function buildOwnerCloseSessionDraft(value) {
  const shopIds = Array.isArray(value?.shopIds) ? value.shopIds.map(String) : []
  const days = (new Date(`${value?.periodEnd}T00:00:00Z`) - new Date(`${value?.periodStart}T00:00:00Z`)) / 86_400_000
  if (!UUID.test(String(value?.sessionId || '')) || !validDate(value?.periodStart)
      || !validDate(value?.periodEnd) || days < 0 || days > 366
      || shopIds.length < 1 || shopIds.length > 50 || new Set(shopIds).size !== shopIds.length
      || shopIds.some((id) => !UUID.test(id)) || !STEP_IDS.has(value?.currentStep)
      || !Number.isSafeInteger(value?.expectedVersion) || value.expectedVersion < 1) {
    throw new Error('OWNER_CLOSE_SESSION_INVALID')
  }
  return {
    sessionId: String(value.sessionId), periodStart: value.periodStart, periodEnd: value.periodEnd,
    timezone: 'Asia/Manila', shopIds, currentStep: value.currentStep,
    expectedVersion: value.expectedVersion,
  }
}

export function summarizeMarketplaceRows(rows = []) {
  const list = Array.isArray(rows) ? rows : []
  return {
    total: list.length,
    pending: list.filter((row) => row.outcome === 'accepted' && row.matchStatus === 'pending').length,
    linked: list.filter((row) => row.matchStatus === 'linked').length,
    createdDraft: list.filter((row) => row.matchStatus === 'created_draft').length,
    unresolved: list.filter((row) => row.matchStatus === 'unresolved').length,
    duplicates: list.filter((row) => row.outcome === 'duplicate').length,
    conflicts: list.filter((row) => row.outcome === 'conflict').length,
  }
}

export function nextPendingMarketplaceRow(rows = []) {
  return (Array.isArray(rows) ? rows : []).find(
    (row) => row.outcome === 'accepted' && row.matchStatus === 'pending',
  ) || null
}
