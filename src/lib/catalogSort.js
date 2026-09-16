/**
 * Pure catalog sorting functions for K2 Jimzon.
 * Satisfies I-005: explicit recency ordering, deterministic tie-breaking,
 * and safe handling of null dates and price strings.
 */

export function compareCatalogProducts(a, b, sortBy = 'popular') {
  if (sortBy === 'latest') {
    const timeA = a?.created_at ? new Date(a.created_at).getTime() : 0
    const timeB = b?.created_at ? new Date(b.created_at).getTime() : 0
    if (timeB !== timeA) return timeB - timeA
    return (a?.id || a?.sku || '').localeCompare(b?.id || b?.sku || '')
  }
  if (sortBy === 'price_asc') {
    const diff = Number(a?.srp || 0) - Number(b?.srp || 0)
    if (diff !== 0) return diff
    return (a?.id || a?.sku || '').localeCompare(b?.id || b?.sku || '')
  }
  if (sortBy === 'price_desc') {
    const diff = Number(b?.srp || 0) - Number(a?.srp || 0)
    if (diff !== 0) return diff
    return (a?.id || a?.sku || '').localeCompare(b?.id || b?.sku || '')
  }
  if (sortBy === 'popular') {
    const diff = Number(b?.tag === 'Bestseller') - Number(a?.tag === 'Bestseller')
    if (diff !== 0) return diff
    const timeA = a?.created_at ? new Date(a.created_at).getTime() : 0
    const timeB = b?.created_at ? new Date(b.created_at).getTime() : 0
    if (timeB !== timeA) return timeB - timeA
    return (a?.id || a?.sku || '').localeCompare(b?.id || b?.sku || '')
  }
  return 0
}
