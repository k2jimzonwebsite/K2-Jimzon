/**
 * Canonical Operational Identities (MAP-004)
 * Authoritative registry of hubs, locations, custodians, channels, and normalizers.
 */

export const CANONICAL_HUBS = Object.freeze([
  { id: 'HUB-MNL-CENTRAL', name: 'Manila Central Hub', code: 'MNL-CENTRAL', country: 'PH', role: 'Fulfillment & Receiving' },
  { id: 'HUB-MIL-DEPOT', name: 'Milan Cargo Depot', code: 'MIL-DEPOT', country: 'IT', role: 'Packing & Export' },
  { id: 'HUB-CEB-TRANSIT', name: 'Cebu Transit Hub', code: 'CEB-TRANSIT', country: 'PH', role: 'Regional Transit' }
])

export const CANONICAL_CUSTODIANS = Object.freeze([
  { id: 'CUST-STAFF-ELENA', name: 'Elena Santos', role: 'PH Warehouse Lead', hub_id: 'HUB-MNL-CENTRAL' },
  { id: 'CUST-STAFF-MARCO', name: 'Marco Rossi', role: 'Italy Cargo Specialist', hub_id: 'HUB-MIL-DEPOT' },
  { id: 'CUST-STAFF-MATTEO', name: 'Matteo Ricci', role: 'Manila Operations Specialist', hub_id: 'HUB-MNL-CENTRAL' }
])

export const CANONICAL_CHANNELS = Object.freeze([
  { id: 'CHAN-WEBSITE', name: 'Direct Website', type: 'website', status: 'active' },
  { id: 'CHAN-SHOPEE', name: 'Shopee Official Store', type: 'shopee', status: 'live' },
  { id: 'CHAN-LAZADA', name: 'Lazada Flagship Store', type: 'lazada', status: 'live' },
  { id: 'CHAN-TIKTOK', name: 'TikTok Shop', type: 'tiktok', status: 'live' },
  { id: 'CHAN-PASABUY', name: 'Pasabuy Direct Request', type: 'wholesale', status: 'active' }
])

/**
 * Normalizes free-text hub name to canonical Hub record.
 * @param {string} input Hub text
 * @returns {object} Canonical Hub object
 */
export function normalizeHub(input) {
  if (!input) return CANONICAL_HUBS[0]
  const clean = String(input).toLowerCase()

  if (clean.includes('milan') || clean.includes('italy') || clean.includes('mil')) {
    return CANONICAL_HUBS[1]
  }
  if (clean.includes('cebu') || clean.includes('ceb')) {
    return CANONICAL_HUBS[2]
  }
  return CANONICAL_HUBS[0]
}

/**
 * Normalizes free-text custodian name to canonical Custodian record.
 * @param {string} input Custodian text
 * @returns {object} Canonical Custodian object
 */
export function normalizeCustodian(input) {
  if (!input) return CANONICAL_CUSTODIANS[0]
  const clean = String(input).toLowerCase()

  if (clean.includes('marco') || clean.includes('rossi')) {
    return CANONICAL_CUSTODIANS[1]
  }
  if (clean.includes('matteo') || clean.includes('ricci')) {
    return CANONICAL_CUSTODIANS[2]
  }
  return CANONICAL_CUSTODIANS[0]
}
