// Families describe choices; products and their exact SKUs remain commerce truth.
export const FAMILY_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SKU = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/
const object = value => value && typeof value === 'object' && !Array.isArray(value)
const invalid = () => { throw Error('FAMILY_INVALID') }
export const cleanFamilyText = value => String(value ?? '').normalize('NFC').trim()
const key = value => value.toLowerCase()
function text(value, max) {
  if (typeof value !== 'string' || !value.isWellFormed() || !value
    || value !== cleanFamilyText(value) || [...value].length > max || /[\p{Cc}\p{Cf}]/u.test(value)) invalid()
}
function exact(value, keys) {
  if (!object(value) || Object.keys(value).length !== keys.length || !keys.every(k => Object.hasOwn(value, k))) invalid()
}

export function validateFamilyPayload(body) {
  exact(body, ['familyId', 'expectedVersion', 'name', 'axes', 'members'])
  if (!FAMILY_UUID.test(body.familyId) || !Number.isSafeInteger(body.expectedVersion) || body.expectedVersion < 0 || body.expectedVersion > 2147483646) invalid()
  text(body.name, 120)
  if (!Array.isArray(body.axes) || body.axes.length > 6 || !Array.isArray(body.members) || body.members.length > 100) invalid()
  body.axes.forEach(axis => text(axis, 40))
  if (new Set(body.axes.map(key)).size !== body.axes.length || (body.members.length > 0 && !body.axes.length)) invalid()
  const skus = new Set(), combinations = new Set(), values = new Map()
  for (const member of body.members) {
    exact(member, ['sku', 'options'])
    if (typeof member.sku !== 'string' || !SKU.test(member.sku) || skus.has(member.sku)) invalid()
    skus.add(member.sku)
    exact(member.options, body.axes)
    const combination = []
    for (const axis of body.axes) {
      const value = member.options[axis]
      text(value, 80)
      const valueKey = JSON.stringify([axis, key(value)])
      if (values.has(valueKey) && values.get(valueKey) !== value) invalid()
      values.set(valueKey, value)
      combination.push(key(value))
    }
    const identity = JSON.stringify(combination)
    if (combinations.has(identity)) invalid()
    combinations.add(identity)
  }
  if (new TextEncoder().encode(JSON.stringify(body)).length > 16000) invalid()
  return body // Preserve literal request identity for signed, durable retries.
}

export function attachProductFamilies(products = [], rows = []) {
  const eligible = new Set(products.filter(p => p.published !== false && (!p.status || ['Live', 'Active'].includes(p.status))).map(p => p.sku))
  const families = new Map(), assigned = new Map(), invalidIds = new Set()
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!eligible.has(row.sku)) continue
    const id = row.family_id
    if (!families.has(id)) families.set(id, { id, name: row.family_name, axes: row.axes, members: [] })
    const family = families.get(id)
    if (family.name !== row.family_name || JSON.stringify(family.axes) !== JSON.stringify(row.axes)) invalidIds.add(id)
    if (assigned.has(row.sku)) { invalidIds.add(id); invalidIds.add(assigned.get(row.sku)) }
    assigned.set(row.sku, id)
    family.members.push({ sku: row.sku, options: row.options })
  }
  for (const family of families.values()) {
    try {
      validateFamilyPayload({ familyId: family.id, expectedVersion: 0, name: family.name, axes: family.axes, members: family.members })
    } catch { invalidIds.add(family.id) }
  }
  return products.map(product => {
    const family = families.get(assigned.get(product.sku))
    if (!family || invalidIds.has(family.id)) return product
    return { ...product, family, variantOptions: family.members.find(member => member.sku === product.sku).options }
  })
}

export async function loadStorefrontProductFamilies(client, products, websiteSkus) {
  const eligible = products.filter(p => websiteSkus.has(p.sku) && ['Live', 'Active'].includes(p.status))
  if (!eligible.length || eligible.length > 1000) return {}
  const result = await client.rpc('read_storefront_product_families_v1', { p_skus: eligible.map(p => p.sku) }).abortSignal(AbortSignal.timeout(4000))
  if (result.error || !Array.isArray(result.data) || !result.data.length) return {}
  return Object.fromEntries(attachProductFamilies(eligible, result.data).filter(p => p.family)
    .map(p => [p.sku, { family: p.family, variantOptions: p.variantOptions }]))
}

export { variantDimensions } from './productVariantOptions.js'
export { variantSummary, groupFamilyResults, familyPriceRange } from './productFamilyPresentation.js'
