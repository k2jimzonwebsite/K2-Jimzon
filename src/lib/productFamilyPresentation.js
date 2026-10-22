export function variantSummary(product) {
  return product?.family?.axes.map(axis => product.variantOptions?.[axis]).filter(Boolean).join(' · ') || ''
}

export function groupFamilyResults(products, seen = new Set()) {
  return products.filter(product => {
    const identity = product.family?.members.length > 1 ? `family:${product.family.id}` : `sku:${product.sku || product.id}`
    if (seen.has(identity)) return false
    seen.add(identity)
    return true
  })
}

export function familyPriceRange(product, products, wholesale = false) {
  const skus = new Set(product.family?.members.map(member => member.sku) || [product.sku])
  const prices = products.filter(member => skus.has(member.sku))
    .map(member => Number(wholesale ? member.wholesale_price : member.srp))
    .filter(price => Number.isFinite(price) && price > 0)
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null
}
