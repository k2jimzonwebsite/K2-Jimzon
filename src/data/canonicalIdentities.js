/**
 * Canonical Operational Identities (MAP-004)
 * Authoritative registry of hubs, locations, custodians, channels, and normalizers.
 */

export const CANONICAL_HUBS = Object.freeze([
  // Retain the existing PH eligibility key; the physical address is in Bulacan.
  { id: 'HUB-MNL-CENTRAL', name: 'Warehouse A, Bulacan', code: 'WAREHOUSE-A', country: 'PH', role: 'Fulfillment & Receiving' },
])

export const CANONICAL_CUSTODIANS = Object.freeze([
  { id: 'CUST-JENNA-MAE-GUERRA', name: 'Jenna Mae Guerra', role: 'Warehouse Manager', hub_id: 'HUB-MNL-CENTRAL' },
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
 * @returns {object|null} Confirmed hub, or null for an unknown identity
 */
export function normalizeHub(input) {
  const clean = String(input ?? '').trim().toLowerCase()
  return CANONICAL_HUBS.find(hub => [hub.id, hub.name, hub.code]
    .some(value => value.toLowerCase() === clean)) ?? null
}

/**
 * Normalizes free-text custodian name to canonical Custodian record.
 * @param {string} input Custodian text
 * @returns {object|null} Confirmed custodian, or null for an unknown identity
 */
export function normalizeCustodian(input) {
  const clean = String(input ?? '').trim().toLowerCase()
  return CANONICAL_CUSTODIANS.find(custodian => [custodian.id, custodian.name]
    .some(value => value.toLowerCase() === clean)) ?? null
}
