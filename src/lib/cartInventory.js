export function productStock(product) {
  if (!product || typeof product !== 'object') return null
  const raw = Object.hasOwn(product, 'stock_available') ? product.stock_available : product.stock
  if (raw === null || raw === undefined || raw === '') return null
  const stock = Number(raw)
  return Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : null
}

function productMap(products) {
  return new Map(products.flatMap((product) => {
    const ids = new Set([product?.id, product?.sku].filter(Boolean).map(String))
    return [...ids].map((id) => [id, product])
  }))
}

export function addCartItems(cart, products, requests) {
  const byId = productMap(products)
  const requested = new Map()
  for (const request of requests) {
    const id = String(request?.id || '')
    const qty = Number(request?.qty)
    if (!id || !Number.isInteger(qty) || qty < 1) {
      return { ok: false, code: 'INVALID_QUANTITY', cart }
    }
    requested.set(id, (requested.get(id) || 0) + qty)
  }

  for (const [id, qty] of requested) {
    const product = byId.get(id)
    if (!product) return { ok: false, code: 'PRODUCT_UNAVAILABLE', cart }
    const stock = productStock(product)
    if (stock === null) return { ok: false, code: 'STOCK_UNKNOWN', cart }
    if (stock === 0) return { ok: false, code: 'OUT_OF_STOCK', cart }
    const current = cart.find((line) => String(line.id) === id)?.qty || 0
    if (current + qty > stock) return { ok: false, code: 'INSUFFICIENT_STOCK', cart }
  }

  const next = cart.map((line) => ({ ...line }))
  for (const [id, qty] of requested) {
    const existing = next.find((line) => String(line.id) === id)
    if (existing) existing.qty += qty
    else next.push({ id, qty })
  }
  return { ok: true, code: null, cart: next }
}

export function validateCartForSubmission(cart, products) {
  const byId = productMap(products)
  if (!cart.length) return { ok: false, code: 'EMPTY_CART', id: null }
  for (const line of cart) {
    const id = String(line?.id || '')
    const product = byId.get(id)
    if (!product) return { ok: false, code: 'PRODUCT_UNAVAILABLE', id }
    const stock = productStock(product)
    if (stock === null) return { ok: false, code: 'STOCK_UNKNOWN', id }
    if (stock === 0) return { ok: false, code: 'OUT_OF_STOCK', id }
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > stock) {
      return { ok: false, code: 'INSUFFICIENT_STOCK', id }
    }
  }
  return { ok: true, code: null, id: null }
}
