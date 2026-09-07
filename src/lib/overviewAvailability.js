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
