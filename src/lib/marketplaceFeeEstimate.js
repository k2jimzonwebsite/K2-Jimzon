const CUSTOMER_FIELDS = new Set([
  'customer', 'customerName', 'customerEmail', 'customerPhone', 'address',
  'shippingAddress', 'recipient', 'email', 'phone',
])

function boundedInteger(value, minimum, maximum, code) {
  const result = Number(value)
  if (!Number.isSafeInteger(result) || result < minimum || result > maximum) throw new Error(code)
  return result
}

function minorUnits(value) {
  const text = String(value ?? '').trim()
  if (!/^(?:0|[1-9]\d{0,10})(?:\.\d{1,2})?$/.test(text)) throw new Error('MARKETPLACE_FEE_FACT_INVALID')
  const [whole, fraction = ''] = text.split('.')
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(result) || result > 100_000_000_000) throw new Error('MARKETPLACE_FEE_FACT_INVALID')
  return result
}

const basisPointAmount = (grossMinor, basisPoints) => Math.round(grossMinor * basisPoints / 10_000)

export function calculateMarketplaceFeeEstimate({
  shopId, currency, policyVersion, commissionBasisPoints, paymentBasisPoints,
  withholdingBasisPoints, fixedFeeMinorPerOrder, orderFacts,
} = {}) {
  if (typeof shopId !== 'string' || !shopId.trim()
      || typeof policyVersion !== 'string' || policyVersion.trim().length < 3 || policyVersion.trim().length > 120
      || !/^[A-Z]{3}$/.test(String(currency || '')) || !Array.isArray(orderFacts) || orderFacts.length > 5000) {
    throw new Error('MARKETPLACE_FEE_POLICY_INVALID')
  }
  const commissionBps = boundedInteger(commissionBasisPoints, 0, 9999, 'MARKETPLACE_FEE_POLICY_INVALID')
  const paymentBps = boundedInteger(paymentBasisPoints, 0, 9999, 'MARKETPLACE_FEE_POLICY_INVALID')
  const withholdingBps = boundedInteger(withholdingBasisPoints, 0, 9999, 'MARKETPLACE_FEE_POLICY_INVALID')
  const fixedMinor = boundedInteger(fixedFeeMinorPerOrder, 0, 10_000_000, 'MARKETPLACE_FEE_POLICY_INVALID')
  if (commissionBps + paymentBps + withholdingBps >= 10_000) throw new Error('MARKETPLACE_FEE_POLICY_INVALID')

  const accepted = []
  for (const fact of orderFacts) {
    if (!fact || typeof fact !== 'object' || Array.isArray(fact)
        || Object.keys(fact).some((key) => CUSTOMER_FIELDS.has(key))) throw new Error('MARKETPLACE_FEE_FACT_INVALID')
    if (fact.currency && fact.currency !== currency) throw new Error('MARKETPLACE_FEE_FACT_INVALID')
    if (fact.outcome === 'accepted' && fact.matchStatus === 'linked') {
      if (typeof fact.externalOrderId !== 'string' || !fact.externalOrderId
          || typeof fact.externalLineId !== 'string' || !fact.externalLineId) throw new Error('MARKETPLACE_FEE_FACT_INVALID')
      accepted.push({ ...fact, grossMinor: minorUnits(fact.grossAmount) })
    }
  }
  const grossMinor = accepted.reduce((sum, fact) => sum + fact.grossMinor, 0)
  const acceptedOrders = new Set(accepted.map((fact) => fact.externalOrderId)).size
  const commissionMinor = basisPointAmount(grossMinor, commissionBps)
  const paymentMinor = basisPointAmount(grossMinor, paymentBps)
  const withholdingMinor = basisPointAmount(grossMinor, withholdingBps)
  const totalFixedMinor = fixedMinor * acceptedOrders
  const estimatedFeeMinor = commissionMinor + paymentMinor + withholdingMinor + totalFixedMinor
  return {
    shopId: shopId.trim(), currency, policyVersion: policyVersion.trim(),
    commissionBasisPoints: commissionBps, paymentBasisPoints: paymentBps,
    withholdingBasisPoints: withholdingBps, fixedFeeMinorPerOrder: fixedMinor,
    grossMinor, acceptedLines: accepted.length, acceptedOrders,
    excludedLines: orderFacts.length - accepted.length,
    commissionMinor, paymentMinor, withholdingMinor, fixedMinor: totalFixedMinor,
    estimatedFeeMinor, estimatedNetMinor: grossMinor - estimatedFeeMinor,
    estimateOnly: true, settlementReconciled: false, officialBooks: false, actualProfit: false,
  }
}
