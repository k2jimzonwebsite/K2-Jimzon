/**
 * MAP-027 Interactive Shop — shelf composition.
 *
 * Pure functions over the canonical catalog projection. No DOM, no context, no
 * fetching: the shelf is a presentation of `listedProducts` and never a second
 * catalog. Keeping this separate from the scene makes the arrangement testable
 * without a browser and keeps the renderer free of business rules.
 */

/**
 * Fixed shelf order. Categories are matched case-insensitively against the
 * canonical `category` projection; anything unmatched collects into `Everything
 * else` so a product can never silently vanish from the shop because its
 * category is new or unrecognised.
 *
 * Each shelf carries two pieces of authored copy with different jobs:
 *
 * - `blurb` is the heading the rail prints beside the shelf. It labels.
 * - `intro` is what the clerk says when the customer arrives at it. It
 *   introduces: what the category is for, and how to get at it. She adds
 *   something to the screen instead of reading the heading back.
 *
 * An `intro` is store copy, not product knowledge. It may describe the shelf
 * and offer a way in; it must never assert a fact about an individual item,
 * and it must never state a count, price, or stock level. Those are derived
 * from the catalog at the moment she speaks, so an authored number could
 * contradict the shelf standing in front of the customer.
 */
export const SHELF_DEFINITIONS = [
  {
    id: 'coffee',
    name: 'Coffee & Drinks',
    blurb: 'Whole beans, ground, and the everyday Italian pour.',
    intro: 'Most people start here. Whole beans if you grind your own, ground if you would rather not — tell me how you brew and I will narrow it down.',
    match: ['beverages', 'coffee', 'coffee & drinks', 'drinks'],
  },
  {
    id: 'pantry',
    name: 'Pantry',
    blurb: 'Pasta, passata, oil, and the staples a kitchen runs on.',
    intro: 'This is the everyday shelf, the one you come back to. Tell me the dish you are cooking and I will point you at what it needs.',
    match: ['seasoning, staple foods & baking ingredients', 'pantry', 'pantry & baking', 'staples'],
  },
  {
    id: 'snacks',
    name: 'Snacks & Sweets',
    blurb: 'Biscuits, spreads, and the sweet end of the shelf.',
    intro: 'The sweet end, and whatever goes beside a coffee. A good shelf to raid if you are putting a gift basket together.',
    match: ['snack & sweets', 'snacks & sweets', 'snacks', 'sweets', 'breakfast food'],
  },
  {
    id: 'care',
    name: 'Beauty & Personal Care',
    blurb: 'Bath, body, hair, and skin from the same Italian runs.',
    intro: 'Bath, body, hair, and skin — the same Italian shipments as the food, only a different aisle. Ask me if you want the gentler ones.',
    match: ['bath & body', 'beauty', 'personal care', 'hair care', 'skin care', 'whitening', 'slimming', 'fragrances'],
  },
]

const OVERFLOW_SHELF = {
  id: 'everything-else',
  name: 'Everything else',
  blurb: 'Recent arrivals that have not been given a shelf yet.',
  intro: 'Things that landed before I gave them a proper shelf. Still checked, still ours — just not filed away yet.',
  match: [],
}

const normalize = value => String(value ?? '').trim().toLowerCase()

function shelfIdForProduct(product) {
  const category = normalize(product?.category)
  if (!category) return OVERFLOW_SHELF.id
  const shelf = SHELF_DEFINITIONS.find(candidate => candidate.match.includes(category))
  return shelf ? shelf.id : OVERFLOW_SHELF.id
}

/**
 * Group the canonical catalog into shelves.
 *
 * Empty shelves are dropped rather than rendered as furniture with nothing on
 * it — an empty shop should say so once, not present four empty rooms. The
 * overflow shelf appears only when something actually lands in it.
 */
/**
 * The Counter / Overview scene.
 *
 * Concept §18 opens the store here rather than dropping the customer straight
 * into a category. It holds no products — it is where K2 stands.
 */
export const COUNTER_SCENE = {
  id: 'counter',
  name: 'Counter',
  blurb: 'Welcome in. Pick a shelf, or ask me what you are looking for.',
  intro: 'You are back at the counter. Pick a shelf whenever you are ready and I will walk over with you.',
  isCounter: true,
  products: [],
}

/**
 * New Arrivals, derived from the catalog rather than curated by hand.
 *
 * Concept §18 allows this scene "only when real data supports it", so it is
 * built from products the catalog actually flags and omitted entirely when
 * nothing qualifies. It is a view of existing products, not a second listing:
 * the same items still appear on their own category shelf.
 */
function newArrivals(products) {
  const flagged = products.filter(p => p?.is_featured === true || p?.isNew === true)
  if (flagged.length === 0) return null
  return {
    id: 'new-arrivals',
    name: 'New Arrivals',
    blurb: 'Just landed from the latest Milan consignment.',
    intro: 'Freshest off the last Milan consignment. Each of these still sits on its own shelf too, so this is a shortcut rather than separate stock.',
    products: flagged,
  }
}

export function buildShelves(products = []) {
  const safe = Array.isArray(products) ? products.filter(Boolean) : []
  const byShelf = new Map()

  for (const product of safe) {
    const id = shelfIdForProduct(product)
    if (!byShelf.has(id)) byShelf.set(id, [])
    byShelf.get(id).push(product)
  }

  const ordered = [...SHELF_DEFINITIONS, OVERFLOW_SHELF]
  const categoryShelves = ordered
    .filter(shelf => (byShelf.get(shelf.id) || []).length > 0)
    .map(shelf => ({
      id: shelf.id,
      name: shelf.name,
      blurb: shelf.blurb,
      intro: shelf.intro,
      products: byShelf.get(shelf.id),
    }))

  // An empty catalog gets no scenes at all, not a lone counter fronting nothing.
  if (categoryShelves.length === 0) return []

  const arrivals = newArrivals(safe)
  return [COUNTER_SCENE, ...(arrivals ? [arrivals] : []), ...categoryShelves]
}

/**
 * Split a shelf's products into rows of planks.
 *
 * The scene draws a fixed number of physical planks; this decides what rests on
 * each one. A shelf with fewer products than `perRow` produces a single row
 * rather than padding empty slots with placeholders.
 */
export function toPlankRows(products = [], perRow = 4) {
  const safe = Array.isArray(products) ? products.filter(Boolean) : []
  const size = Number.isFinite(perRow) && perRow > 0 ? Math.floor(perRow) : 4
  const rows = []
  for (let index = 0; index < safe.length; index += size) {
    rows.push(safe.slice(index, index + size))
  }
  return rows
}

/**
 * Stock presentation for a shelf item.
 *
 * Mirrors the storefront's existing stock vocabulary so the shop can never
 * describe availability differently from the catalog. `unknown` exists because
 * the FEFO projection can be unavailable; it must not be rendered as `Sold out`,
 * which would assert an availability fact the catalog has not established.
 */
export function stockState(product) {
  const raw = product?.stock_available ?? product?.stock
  if (raw === null || raw === undefined || raw === '') return { tone: 'unknown', label: 'Checking stock' }
  const quantity = Number(raw)
  if (!Number.isFinite(quantity)) return { tone: 'unknown', label: 'Checking stock' }
  if (quantity <= 0) return { tone: 'out', label: 'Sold out' }
  if (quantity <= 3) return { tone: 'low', label: `Only ${quantity} left` }
  return { tone: 'in', label: `${quantity} available` }
}
