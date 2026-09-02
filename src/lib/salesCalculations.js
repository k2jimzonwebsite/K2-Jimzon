const MAX_MONEY = 1_000_000_000
const MAX_QUANTITY = 100_000

function finiteNonNegative(value) {
  const number = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  return Number.isFinite(number) && number >= 0 ? number : null
}

function money(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function moneyUp(value) {
  return Math.ceil((value - Number.EPSILON) * 100) / 100
}

function moneyDown(value) {
  return Math.floor((value + Number.EPSILON) * 100) / 100
}

export function summarizeSalesOrders(orders = []) {
  const safeOrders = Array.isArray(orders) ? orders : []
  const value = order => finiteNonNegative(order?.total_amount) ?? 0
  const status = order => String(order?.status || '').toLowerCase()
  const paymentStatus = order => String(order?.payment_status || '').toLowerCase()

  return {
    submittedValue: money(safeOrders.reduce((sum, order) => sum + value(order), 0)),
    submittedCount: safeOrders.length,
    verifiedPaymentValue: money(safeOrders.filter(order => paymentStatus(order) === 'verified').reduce((sum, order) => sum + value(order), 0)),
    verifiedPaymentCount: safeOrders.filter(order => paymentStatus(order) === 'verified').length,
    fulfilledValue: money(safeOrders.filter(order => status(order) === 'fulfilled').reduce((sum, order) => sum + value(order), 0)),
    fulfilledCount: safeOrders.filter(order => status(order) === 'fulfilled').length,
  }
}

const SALES_RECORD_FILTERS = new Set([
  'all', 'verified', 'fulfilled',
  'verified_fulfilled', 'verified_pending', 'fulfilled_unverified', 'other',
])

function isPaymentVerified(order) {
  return String(order?.payment_status || '').toLowerCase() === 'verified'
}

function isFulfilled(order) {
  return String(order?.status || '').toLowerCase() === 'fulfilled'
}

export function filterSalesOrders(orders = [], filter = 'all') {
  const safeFilter = SALES_RECORD_FILTERS.has(filter) ? filter : 'all'
  return [...orders]
    .filter((order) => {
      const verified = isPaymentVerified(order)
      const fulfilled = isFulfilled(order)
      if (safeFilter === 'verified') return verified
      if (safeFilter === 'fulfilled') return fulfilled
      if (safeFilter === 'verified_fulfilled') return verified && fulfilled
      if (safeFilter === 'verified_pending') return verified && !fulfilled
      if (safeFilter === 'fulfilled_unverified') return fulfilled && !verified
      if (safeFilter === 'other') return !verified && !fulfilled
      return true
    })
    .sort((left, right) => {
      const leftTime = Date.parse(left?.created_at || '')
      const rightTime = Date.parse(right?.created_at || '')
      const safeLeft = Number.isFinite(leftTime) ? leftTime : 0
      const safeRight = Number.isFinite(rightTime) ? rightTime : 0
      return safeRight - safeLeft
    })
}

function summarizeSalesBucket(orders) {
  return {
    count: orders.length,
    value: money(orders.reduce((sum, order) => sum + (finiteNonNegative(order?.total_amount) ?? 0), 0)),
  }
}

export function summarizeSalesReconciliation(orders = []) {
  const safeOrders = Array.isArray(orders) ? orders : []
  const buckets = {
    verifiedFulfilled: [],
    verifiedPending: [],
    fulfilledUnverified: [],
    other: [],
  }

  safeOrders.forEach((order) => {
    const verified = isPaymentVerified(order)
    const fulfilled = isFulfilled(order)
    if (verified && fulfilled) buckets.verifiedFulfilled.push(order)
    else if (verified) buckets.verifiedPending.push(order)
    else if (fulfilled) buckets.fulfilledUnverified.push(order)
    else buckets.other.push(order)
  })

  return {
    verifiedFulfilled: summarizeSalesBucket(buckets.verifiedFulfilled),
    verifiedPending: summarizeSalesBucket(buckets.verifiedPending),
    fulfilledUnverified: summarizeSalesBucket(buckets.fulfilledUnverified),
    other: summarizeSalesBucket(buckets.other),
    total: summarizeSalesBucket(safeOrders),
  }
}

function normalizeSalesChannel(value = '') {
  const channel = String(value).toLowerCase()
  if (channel.startsWith('shopee')) return 'shopee'
  if (channel.startsWith('tiktok')) return 'tiktok'
  if (channel.startsWith('lazada')) return 'lazada'
  if (channel.startsWith('pasabuy')) return 'pasabuy'
  return 'website'
}

function csvCell(value) {
  let text = String(value ?? '')
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

function csvTimestamp(value) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toISOString() : ''
}

export function createSalesRecordCsv(orders = [], filter = 'all') {
  const headings = ['created_at', 'order_reference', 'channel', 'order_status', 'payment_status', 'request_value_php']
  const rows = filterSalesOrders(orders, filter).map(order => [
    csvTimestamp(order?.created_at),
    order?.id,
    normalizeSalesChannel(order?.channel_source),
    order?.status,
    order?.payment_status,
    money(finiteNonNegative(order?.total_amount) ?? 0).toFixed(2),
  ])
  return `\uFEFF${[headings, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}

export function createSalesExportFilename({ range = 30, filter = 'all', generatedAt = new Date() } = {}) {
  const safeRange = [7, 30, 90].includes(Number(range)) ? Number(range) : 30
  const safeFilter = SALES_RECORD_FILTERS.has(filter) ? filter : 'all'
  const date = new Date(generatedAt)
  const dateLabel = Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : 'undated'
  return `k2-sales-${safeRange}d-${safeFilter}-${dateLabel}.csv`
}

export function calculateSalesPlan(input = {}) {
  const quantity = finiteNonNegative(input.quantity)
  const unitPrice = finiteNonNegative(input.unitPrice)
  const unitCost = finiteNonNegative(input.unitCost)
  const discount = finiteNonNegative(input.discount)
  const otherCosts = finiteNonNegative(input.otherCosts)
  const fixedFees = finiteNonNegative(input.fixedFees)
  const channelFeePercent = finiteNonNegative(input.channelFeePercent)
  const errors = []

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) errors.push('Quantity must be a whole number from 1 to 100,000.')
  for (const [label, value] of [
    ['Unit selling price', unitPrice], ['Unit cost', unitCost], ['Discount', discount],
    ['Other costs', otherCosts], ['Fixed fees', fixedFees],
  ]) {
    if (value == null || value > MAX_MONEY) errors.push(`${label} must be from ₱0 to ₱1,000,000,000.`)
  }
  if (channelFeePercent == null || channelFeePercent > 99.99) errors.push('Channel fee rate must be from 0% to 99.99%.')
  if (errors.length) return { ok: false, errors }

  const grossSales = money(quantity * unitPrice)
  if (discount > grossSales) return { ok: false, errors: ['Discount cannot exceed gross sales.'] }

  const netSales = money(grossSales - discount)
  const goodsCost = money(quantity * unitCost)
  const otherAndFixedCosts = money(otherCosts + fixedFees)
  const percentageFees = money(grossSales * (channelFeePercent / 100))
  const fixedCostTotal = money(goodsCost + otherAndFixedCosts)
  const totalCosts = money(fixedCostTotal + percentageFees)
  const grossProfit = money(netSales - totalCosts)
  const breakEvenUnitPrice = moneyUp((discount + fixedCostTotal) / (quantity * (1 - (channelFeePercent / 100))))

  return {
    ok: true,
    quantity,
    grossSales,
    discount: money(discount),
    netSales,
    goodsCost,
    otherAndFixedCosts,
    percentageFees,
    totalCosts,
    grossProfit,
    grossMarginPercent: netSales > 0 ? (grossProfit / netSales) * 100 : null,
    markupPercent: totalCosts > 0 ? (grossProfit / totalCosts) * 100 : null,
    breakEvenUnitPrice,
  }
}

export function calculateTargetSalesPrice(input = {}) {
  const quantity = finiteNonNegative(input.quantity)
  const unitCost = finiteNonNegative(input.unitCost)
  const discount = finiteNonNegative(input.discount)
  const otherCosts = finiteNonNegative(input.otherCosts)
  const fixedFees = finiteNonNegative(input.fixedFees)
  const channelFeePercent = finiteNonNegative(input.channelFeePercent)
  const targetMarginPercent = finiteNonNegative(input.targetMarginPercent)
  const errors = []

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) errors.push('Quantity must be a whole number from 1 to 100,000.')
  for (const [label, value] of [
    ['Unit cost', unitCost], ['Discount', discount], ['Other costs', otherCosts], ['Fixed fees', fixedFees],
  ]) {
    if (value == null || value > MAX_MONEY) errors.push(`${label} must be from ₱0 to ₱1,000,000,000.`)
  }
  for (const [label, value] of [
    ['Channel fee rate', channelFeePercent], ['Target gross margin', targetMarginPercent],
  ]) {
    if (value == null || value > 99.99) errors.push(`${label} must be from 0% to 99.99%.`)
  }
  if (errors.length) return { ok: false, errors }
  if (channelFeePercent + targetMarginPercent >= 100) {
    return { ok: false, errors: ['Target gross margin plus channel fee rate must stay below 100%.'] }
  }

  const feeRate = channelFeePercent / 100
  const targetMargin = targetMarginPercent / 100
  const goodsCost = money(quantity * unitCost)
  const fixedCostTotal = money(goodsCost + otherCosts + fixedFees)
  const denominator = 1 - feeRate - targetMargin
  const requiredGrossSales = (fixedCostTotal + (discount * (1 - targetMargin))) / denominator
  let recommendedUnitPrice = moneyUp(requiredGrossSales / quantity)
  if (!Number.isFinite(recommendedUnitPrice) || recommendedUnitPrice > MAX_MONEY) {
    return { ok: false, errors: ['The required unit price is outside the supported planning range.'] }
  }

  const scenarioAt = (unitPrice) => {
    const grossSales = money(quantity * unitPrice)
    const netSales = money(grossSales - discount)
    const percentageFees = money(grossSales * feeRate)
    const totalCosts = money(fixedCostTotal + percentageFees)
    const grossProfit = money(netSales - totalCosts)
    const achievedMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : null
    return { grossSales, netSales, percentageFees, totalCosts, grossProfit, achievedMarginPercent }
  }

  let scenario = scenarioAt(recommendedUnitPrice)
  for (let adjustment = 0; adjustment < 10 && (scenario.achievedMarginPercent == null || scenario.achievedMarginPercent + 1e-9 < targetMarginPercent); adjustment += 1) {
    recommendedUnitPrice = money(recommendedUnitPrice + 0.01)
    if (recommendedUnitPrice > MAX_MONEY) return { ok: false, errors: ['The required unit price is outside the supported planning range.'] }
    scenario = scenarioAt(recommendedUnitPrice)
  }
  if (scenario.achievedMarginPercent == null || scenario.achievedMarginPercent + 1e-9 < targetMarginPercent) {
    return { ok: false, errors: ['The target margin could not be reached within cent-rounded planning values.'] }
  }

  return {
    ok: true,
    quantity,
    targetMarginPercent,
    channelFeePercent,
    recommendedUnitPrice,
    goodsCost,
    fixedCostTotal,
    discount: money(discount),
    ...scenario,
  }
}

export function calculateMaximumSalesDiscount(input = {}) {
  const quantity = finiteNonNegative(input.quantity)
  const unitPrice = finiteNonNegative(input.unitPrice)
  const unitCost = finiteNonNegative(input.unitCost)
  const otherCosts = finiteNonNegative(input.otherCosts)
  const fixedFees = finiteNonNegative(input.fixedFees)
  const channelFeePercent = finiteNonNegative(input.channelFeePercent)
  const targetMarginPercent = finiteNonNegative(input.targetMarginPercent)
  const errors = []

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) errors.push('Quantity must be a whole number from 1 to 100,000.')
  for (const [label, value] of [
    ['Unit selling price', unitPrice], ['Unit cost', unitCost], ['Other costs', otherCosts], ['Fixed fees', fixedFees],
  ]) {
    if (value == null || value > MAX_MONEY) errors.push(`${label} must be from ₱0 to ₱1,000,000,000.`)
  }
  for (const [label, value] of [
    ['Channel fee rate', channelFeePercent], ['Target gross margin', targetMarginPercent],
  ]) {
    if (value == null || value > 99.99) errors.push(`${label} must be from 0% to 99.99%.`)
  }
  if (errors.length) return { ok: false, errors }

  const feeRate = channelFeePercent / 100
  const targetMargin = targetMarginPercent / 100
  const grossSales = money(quantity * unitPrice)
  if (grossSales <= 0) return { ok: false, errors: ['Unit selling price must produce gross sales above ₱0.'] }

  const goodsCost = money(quantity * unitCost)
  const percentageFees = money(grossSales * feeRate)
  const totalCosts = money(goodsCost + otherCosts + fixedFees + percentageFees)
  const rawMaximumDiscount = grossSales - (totalCosts / (1 - targetMargin))
  if (!Number.isFinite(rawMaximumDiscount) || rawMaximumDiscount < -1e-9) {
    return { ok: false, errors: ['This selling price cannot reach the target gross margin even with no discount.'] }
  }

  let maximumDiscount = Math.min(grossSales, moneyDown(Math.max(0, rawMaximumDiscount)))
  const scenarioAt = (discount) => {
    const netSales = money(grossSales - discount)
    const grossProfit = money(netSales - totalCosts)
    const achievedMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : null
    return { netSales, grossProfit, achievedMarginPercent }
  }

  let scenario = scenarioAt(maximumDiscount)
  for (let adjustment = 0; adjustment < 10 && (scenario.achievedMarginPercent == null || scenario.achievedMarginPercent + 1e-9 < targetMarginPercent); adjustment += 1) {
    maximumDiscount = money(Math.max(0, maximumDiscount - 0.01))
    scenario = scenarioAt(maximumDiscount)
  }
  if (scenario.achievedMarginPercent == null || scenario.achievedMarginPercent + 1e-9 < targetMarginPercent) {
    return { ok: false, errors: ['The target margin could not be preserved within cent-rounded planning values.'] }
  }

  return {
    ok: true,
    quantity,
    unitPrice: money(unitPrice),
    targetMarginPercent,
    channelFeePercent,
    grossSales,
    goodsCost,
    percentageFees,
    totalCosts,
    maximumDiscount,
    maximumDiscountPerUnit: moneyDown(maximumDiscount / quantity),
    maximumDiscountPercent: grossSales > 0 ? (maximumDiscount / grossSales) * 100 : null,
    ...scenario,
  }
}

export function calculateTargetSalesQuantity(input = {}) {
  const unitPrice = finiteNonNegative(input.unitPrice)
  const unitCost = finiteNonNegative(input.unitCost)
  const discount = finiteNonNegative(input.discount)
  const otherCosts = finiteNonNegative(input.otherCosts)
  const fixedFees = finiteNonNegative(input.fixedFees)
  const channelFeePercent = finiteNonNegative(input.channelFeePercent)
  const targetProfit = finiteNonNegative(input.targetProfit)
  const errors = []

  for (const [label, value] of [
    ['Unit selling price', unitPrice], ['Unit cost', unitCost], ['Discount', discount],
    ['Other costs', otherCosts], ['Fixed fees', fixedFees], ['Target planned profit', targetProfit],
  ]) {
    if (value == null || value > MAX_MONEY) errors.push(`${label} must be from ₱0 to ₱1,000,000,000.`)
  }
  if (targetProfit != null && targetProfit < 0.01) errors.push('Target planned profit must be at least ₱0.01.')
  if (channelFeePercent == null || channelFeePercent > 99.99) errors.push('Channel fee rate must be from 0% to 99.99%.')
  if (errors.length) return { ok: false, errors }

  const feeRate = channelFeePercent / 100
  const unitContribution = (unitPrice * (1 - feeRate)) - unitCost
  const displayedUnitContribution = money(unitContribution)
  if (displayedUnitContribution <= 0) {
    return { ok: false, errors: ['Each unit must contribute more than ₱0 after unit cost and the channel fee.'] }
  }

  const otherAndFixedCosts = money(otherCosts + fixedFees)
  const requiredBeforeRounding = (targetProfit + discount + otherAndFixedCosts) / unitContribution
  let requiredQuantity = Math.max(1, Math.ceil(requiredBeforeRounding - Number.EPSILON))
  if (!Number.isFinite(requiredQuantity) || requiredQuantity > MAX_QUANTITY) {
    return { ok: false, errors: ['The target requires more than the supported maximum of 100,000 units.'] }
  }

  const scenarioAt = (quantity) => {
    const grossSales = money(quantity * unitPrice)
    const netSales = money(grossSales - discount)
    const goodsCost = money(quantity * unitCost)
    const percentageFees = money(grossSales * feeRate)
    const totalCosts = money(goodsCost + otherAndFixedCosts + percentageFees)
    const grossProfit = money(netSales - totalCosts)
    const achievedMarginPercent = netSales > 0 ? (grossProfit / netSales) * 100 : null
    return { grossSales, netSales, goodsCost, percentageFees, totalCosts, grossProfit, achievedMarginPercent }
  }

  let scenario = scenarioAt(requiredQuantity)
  while (scenario.grossProfit + 1e-9 < targetProfit && requiredQuantity < MAX_QUANTITY) {
    requiredQuantity += 1
    scenario = scenarioAt(requiredQuantity)
  }
  if (scenario.grossProfit + 1e-9 < targetProfit) {
    return { ok: false, errors: ['The target requires more than the supported maximum of 100,000 units.'] }
  }

  let previousScenario = scenarioAt(requiredQuantity - 1)
  while (requiredQuantity > 1 && previousScenario.grossProfit + 1e-9 >= targetProfit) {
    requiredQuantity -= 1
    scenario = previousScenario
    previousScenario = scenarioAt(requiredQuantity - 1)
  }

  return {
    ok: true,
    requiredQuantity,
    targetProfit: money(targetProfit),
    unitContribution: displayedUnitContribution,
    otherAndFixedCosts,
    profitAboveTarget: money(scenario.grossProfit - targetProfit),
    previousQuantity: requiredQuantity - 1,
    previousQuantityProfit: previousScenario.grossProfit,
    ...scenario,
  }
}

const SALES_PLANNING_MODE_LABELS = Object.freeze({
  check: 'Check a price',
  target: 'Find target price',
  discount: 'Find max discount',
  quantity: 'Find units needed',
})

function summaryPhp(value) {
  return `PHP ${money(Number(value) || 0).toFixed(2)}`
}

function summaryPercent(value) {
  return value == null ? 'Unavailable' : `${Number(value).toFixed(2)}%`
}

export function createSalesPlanningSummary({ mode, input = {}, result, generatedAt = new Date() } = {}) {
  const modeLabel = SALES_PLANNING_MODE_LABELS[mode]
  if (!modeLabel || !result?.ok) return ''

  const date = new Date(generatedAt)
  const generatedLabel = Number.isFinite(date.getTime()) ? date.toISOString() : 'undated'
  const inputMoney = key => summaryPhp(finiteNonNegative(input[key]) ?? 0)
  const inputPercent = key => summaryPercent(finiteNonNegative(input[key]))
  const commonAssumptions = [
    `Unit cost: ${inputMoney('unitCost')}`,
    `Other costs: ${inputMoney('otherCosts')}`,
    `Fixed fees: ${inputMoney('fixedFees')}`,
    `Channel fee rate on gross sales: ${inputPercent('channelFeePercent')}`,
  ]
  let assumptions = []
  let results = []

  if (mode === 'check') {
    assumptions = [
      `Quantity: ${result.quantity}`,
      `Unit selling price: ${inputMoney('unitPrice')}`,
      ...commonAssumptions.slice(0, 1),
      `Discount total: ${inputMoney('discount')}`,
      ...commonAssumptions.slice(1),
    ]
    results = [
      `Gross sales: ${summaryPhp(result.grossSales)}`,
      `Net sales: ${summaryPhp(result.netSales)}`,
      `Goods cost: ${summaryPhp(result.goodsCost)}`,
      `Other + fixed costs: ${summaryPhp(result.otherAndFixedCosts)}`,
      `Percentage fees: ${summaryPhp(result.percentageFees)}`,
      `Total planned costs: ${summaryPhp(result.totalCosts)}`,
      `Planned gross profit: ${summaryPhp(result.grossProfit)}`,
      `Gross margin: ${summaryPercent(result.grossMarginPercent)}`,
      `Markup: ${summaryPercent(result.markupPercent)}`,
      `Fee-aware break-even unit price: ${summaryPhp(result.breakEvenUnitPrice)}`,
    ]
  } else if (mode === 'target') {
    assumptions = [
      `Quantity: ${result.quantity}`,
      ...commonAssumptions.slice(0, 1),
      `Discount total: ${inputMoney('discount')}`,
      ...commonAssumptions.slice(1),
      `Target gross margin: ${inputPercent('targetMarginPercent')}`,
    ]
    results = [
      `Minimum planned unit price: ${summaryPhp(result.recommendedUnitPrice)}`,
      `Gross sales: ${summaryPhp(result.grossSales)}`,
      `Net sales: ${summaryPhp(result.netSales)}`,
      `Percentage fees: ${summaryPhp(result.percentageFees)}`,
      `Total planned costs: ${summaryPhp(result.totalCosts)}`,
      `Planned gross profit: ${summaryPhp(result.grossProfit)}`,
      `Achieved gross margin: ${summaryPercent(result.achievedMarginPercent)}`,
    ]
  } else if (mode === 'discount') {
    assumptions = [
      `Quantity: ${result.quantity}`,
      `Unit selling price: ${inputMoney('unitPrice')}`,
      ...commonAssumptions,
      `Target gross margin: ${inputPercent('targetMarginPercent')}`,
    ]
    results = [
      `Maximum total discount: ${summaryPhp(result.maximumDiscount)}`,
      `Maximum discount per unit display: ${summaryPhp(result.maximumDiscountPerUnit)}`,
      `Discount share of gross: ${summaryPercent(result.maximumDiscountPercent)}`,
      `Gross sales: ${summaryPhp(result.grossSales)}`,
      `Net sales: ${summaryPhp(result.netSales)}`,
      `Percentage fees: ${summaryPhp(result.percentageFees)}`,
      `Total planned costs: ${summaryPhp(result.totalCosts)}`,
      `Planned gross profit: ${summaryPhp(result.grossProfit)}`,
      `Achieved gross margin: ${summaryPercent(result.achievedMarginPercent)}`,
    ]
  } else {
    assumptions = [
      `Unit selling price: ${inputMoney('unitPrice')}`,
      ...commonAssumptions.slice(0, 1),
      `Discount total: ${inputMoney('discount')}`,
      ...commonAssumptions.slice(1),
      `Target planned profit: ${inputMoney('targetProfit')}`,
    ]
    results = [
      `Minimum whole units: ${result.requiredQuantity}`,
      `Contribution per unit: ${summaryPhp(result.unitContribution)}`,
      `Gross sales: ${summaryPhp(result.grossSales)}`,
      `Net sales: ${summaryPhp(result.netSales)}`,
      `Goods cost: ${summaryPhp(result.goodsCost)}`,
      `Other + fixed costs: ${summaryPhp(result.otherAndFixedCosts)}`,
      `Percentage fees: ${summaryPhp(result.percentageFees)}`,
      `Total planned costs: ${summaryPhp(result.totalCosts)}`,
      `Planned gross profit: ${summaryPhp(result.grossProfit)}`,
      `Profit above target: ${summaryPhp(result.profitAboveTarget)}`,
      `Achieved gross margin: ${summaryPercent(result.achievedMarginPercent)}`,
      `At ${result.previousQuantity} units: ${summaryPhp(result.previousQuantityProfit)} — below target`,
    ]
  }

  return [
    'K2 SALES PLANNING SUMMARY',
    'PLANNING ONLY — NOT AN APPROVED PRICE, PROMOTION, QUOTA, ORDER, PAYOUT, SETTLEMENT, ACCOUNTING RECORD, OR ACTUAL PROFIT',
    `Mode: ${modeLabel}`,
    `Generated: ${generatedLabel}`,
    '',
    'ASSUMPTIONS',
    ...assumptions,
    '',
    'RESULT',
    ...results,
    '',
    'Canonical action: Review any real price, promotion, or quota decision through the authorized Admin workflow.',
  ].join('\n')
}
