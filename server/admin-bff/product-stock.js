import { strictInteger } from '../shared-numeric.js'

// Staff stock is current canonical lot eligibility, independent of publication.
// A missing, partial or malformed response never proves a zero balance.
export async function readAdminProductStock(client, skus) {
  const stockBySku = new Map(skus.map(sku => [sku, null]))
  if (!stockBySku.size) return stockBySku
  let result
  try {
    result = await client.rpc('read_admin_product_stock_v1', { p_skus: [...stockBySku.keys()] })
  } catch {
    return stockBySku
  }
  if (result.error || !Array.isArray(result.data) || result.data.length > stockBySku.size
    || result.data.some(row => !row || !stockBySku.has(row.sku))) return stockBySku
  const seen = new Set()
  for (const row of result.data) {
    if (seen.has(row.sku)) {
      stockBySku.set(row.sku, null)
      continue
    }
    seen.add(row.sku)
    try {
      stockBySku.set(row.sku, strictInteger(row.stock_from_batches, 'STOCK_UNAVAILABLE', { max: Number.MAX_SAFE_INTEGER }))
    } catch {
      stockBySku.set(row.sku, null)
    }
  }
  return stockBySku
}
