const HEADERS = Object.freeze([
  'schema_version', 'session_id', 'period_start', 'period_end', 'timezone',
  'shop_code', 'display_name', 'channel_code', 'order_import_id',
  'accepted_lines', 'duplicate_lines', 'conflict_lines', 'unresolved_lines',
  'currency', 'gross_minor', 'estimated_fee_minor', 'estimated_net_minor',
  'fee_policy_version', 'fee_estimate_version', 'linked_products', 'reviewed_products',
  'total_physical_count', 'net_discrepancy', 'pasabuy_open', 'pasabuy_reviewed',
  'pasabuy_ready', 'pasabuy_not_ready', 'pasabuy_not_applicable',
  'estimate_only', 'official_books', 'settlement_reconciled', 'actual_profit',
])

function csvCell(value) {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function buildOwnerCloseBookkeepingCsv(handoff) {
  if (!handoff?.customerMinimized || handoff?.officialBooks !== false
      || handoff?.settlementReconciled !== false || handoff?.actualProfit !== false
      || !Array.isArray(handoff?.summary?.shops)) throw new Error('OWNER_CLOSE_HANDOFF_INVALID')
  const stock = handoff.summary.stock || {}
  const pasabuy = handoff.summary.pasabuy || {}
  const rows = handoff.summary.shops.map((shop) => [
    'k2.owner-close-bookkeeping-handoff.v1', handoff.sessionId, handoff.periodStart,
    handoff.periodEnd, handoff.timezone, shop.shopCode, shop.displayName, shop.channelCode,
    shop.orderImportId, shop.acceptedLines, shop.duplicateLines,
    shop.conflictLines, shop.unresolvedLines, shop.currency, shop.grossMinor,
    shop.estimatedFeeMinor, shop.estimatedNetMinor, shop.feePolicyVersion,
    shop.feeEstimateVersion, stock.linkedProducts, stock.reviewedProducts,
    stock.totalPhysicalCount, stock.netDiscrepancy, pasabuy.openRequests,
    pasabuy.reviewedRequests, pasabuy.ready, pasabuy.notReady, pasabuy.notApplicable,
    true, false, false, false,
  ])
  return [HEADERS, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}
