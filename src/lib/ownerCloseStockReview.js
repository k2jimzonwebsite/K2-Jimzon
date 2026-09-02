const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function integer(value, minimum = 0, maximum = 1_000_000) {
  const result = Number(value)
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) throw new Error('OWNER_CLOSE_STOCK_INVALID')
  return result
}

export function buildOwnerCloseStockReview({ products = [], lots = [], observations = [], acceptedSales = [] } = {}) {
  if (![products, lots, observations, acceptedSales].every(Array.isArray)) throw new Error('OWNER_CLOSE_STOCK_INVALID')
  return products.map((product) => {
    const productLots = lots.filter((lot) => lot.productId === product.id || lot.sku === product.sku)
    const productObservations = observations.filter((item) => item.productId === product.id)
    const physical = productLots.reduce((sum, lot) => sum + integer(lot.quantity), 0)
    const reserved = productLots.reduce((sum, lot) => sum + integer(lot.reservedQuantity), 0)
    const sellable = productLots.reduce((sum, lot) => (
      lot.status === 'available' ? sum + Math.max(integer(lot.quantity) - integer(lot.reservedQuantity), 0) : sum
    ), 0)
    return {
      productId: String(product.id), sku: String(product.sku), name: String(product.name || product.sku),
      lots: productLots, observations: productObservations,
      canonicalPhysical: physical, canonicalReserved: reserved, canonicalSellable: sellable,
      marketplaceReportedTotal: productObservations.reduce((sum, item) => sum + integer(item.reportedQuantity), 0),
      acceptedSalesUnits: acceptedSales.filter((item) => item.productId === product.id)
        .reduce((sum, item) => sum + integer(item.units), 0),
      observationOnly: true,
    }
  })
}

export function buildLotReconciliationPayload({ sku, lots, physicalCounts, reason } = {}) {
  const exactSku = String(sku || '').trim()
  const exactReason = String(reason || '').trim()
  if (!exactSku || exactSku.length > 120 || !Array.isArray(lots) || lots.length > 50
      || !physicalCounts || typeof physicalCounts !== 'object' || Array.isArray(physicalCounts)
      || exactReason.length < 10 || exactReason.length > 500) throw new Error('OWNER_CLOSE_STOCK_INVALID')
  const rows = lots.map((lot) => {
    if (!UUID.test(String(lot.id || '')) || !(lot.id in physicalCounts)) throw new Error('OWNER_CLOSE_STOCK_INVALID')
    const quantity = integer(physicalCounts[lot.id])
    const reserved = integer(lot.reservedQuantity)
    if (quantity < reserved) throw new Error('OWNER_CLOSE_RESERVED_COUNT_CONFLICT')
    return {
      id: lot.id, boxCode: String(lot.boxCode || '').trim(), batchCode: String(lot.batchCode || '').trim(),
      quantity, expiryDate: lot.expiryDate || null, landedDate: lot.landedDate || null,
      hub: String(lot.hub || '').trim(), custodian: String(lot.custodian || '').trim(),
      channel: String(lot.channel || '').trim(), pinned: Boolean(lot.pinned), status: String(lot.status || ''),
    }
  })
  return { sku: exactSku, reason: exactReason, lots: rows }
}
