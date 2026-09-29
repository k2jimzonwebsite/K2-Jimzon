// Product reference identifiers are not display text.
//
// `products.brand_id` and `products.category_id` are foreign keys into the
// `brands` and `categories` tables. The storefront reads `products` directly
// with an anon key and does not join those tables, so the raw UUID was reaching
// the customer-facing product page as the "Brand" row and as the category chip,
// and a UUID was being emitted as schema.org `brand.name`. Both tables are
// currently empty, which is the only reason the bug has not been seen yet.
//
// So a UUID is treated as "not set" rather than as a value to print. Showing a
// brand or category still requires resolving the real name from its table; that
// is blocked on the reference data existing, which is recorded in the Master
// Action Plan.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// True when the value is a bare foreign-key identifier, so it must never be
// rendered as human-facing text.
export function isReferenceId(value) {
  return typeof value === 'string' && UUID.test(value.trim())
}

function humanText(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || isReferenceId(trimmed)) return null
  return trimmed
}

// A resolved reference can arrive as a name string or as a PostgREST embed
// object (`brand:brands(name)`), so both shapes are read.
function resolvedName(value) {
  if (typeof value === 'string') return humanText(value)
  if (value && typeof value === 'object') return humanText(value.name)
  return null
}

// The customer's brand name, or null when only the reference is known.
// `brand`/`brand_name` are the resolved names. The `_id` field is only accepted
// when it is not a UUID, because the local sample catalogue stores a human name
// there while the database stores a foreign key.
export function displayBrand(product) {
  return resolvedName(product?.brand)
    || resolvedName(product?.brand_name)
    || humanText(product?.brand_id)
}

// The customer's category name, or null. `subcategory` is the human label the
// storefront already filters on, so it is preferred over the reference.
export function displayCategory(product) {
  return humanText(product?.subcategory)
    || resolvedName(product?.category)
    || resolvedName(product?.category_name)
    || humanText(product?.category_id)
}
