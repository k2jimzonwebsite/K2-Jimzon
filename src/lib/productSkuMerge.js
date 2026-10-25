// MAP-023 / IDEA-20261025-04. This is a one-time correction of owner-confirmed
// duplicates, not a general-purpose product merger. The database repeats this gate.
export const PRODUCT_SKU_MERGE_GROUPS = Object.freeze({
  'one-fragrance': Object.freeze({ label: 'G. Bellini One Fragrance', canonicalSku: 'K2-SKU-001145', sourceSkus: Object.freeze(['K2-SKU-001146', 'K2-SKU-001147', 'K2-SKU-001148']) }),
  'borella-carne': Object.freeze({ label: 'Borella Carne', canonicalSku: 'K2-SKU-001017', sourceSkus: Object.freeze(['K2-SKU-001016', 'K2-SKU-001018']) }),
  'borella-prosciutto': Object.freeze({ label: 'Borella Prosciutto', canonicalSku: 'K2-SKU-001020', sourceSkus: Object.freeze(['K2-SKU-001019', 'K2-SKU-001021']) }),
})

export function validateProductSkuMergePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)
    || Object.keys(payload).length !== 3
    || !['groupId', 'expectedStateHash', 'reason'].every(key => Object.hasOwn(payload, key))
    || typeof payload.groupId !== 'string' || !Object.hasOwn(PRODUCT_SKU_MERGE_GROUPS, payload.groupId)
    || typeof payload.expectedStateHash !== 'string' || !/^[a-f0-9]{64}$/.test(payload.expectedStateHash)
    || typeof payload.reason !== 'string' || payload.reason.trim().length < 8 || payload.reason.trim().length > 500) {
    throw Error('REQUEST_INVALID')
  }
  return payload
}
