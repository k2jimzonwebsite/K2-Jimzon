/**
 * TEMPORARY FIXTURE — sample shop and custodian assignments for the Sheet lens.
 *
 * ============================================================================
 * THIS IS NOT REAL DATA. Nothing here reflects who actually holds stock.
 * ============================================================================
 *
 * Why it exists: the owner asked to see the shop and staff lens working before
 * the real allocation layer is built. Inventory today is one shared MANILA_MAIN
 * pool with no shop dimension — `20260829_channel_vocabulary_and_shops.sql`
 * records the batch allocation dimension as left to MAP-026 — so there is no
 * real answer yet to "which shop holds this SKU". This file invents one so the
 * interaction can be judged.
 *
 * HOW TO DELETE THIS, when real allocation lands:
 *   1. Delete this file.
 *   2. In `Sheet.jsx`, remove the `sheetShopLensFixture` import and the
 *      `FIXTURE_NOTICE` banner, then point `shopAssignmentsFor` at the real
 *      per-shop allocation read.
 * Nothing else imports it. The contract in
 * `tests/sheet-shop-lens.spec.js` asserts both of those removal points.
 *
 * Assignment is a stable hash of the SKU rather than a hardcoded list, so the
 * lens has something to filter whatever real products are loaded. That also
 * means the assignments are arbitrary — a SKU's "shop" here carries no meaning
 * beyond making the control demonstrable.
 */

export const FIXTURE_NOTICE =
  'Sample assignments. Shop and handler shown here are placeholder data, not real stock custody.'

/** Mock shops, shaped like `public.channel_shops` rows. */
export const FIXTURE_SHOPS = Object.freeze([
  { shopCode: 'shopee_a', displayName: 'Shopee A', channel: 'shopee', custodian: 'Staff A' },
  { shopCode: 'shopee_b', displayName: 'Shopee B', channel: 'shopee', custodian: 'Staff B' },
  { shopCode: 'lazada_a', displayName: 'Lazada A', channel: 'lazada', custodian: 'Staff A' },
  { shopCode: 'tiktok_a', displayName: 'TikTok A', channel: 'tiktok', custodian: 'Staff B' },
])

/** The distinct custodians, in stable order, for the staff chips. */
export const FIXTURE_CUSTODIANS = Object.freeze(
  [...new Set(FIXTURE_SHOPS.map(shop => shop.custodian))].sort(),
)

const shopByCode = new Map(FIXTURE_SHOPS.map(shop => [shop.shopCode, shop]))

/** Stable, order-independent hash so a SKU keeps the same sample shops. */
function hashSku(sku) {
  let hash = 0
  const text = String(sku ?? '')
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0
  }
  return hash
}

/**
 * Sample shop codes for one SKU. Some SKUs land on two shops, because a product
 * listed by more than one seller account is the case the lens has to survive.
 *
 * @param {string} sku
 * @returns {string[]} shop codes from FIXTURE_SHOPS
 */
export function shopAssignmentsFor(sku) {
  if (!sku) return []
  const hash = hashSku(sku)
  const primary = FIXTURE_SHOPS[hash % FIXTURE_SHOPS.length]
  // Roughly one SKU in three is also listed on a second shop.
  if (hash % 3 !== 0) return [primary.shopCode]
  const secondary = FIXTURE_SHOPS[(hash >>> 3) % FIXTURE_SHOPS.length]
  return secondary.shopCode === primary.shopCode
    ? [primary.shopCode]
    : [primary.shopCode, secondary.shopCode]
}

/** The custodians behind a set of shop codes. */
export function custodiansForShops(shopCodes) {
  return [...new Set(shopCodes.map(code => shopByCode.get(code)?.custodian).filter(Boolean))]
}

/** Display names for a set of shop codes, for the row badge. */
export function shopLabelsFor(shopCodes) {
  return shopCodes.map(code => shopByCode.get(code)?.displayName || code)
}
