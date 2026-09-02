/**
 * MAP-027 — automatic package measurement.
 *
 * A shelf where a 43 g chocolate bar and a 1 kg coffee bag are the same box is
 * not a shop, it is a spreadsheet with lighting. This module derives a real
 * physical size for every item from data the catalog already carries — the
 * declared `size`, `net_weight`, and `package_type` — so the scene can draw each
 * package at true relative scale.
 *
 * It is a derivation, not a claim. Nothing here is presented to a customer as a
 * measured specification: `confidence` records how the number was reached, and a
 * caller that wants to display dimensions must respect it. Estimated sizes exist
 * to make the shelf read correctly, not to assert pack dimensions the business
 * has never verified.
 *
 * Pure functions over plain objects. No DOM, no three.js, no catalog access — so
 * the arithmetic can be tested without a browser.
 */

/**
 * Bulk density by package form, g/cm3.
 *
 * These describe the contents, not the container. Whole coffee beans pack
 * loosely; a hazelnut spread is denser than water. The values are ordinary food
 * bulk densities and deliberately coarse — they decide how big a box looks, and
 * being ten percent off is invisible on a shelf.
 */
const CONTENT_DENSITY = {
  bag: 0.45,
  box: 0.34,
  jar: 1.15,
  bottle: 1.0,
  tin: 0.85,
  bar: 1.05,
  tube: 1.05,
  pouch: 0.6,
  default: 0.6,
}

/**
 * Package proportion and headroom per form.
 *
 * `heightPerWidth` and `depthPerWidth` are the shape: how tall and deep a
 * package is relative to its width, or for round forms its diameter.
 * `headroom` is the gap between contents and container — a biscuit carton is
 * mostly air, a jar is nearly full.
 */
const FORM_MODEL = {
  bag: { kind: 'box', heightPerWidth: 1.9, depthPerWidth: 0.42, headroom: 1.3 },
  pouch: { kind: 'box', heightPerWidth: 1.5, depthPerWidth: 0.5, headroom: 1.25 },
  box: { kind: 'box', heightPerWidth: 1.55, depthPerWidth: 0.32, headroom: 1.45 },
  bar: { kind: 'box', heightPerWidth: 1.7, depthPerWidth: 0.12, headroom: 1.15 },
  jar: { kind: 'round', heightPerWidth: 1.35, headroom: 1.2 },
  bottle: { kind: 'round', heightPerWidth: 3.2, headroom: 1.1 },
  tin: { kind: 'round', heightPerWidth: 1.05, headroom: 1.12 },
  tube: { kind: 'round', heightPerWidth: 4.5, headroom: 1.1 },
}

const DEFAULT_FORM = 'box'

/**
 * Package-form vocabulary.
 *
 * Matched against `package_type` first, then the free-text `size`, then the
 * product name. Order matters: multi-word phrases are tested before the single
 * words they contain, so "foil valve bag" cannot be decided by "bag" alone.
 */
const FORM_KEYWORDS = [
  ['foil valve bag', 'bag'],
  ['valve bag', 'bag'],
  ['stand-up pouch', 'pouch'],
  ['resealable pouch', 'pouch'],
  ['glass jar', 'jar'],
  ['glass bottle', 'bottle'],
  ['spray bottle', 'bottle'],
  ['tetra', 'box'],
  ['carton', 'box'],
  ['sachet', 'pouch'],
  ['pouch', 'pouch'],
  ['bottle', 'bottle'],
  ['flacon', 'bottle'],
  ['jar', 'jar'],
  ['vasetto', 'jar'],
  ['tube', 'tube'],
  ['tin', 'tin'],
  ['can', 'tin'],
  ['lattina', 'tin'],
  ['bar', 'bar'],
  ['tavoletta', 'bar'],
  ['bag', 'bag'],
  ['sacchetto', 'bag'],
  ['packet', 'box'],
  ['pack', 'box'],
  ['box', 'box'],
  ['scatola', 'box'],
]

const text = (value) => String(value ?? '').toLowerCase()

/**
 * Keyword matching, on word boundaries.
 *
 * A plain substring test reads "Barilla" as a chocolate `bar` and "Panettone"
 * as a `pan`. Every form keyword must therefore match as a whole word, with
 * hyphenated phrases still matching across the hyphen.
 */
const boundaryCache = new Map()

function matchesKeyword(haystack, keyword) {
  let pattern = boundaryCache.get(keyword)
  if (!pattern) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    pattern = new RegExp(`(?:^|[^a-z])${escaped}(?:[^a-z]|$)`)
    boundaryCache.set(keyword, pattern)
  }
  return pattern.test(haystack)
}

/** Normalise a quantity to grams or millilitres. */
function toBase(value, unit) {
  if (!Number.isFinite(value) || value <= 0) return null
  switch (unit) {
    case 'kg': return { value: value * 1000, unit: 'g' }
    case 'g': return { value, unit: 'g' }
    case 'l': return { value: value * 1000, unit: 'ml' }
    case 'cl': return { value: value * 10, unit: 'ml' }
    case 'ml': return { value, unit: 'ml' }
    default: return null
  }
}

/**
 * Read the declared quantity out of a size string.
 *
 * Handles the shapes the catalog actually uses: "1 kg bag", "600 g jar",
 * "85 ml", "2 x 80 g" (a multipack, which is the product of its factors), and
 * "304 g - 22 pcs" (where the piece count is not a quantity and is ignored).
 *
 * Returns null when the string carries no quantity. That is a real answer: the
 * caller falls back to a typical size rather than inventing a precise one.
 */
export function parseQuantity(raw) {
  const source = text(raw).replace(/,/g, '.')
  if (!source) return null

  // A multipack multiplies out: "2 x 80 g" is 160 g of product.
  const multi = source.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl)\b/)
  if (multi) {
    const count = Number(multi[1])
    const each = Number(multi[2])
    const scaled = toBase(each, multi[3])
    if (scaled && Number.isFinite(count) && count > 0) {
      return { ...scaled, value: scaled.value * count, packCount: count }
    }
  }

  const single = source.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l|cl)\b/)
  if (single) {
    const parsed = toBase(Number(single[1]), single[2])
    if (parsed) return parsed
  }

  return null
}

/**
 * Decide what shape of package this is.
 *
 * `package_type` is the declared field and wins outright. Falling back to the
 * size string and then the product name recovers the common case where intake
 * left `package_type` blank but the size still says "jar".
 */
export function detectForm(product) {
  const haystacks = [
    text(product?.package_type),
    text(product?.size),
    text(product?.name),
  ]

  for (const haystack of haystacks) {
    if (!haystack) continue
    for (const [keyword, form] of FORM_KEYWORDS) {
      if (matchesKeyword(haystack, keyword)) return form
    }
  }

  // Nothing named a container. A millilitre quantity is a liquid, and a liquid
  // in an unnamed container is a bottle far more often than it is a box.
  const quantity = parseQuantity(product?.size) || parseQuantity(product?.net_weight)
  if (quantity?.unit === 'ml') return 'bottle'
  return DEFAULT_FORM
}

const cbrt = (value) => Math.cbrt(value)

function boxDimensions(volume, model) {
  const width = cbrt(volume / (model.heightPerWidth * model.depthPerWidth))
  return {
    widthCm: width,
    heightCm: width * model.heightPerWidth,
    depthCm: width * model.depthPerWidth,
    round: false,
  }
}

function roundDimensions(volume, model) {
  const diameter = cbrt((4 * volume) / (Math.PI * model.heightPerWidth))
  return {
    widthCm: diameter,
    heightCm: diameter * model.heightPerWidth,
    depthCm: diameter,
    round: true,
  }
}

/**
 * Keep every package within what a shelf can physically hold.
 *
 * A bad size string — "1 kg" read off a twelve-pack case, say — must not produce
 * a package taller than the bay. The clamp preserves proportions, so a clamped
 * item still reads as the right shape.
 */
const MIN_CM = 3
const MAX_HEIGHT_CM = 32
const MAX_WIDTH_CM = 22

const round1 = (value) => Math.round(value * 10) / 10

function clampToShelf({ widthCm, heightCm, depthCm, round }) {
  let scale = 1
  if (heightCm > MAX_HEIGHT_CM) scale = Math.min(scale, MAX_HEIGHT_CM / heightCm)
  if (widthCm > MAX_WIDTH_CM) scale = Math.min(scale, MAX_WIDTH_CM / widthCm)

  return {
    widthCm: round1(Math.max(MIN_CM, widthCm * scale)),
    heightCm: round1(Math.max(MIN_CM, heightCm * scale)),
    depthCm: round1(Math.max(MIN_CM * 0.3, depthCm * scale)),
    round: Boolean(round),
  }
}

function formatQuantity(quantity) {
  if (!quantity) return ''
  const { value, unit } = quantity
  if (unit === 'g' && value >= 1000) return `${round1(value / 1000)} kg`
  if (unit === 'ml' && value >= 1000) return `${round1(value / 1000)} L`
  return `${round1(value)} ${unit}`
}

/**
 * A package with no declared quantity still has to stand somewhere.
 *
 * These are mid-range sizes for each form — an honest "about this big" rather
 * than a derived figure, which is why `confidence` reports `assumed`.
 */
function fallbackMeasurement(form, model) {
  const typical = { bag: 480, pouch: 400, box: 620, bar: 120, jar: 420, bottle: 500, tin: 400, tube: 150 }
  const volume = (typical[form] ?? 500) * model.headroom
  const dimensions = model.kind === 'round'
    ? roundDimensions(volume, model)
    : boxDimensions(volume, model)
  return {
    ...clampToShelf(dimensions),
    form,
    confidence: 'assumed',
    basis: `typical ${form}`,
    packCount: 1,
  }
}

/**
 * Derive package dimensions in centimetres.
 *
 * The chain is: declared quantity, then contents volume via bulk density (or
 * directly, when the quantity is already a volume), then package volume via the
 * form's headroom, then the three dimensions that satisfy both that volume and
 * the form's proportions.
 *
 * For a rectangular form of width w, V = w * (hw * w) * (dw * w), so
 * w = cbrt(V / (hw * dw)). For a round form of diameter d, V = pi/4 * d^2 * (hd * d),
 * so d = cbrt(4V / (pi * hd)). Both fall out of holding the proportions fixed.
 */
export function measureProduct(product) {
  const form = detectForm(product)
  const model = FORM_MODEL[form] || FORM_MODEL[DEFAULT_FORM]

  const quantity =
    parseQuantity(product?.size) ||
    parseQuantity(product?.net_weight) ||
    parseQuantity(product?.name)

  if (!quantity) return fallbackMeasurement(form, model)

  // A millilitre figure is already a volume. A gram figure needs the density of
  // whatever is inside, which depends on the form.
  const density = CONTENT_DENSITY[form] ?? CONTENT_DENSITY.default
  const contentVolume = quantity.unit === 'ml' ? quantity.value : quantity.value / density
  const packageVolume = contentVolume * model.headroom

  const dimensions = model.kind === 'round'
    ? roundDimensions(packageVolume, model)
    : boxDimensions(packageVolume, model)

  return {
    ...clampToShelf(dimensions),
    form,
    confidence: 'derived',
    basis: `${formatQuantity(quantity)} ${form}`,
    packCount: quantity.packCount ?? 1,
  }
}

/**
 * Scene scale.
 *
 * One scene unit is 13 cm, chosen so a shelf gap of 2.9 units reads as the 38 cm
 * of a real supermarket shelf and a 1 kg coffee bag stands about two units tall.
 */
export const CM_PER_UNIT = 13

/** The same measurement, expressed in the scene's units. */
export function measureForScene(product) {
  const measured = measureProduct(product)
  return {
    ...measured,
    width: measured.widthCm / CM_PER_UNIT,
    height: measured.heightCm / CM_PER_UNIT,
    depth: measured.depthCm / CM_PER_UNIT,
  }
}

/**
 * A human-readable size line for the product panel.
 *
 * Rounded to whole centimetres and prefixed as approximate, because these are
 * derived figures. Returns null for an assumed measurement — showing a made-up
 * pack size next to a real price would read as a specification.
 */
export function describeMeasurement(product) {
  const measured = measureProduct(product)
  if (measured.confidence !== 'derived') return null
  const w = Math.round(measured.widthCm)
  const h = Math.round(measured.heightCm)
  const d = Math.round(measured.depthCm)
  return measured.round
    ? `approx. ${w} cm across x ${h} cm tall`
    : `approx. ${w} x ${h} x ${d} cm`
}
