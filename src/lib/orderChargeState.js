// Display/payment eligibility only. Native snapshots and signed commands remain
// authority; historical quote labels do not prove missing buyer acceptance.
export function hasFinalOrderCharge(order) {
  if (order?.delivery_review_required === true || order?.deliveryReviewRequired === true) return false
  const status = order?.shipping_quote_status ?? order?.shippingQuoteStatus
  const value = order && Object.hasOwn(order, 'total_amount') ? order.total_amount : order?.total
  return ['customer_confirmed', 'platform_charged', 'waived'].includes(status)
    && value !== null && value !== undefined && String(value).trim() !== ''
    && ['number', 'string'].includes(typeof value) && Number.isFinite(Number(value)) && Number(value) >= 0
}

export function projectOrderCharge(order) {
  const final = hasFinalOrderCharge(order)
  return { ...order, total_amount: final ? order.total_amount : null,
    shipping_amount: final ? order.shipping_amount : null, delivery_charge_pending: !final }
}
