import { createSavedAdminCommandRecovery } from './savedAdminCommandRecovery.js'
import { FAMILY_UUID, validateFamilyPayload } from './productFamilies.js'

export function validateFamilyPayloadText(text) {
  if (typeof text !== 'string' || !text.isWellFormed() || new TextEncoder().encode(text).length > 16000) throw Error('FAMILY_INVALID')
  return validateFamilyPayload(JSON.parse(text))
}
export const productFamilyRecovery = createSavedAdminCommandRecovery({ namespace: 'k2-product-family-pending-v1', label: 'product variation', validatePayloadText: validateFamilyPayloadText })

export function validFamilyRead(read, selectedSkus = [], familyId = null) {
  try {
    if (!read?.ok || !Array.isArray(read.products) || read.products.length > 100
      || read.products.some(p => typeof p.name !== 'string' || !p.name.trim() || typeof p.sku !== 'string'
        || typeof p.status !== 'string' || !p.status || typeof p.websiteStatus !== 'string' || !p.websiteStatus)
      || new Set(read.products.map(p => p.sku)).size !== read.products.length
      || read.products.length !== selectedSkus.length || selectedSkus.some(sku => !read.products.some(p => p.sku === sku))) return false
    if (read.family === null) return familyId === null
    const family = read.family
    if (!family || !FAMILY_UUID.test(family.id) || (familyId && family.id !== familyId)
      || !Number.isInteger(family.version) || family.version < 1 || typeof family.taxonomyConsistent !== 'boolean') return false
    validateFamilyPayload({ familyId: family.id, expectedVersion: family.version, name: family.name, axes: family.axes,
      members: family.members.map(member => {
        if (typeof member.name !== 'string' || !member.name.trim()
          || typeof member.status !== 'string' || !member.status
          || typeof member.websiteStatus !== 'string' || !member.websiteStatus) throw Error()
        return { sku: member.sku, options: member.options }
      }) })
    return true
  } catch { return false }
}
