// Sole Product Master patch validator, shared with saved-command recovery.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PATCH_FIELDS = new Set([
  'name', 'short', 'barcode', 'subcategory', 'country_of_origin', 'origin', 'net_weight', 'brand_id', 'category_id',
  'package_type', 'size', 'description', 'why_buy', 'why_rare', 'usage_instructions',
  'storage_instructions', 'ingredients', 'allergens', 'finished_product_details',
  'pairings', 'cost_price', 'srp', 'wholesale_price', 'dealer_price', 'reorder_level',
  'slug', 'seo_keywords', 'is_featured', 'is_human_reviewed', 'product_video_url', 'internal_notes',
])

function boundedText(value, max, { required = false } = {}) {
  if (value === null) return null
  if (typeof value !== 'string') throw new Error('REQUEST_INVALID')
  const normalized = value.trim()
  if ((required && !normalized) || normalized.length > max) throw new Error('REQUEST_INVALID')
  return normalized || null
}

function boundedNumber(value, max) {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) throw new Error('REQUEST_INVALID')
  return value
}

function boundedStrings(value, maxItems, maxLength) {
  if (!Array.isArray(value) || value.length > maxItems) throw new Error('REQUEST_INVALID')
  return value.map((item) => boundedText(item, maxLength, { required: true }))
}

export function validateProductMasterPatch(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length < 1
      || Object.keys(raw).some((key) => !PATCH_FIELDS.has(key))) throw new Error('REQUEST_INVALID')
  const patch = {}
  const textLimits = {
    name: 240, short: 500, barcode: 64, subcategory: 120, country_of_origin: 120,
    origin: 240, package_type: 120, size: 120, description: 10000, why_buy: 2000,
    why_rare: 2000, usage_instructions: 5000, storage_instructions: 5000,
    ingredients: 10000, allergens: 5000, finished_product_details: 5000,
    slug: 180, product_video_url: 2000, internal_notes: 5000,
  }
  for (const [key, value] of Object.entries(raw)) {
    if (Object.hasOwn(textLimits, key)) patch[key] = boundedText(value, textLimits[key], { required: key === 'name' })
    else if (key === 'brand_id' || key === 'category_id') {
      if (typeof value !== 'string' || !UUID.test(value)) throw new Error('REQUEST_INVALID')
      patch[key] = value.toLowerCase()
    }
    else if (['cost_price', 'srp', 'wholesale_price', 'dealer_price'].includes(key)) patch[key] = boundedNumber(value, 1_000_000)
    else if (key === 'net_weight' || key === 'reorder_level') patch[key] = boundedNumber(value, key === 'net_weight' ? 100_000 : 1_000_000)
    else if (key === 'pairings') patch[key] = boundedStrings(value, 20, 240)
    else if (key === 'seo_keywords') patch[key] = boundedStrings(value, 30, 120)
    else if (key === 'is_featured' || key === 'is_human_reviewed') {
      if (typeof value !== 'boolean') throw new Error('REQUEST_INVALID')
      patch[key] = value
    }
  }
  const includesBrand = Object.hasOwn(patch, 'brand_id')
  const includesCategory = Object.hasOwn(patch, 'category_id')
  if (includesBrand !== includesCategory) throw new Error('REQUEST_INVALID')
  return patch
}

