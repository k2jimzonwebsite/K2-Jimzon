// PostgREST can cap returned rows even when a query succeeds. Never present a
// known truncated set as an authoritative aggregate. HEAD counts have no rows.
export function overviewUnavailable(results, keys) {
  return keys.flatMap((key, index) => {
    const result = results[index]
    if (result?.error) return [{ key, code: 'QUERY_UNAVAILABLE' }]
    if (key === 'orderBacklog') {
      return Number.isSafeInteger(result?.count) && result.count >= 0
        ? [] : [{ key, code: 'RESULT_INVALID' }]
    }
    if (!Array.isArray(result?.data) || result.data.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
      return [{ key, code: 'RESULT_INVALID' }]
    }
    const numericField = key === 'products' ? 'stock_available' : key === 'orders' ? 'total_amount' : null
    if (numericField && result.data.some(row => {
      const value = row[numericField]
      return !['number', 'string'].includes(typeof value) || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0
    })) return [{ key, code: 'RESULT_INVALID' }]
    if (Array.isArray(result?.data) && Number.isFinite(result.count) && result.count > result.data.length) {
      return [{ key, code: 'RESULT_INCOMPLETE' }]
    }
    return []
  })
}

export const UNAVAILABLE_LABEL = 'Unavailable'

export function overviewDomainsUnavailable(unavailable) {
  return new Set((unavailable || [])
    .map(item => (typeof item === 'string' ? item : item?.key))
    .filter(Boolean))
}

export function showMetric(value, { unavailable, domain }) {
  const domains = Array.isArray(domain) ? domain : [domain]
  const known = !domains.some(key => unavailable?.has(key))
  return known ? { known: true, value } : { known: false, value: UNAVAILABLE_LABEL }
}

export function countProductStock(products) {
  let outOfStock = 0
  let lowStock = 0
  let unknownStock = 0
  for (const product of products || []) {
    const raw = product?.stock_available
    const stock = raw === null || raw === undefined || raw === '' ? Number.NaN : Number(raw)
    if (!Number.isFinite(stock)) { unknownStock += 1; continue }
    if (stock <= 0) { outOfStock += 1; continue }
    if (stock <= 5) lowStock += 1
  }
  return { outOfStock, lowStock, unknownStock }
}

export function salesExportBlockReason({ unavailable, stale }) {
  if (unavailable?.has('orders')) return 'Order records could not be read, so an export would be incomplete.'
  if (stale) return 'This is the last loaded copy, not current data. Refresh before exporting.'
  return ''
}
