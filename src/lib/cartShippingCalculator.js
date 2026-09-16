import { parseQuantity } from '../components/shop/productDimensions.js'

export const PHILIPPINES_REGIONS = Object.freeze([
  { id: 'ncr', name: 'Metro Manila (NCR)', description: 'Caloocan, Makati, Manila, Pasig, Quezon City, Taguig, etc.' },
  { id: 'luzon', name: 'Greater Luzon', description: 'Bulacan, Pampanga, Cavite, Laguna, Rizal, Baguio, Batangas, etc.' },
  { id: 'visayas', name: 'Visayas', description: 'Cebu, Iloilo, Bacolod, Bohol, Leyte, etc.' },
  { id: 'mindanao', name: 'Mindanao', description: 'Davao, Cagayan de Oro, General Santos, Zamboanga, etc.' },
])

export const DEFAULT_REGION_ID = 'ncr'

/**
 * Derives an estimated packed shipping weight for a single product unit in grams.
 * Uses explicit measured parcel weight if present; otherwise parses net weight/size
 * and adds standard food container & protective wrap tare.
 */
export function getItemPackedWeightG(product) {
  if (!product) return 500
  if (Number.isInteger(product.shipping_weight_g) && product.shipping_weight_g > 0) {
    return product.shipping_weight_g
  }
  const parsed = parseQuantity(product.net_weight) || parseQuantity(product.size)
  if (parsed?.value && parsed.value > 0) {
    const isGlassOrBottle = /jar|bottle|vasetto|glass/i.test(
      `${product.package_type || ''} ${product.size || ''} ${product.name || ''}`
    )
    const tare = isGlassOrBottle ? 220 : 80
    return Math.round(parsed.value + tare)
  }
  return 500
}

/**
 * Calculates total packed parcel weight for all items in a cart.
 */
export function calculateCartPackedWeightG(lines = []) {
  if (!Array.isArray(lines) || lines.length === 0) return 0
  return lines.reduce((total, line) => {
    const qty = Math.max(1, Number(line.qty) || 1)
    const weightEach = getItemPackedWeightG(line.product)
    return total + (weightEach * qty)
  }, 0)
}

/**
 * Human-readable package weight string (e.g. "850 g" or "1.8 kg").
 */
export function formatWeight(grams) {
  const g = Math.max(0, Math.round(Number(grams) || 0))
  if (g < 1000) return `${g} g`
  const kg = Math.round(g / 100) / 10
  return `${kg} kg`
}

/**
 * Rounds a peso amount up to the nearest multiple of step (e.g. 5 pesos).
 */
function ceilingToStep(amount, step = 5) {
  return Math.ceil(amount / step) * step
}

/**
 * Computes available delivery options and calculated fees based on cart lines and destination.
 *
 * @param {Array} lines Cart items ({ product, qty })
 * @param {string} regionId One of 'ncr', 'luzon', 'visayas', 'mindanao'
 * @returns {object} { totalWeightG, formattedWeight, parcelCount, options }
 */
export function calculateCartShipping(lines = [], regionId = DEFAULT_REGION_ID) {
  const totalWeightG = calculateCartPackedWeightG(lines)
  const formattedWeight = formatWeight(totalWeightG)
  const parcelCount = Math.max(1, Math.ceil(totalWeightG / 10000))
  const normalizedRegion = String(regionId || DEFAULT_REGION_ID).toLowerCase()

  const overweightKg = Math.max(0, Math.ceil((totalWeightG - 3000) / 1000))

  const options = []

  if (normalizedRegion === 'ncr') {
    const standardFee = ceilingToStep(95 + (overweightKg * 30), 5)
    options.push({
      id: 'standard',
      methodName: 'Metro Manila delivery',
      courierHint: 'J&T Express / Manila Hub Dispatch',
      eta: '1–3 business days',
      fee: standardFee,
      isFree: standardFee === 0,
      badge: 'Recommended',
    })

    const expressOverweightKg = Math.max(0, Math.ceil((totalWeightG - 5000) / 1000))
    const expressFee = ceilingToStep(150 + (expressOverweightKg * 40), 10)
    options.push({
      id: 'express',
      methodName: 'Metro Manila Express Dispatch',
      courierHint: 'Lalamove / Grab on-demand rider',
      eta: 'Same-day or next-day delivery',
      fee: expressFee,
      isFree: false,
      badge: 'Fastest',
    })
  } else if (normalizedRegion === 'luzon') {
    const standardFee = ceilingToStep(85 + (overweightKg * 35), 5)
    options.push({
      id: 'standard',
      methodName: 'Courier delivery',
      courierHint: 'J&T Express Greater Luzon Dispatch',
      eta: '2–4 business days',
      fee: standardFee,
      isFree: standardFee === 0,
      badge: 'Standard',
    })
  } else if (normalizedRegion === 'visayas') {
    const standardFee = ceilingToStep(100 + (overweightKg * 40), 5)
    options.push({
      id: 'standard',
      methodName: 'Courier delivery',
      courierHint: 'J&T Air/Sea Cargo to Visayas',
      eta: '4–7 business days',
      fee: standardFee,
      isFree: standardFee === 0,
      badge: 'Island Transit',
    })
  } else {
    // Mindanao
    const standardFee = ceilingToStep(105 + (overweightKg * 45), 5)
    options.push({
      id: 'standard',
      methodName: 'Courier delivery',
      courierHint: 'J&T Air/Sea Cargo to Mindanao',
      eta: '5–9 business days',
      fee: standardFee,
      isFree: standardFee === 0,
      badge: 'Island Transit',
    })
  }

  // Pickup is always an option
  options.push({
    id: 'pickup',
    methodName: 'Pickup',
    courierHint: 'Collect at K2 Manila Hub (Mon–Sat 9AM–6PM)',
    eta: 'Ready upon stock confirmation',
    fee: 0,
    isFree: true,
    badge: 'Free',
  })

  return {
    totalWeightG,
    formattedWeight,
    parcelCount,
    regionId: normalizedRegion,
    options,
  }
}
