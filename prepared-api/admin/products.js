import { authorizeAdminRequest } from '../../server/admin-bff/authorize.js'
import { requireAdminProject, safeJson } from '../../server/admin-bff/security.js'
import { strictInteger } from '../../server/shared-numeric.js'

const PRODUCT_FIELDS = [
  'sku', 'name', 'barcode', 'status', 'srp', 'wholesale_price', 'subcategory',
  'primary_image_url', 'created_at',
].join(',')

export async function readAdminProducts(client) {
  const [productResult, stockResult] = await Promise.all([
    client.from('products').select(PRODUCT_FIELDS).order('created_at', { ascending: false }).limit(500),
    client.from('v_product_stock_from_batches').select('sku,stock_from_batches').limit(500),
  ])
  if (productResult.error) throw new Error('PRODUCT_QUERY_FAILED')
  const stockBySku = new Map()
  for (const row of stockResult.data || []) {
    if (stockBySku.has(row.sku)) {
      stockBySku.set(row.sku, null)
      continue
    }
    try {
      stockBySku.set(row.sku, strictInteger(row.stock_from_batches, 'STOCK_UNAVAILABLE', { max: Number.MAX_SAFE_INTEGER }))
    } catch {
      stockBySku.set(row.sku, null)
    }
  }
  const stockUnavailable = Boolean(stockResult.error) || (productResult.data || []).some(product => stockBySku.get(product.sku) == null)
  return {
    products: (productResult.data || []).map((product) => ({
      sku: product.sku,
      name: product.name,
      barcode: product.barcode || null,
      status: product.status,
      srp: Number(product.srp || 0),
      wholesale_price: Number(product.wholesale_price || 0),
      subcategory: product.subcategory || null,
      primary_image_url: product.primary_image_url || null,
      created_at: product.created_at,
      stock_available: stockResult.error ? null : (stockBySku.get(product.sku) ?? null),
    })),
    unavailable: stockUnavailable ? [{ key: 'stock', code: 'QUERY_UNAVAILABLE' }] : [],
  }
}

export default async function handler(req, res) {
  if (!requireAdminProject(req)) return safeJson(res, 404, { error: { code: 'NOT_FOUND' } })
  if (req.method !== 'GET') return safeJson(res, 405, { error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'GET' })
  const authorized = await authorizeAdminRequest(req, res)
  if (!authorized) return undefined
  try {
    const result = await readAdminProducts(authorized.client)
    return safeJson(res, 200, { ok: true, ...result })
  } catch {
    return safeJson(res, 503, { error: { code: 'PRODUCTS_UNAVAILABLE' } })
  }
}
