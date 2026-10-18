// Product Master stores net_weight in grams. Never infer it from a name or size.
export function netWeightGrams(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value.trim())) return null
  const grams = Number(value)
  return Number.isFinite(grams) && grams > 0 ? grams : null
}

export function formatNetWeight(value) {
  const grams = netWeightGrams(value)
  if (grams === null) return null
  return grams >= 1000 ? `${grams / 1000} kg` : `${grams} g`
}
