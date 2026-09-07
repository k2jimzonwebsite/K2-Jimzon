// PostgREST can cap returned rows even when a query succeeds. Never present a
// known truncated set as an authoritative aggregate. HEAD counts have no rows.
export function overviewUnavailable(results, keys) {
  return keys.flatMap((key, index) => {
    const result = results[index]
    if (result?.error) return [{ key, code: 'QUERY_UNAVAILABLE' }]
    if (Array.isArray(result?.data) && Number.isFinite(result.count) && result.count > result.data.length) {
      return [{ key, code: 'RESULT_INCOMPLETE' }]
    }
    return []
  })
}
