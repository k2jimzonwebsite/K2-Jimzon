/**
 * Which manifest line a receiving action addresses.
 *
 * A manifest can carry the same SKU twice, because two physical boxes of one
 * product are two different lots with their own batch code and expiry. Selecting
 * by SKU alone therefore resolves to whichever line happens to be first and
 * incomplete — so a staff member clicking the second box increments the first,
 * and the count is attributed to the wrong lot (MAP-028 H-017).
 *
 * The exact manifest-item id is the only safe address. The SKU fallback is kept
 * for the scanner, where a barcode genuinely arrives without a chosen row, but
 * every deliberate row action must pass its own id.
 */

function matchesCode(item, code, productSku) {
  const wanted = code.toLowerCase()
  return item.sku?.toLowerCase() === wanted || (productSku && item.sku === productSku)
}

export function selectManifestItem({ items = [], code, products = [], stage, selectedItemId = null }) {
  const clean = String(code || '').trim()
  if (!clean) return null
  const product = products.find((candidate) => candidate.sku?.toLowerCase() === clean.toLowerCase()
    || (candidate.barcode && String(candidate.barcode) === clean))
  const matches = items.filter((item) => matchesCode(item, clean, product?.sku))

  if (selectedItemId) return matches.find((item) => item.id === selectedItemId) || null

  // Scanner path only: no row was chosen, so fall back to the first line that
  // still has room at this stage.
  return matches.find((item) => (stage === 'milan'
    ? item.italy_packed_qty < item.expected_qty
    : item.manila_scanned_qty < item.italy_packed_qty)) || null
}

/**
 * Why this exact line cannot take another unit right now, named by box so the
 * refusal is actionable. An empty string means the action is permitted.
 *
 * This is checked against the item as currently held, so a row rendered before a
 * refresh cannot act on quantities that have since changed.
 */
export function scanRefusalReason(item, stage) {
  if (!item) return 'That manifest line is no longer available. Refresh the manifest.'
  const box = item.box_code || item.batch_code || item.sku
  if (stage === 'milan') {
    return item.italy_packed_qty >= item.expected_qty
      ? `${box} already reached its expected quantity (${item.italy_packed_qty}/${item.expected_qty}). Add a manifest line for extra units instead of over-scanning this box.`
      : ''
  }
  return item.manila_scanned_qty >= item.italy_packed_qty
    ? `${box} already has every unit packed in Milan recorded as received (${item.manila_scanned_qty}/${item.italy_packed_qty}).`
    : ''
}
