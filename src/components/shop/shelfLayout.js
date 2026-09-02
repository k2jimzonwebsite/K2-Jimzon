/**
 * MAP-027 — how goods are arranged on a plank.
 *
 * The earlier shelf spread a fixed six products evenly across every board,
 * which is why it read as a display case rather than a shop: real shelves are
 * packed by width, not by count, and a well-stocked one is full.
 *
 * Two rules do most of the work here.
 *
 * Packing by measured width means a row holds as many items as physically fit —
 * eleven chocolate bars or three coffee bags, decided by the same arithmetic a
 * planogram uses.
 *
 * Facings mean a product in depth stock occupies several adjacent slots, the
 * way a supermarket blocks its fast movers. This is what makes the run look
 * stocked instead of sparse, and it is derived from real stock rather than
 * padded with decoration — an item down to its last unit gets a single facing,
 * and the gap that leaves on the shelf is true.
 *
 * Pure functions. No three.js, no DOM.
 */

import { measureForScene } from './productDimensions.js'
import { stockState } from './shelfModel.js'

/** Breathing room between neighbouring packages, in scene units (~2.6 cm). */
const GAP = 0.2

/** Clearance kept at each end of a board so goods never overhang the pilasters. */
const EDGE_INSET = 0.9

/**
 * How many adjacent slots one product occupies.
 *
 * Deep stock earns more shelf face, which is both how real merchandising works
 * and what stops a four-item category looking abandoned. Capped at four so one
 * heavily stocked line cannot take an entire bay.
 */
export function facingsFor(product, measurement) {
  const stock = stockState(product)
  if (stock.tone === 'out') return 1
  const quantity = Number(product?.stock_available ?? product?.stock)

  let facings = 1
  if (Number.isFinite(quantity)) {
    if (quantity >= 40) facings = 4
    else if (quantity >= 20) facings = 3
    else if (quantity >= 8) facings = 2
  }

  // A narrow item needs more facings to hold the same shelf space; a wide one
  // already fills it. Without this, a shelf of chocolate bars still looks bare.
  if (measurement.width < 0.55) facings += 1
  return Math.min(4, facings)
}

/**
 * Pack products into rows that fit the bay.
 *
 * Greedy left-to-right, which is what a shelf-stacker does: keep placing until
 * the next item will not fit, then start the row below. A single item wider
 * than the whole bay still gets its own row rather than being dropped.
 */
export function packRows(products = [], bayWidth = 15, maxRows = Infinity) {
  const usable = bayWidth - EDGE_INSET * 2
  const safe = Array.isArray(products) ? products.filter(Boolean) : []

  const rows = []
  let row = []
  let used = 0

  const flush = () => {
    if (row.length) rows.push(row)
    row = []
    used = 0
  }

  for (const product of safe) {
    const measurement = measureForScene(product)
    const facings = facingsFor(product, measurement)
    const slotWidth = measurement.width + GAP
    const blockWidth = slotWidth * facings

    if (used > 0 && used + blockWidth > usable) {
      flush()
      if (rows.length >= maxRows) break
    }

    row.push({ product, measurement, facings, blockWidth })
    used += blockWidth
  }
  flush()

  return rows.slice(0, Number.isFinite(maxRows) ? maxRows : rows.length).map(centreRow(usable))
}

/**
 * Turn a packed row into positioned facings.
 *
 * Rows are centred rather than left-aligned so a half-full board reads as a
 * shelf with room on it, not as goods shoved against one pilaster.
 */
function centreRow(usable) {
  return (row) => {
    const total = row.reduce((sum, entry) => sum + entry.blockWidth, 0)
    let cursor = -Math.min(total, usable) / 2

    const items = []
    for (const entry of row) {
      const slotWidth = entry.measurement.width + GAP
      for (let facing = 0; facing < entry.facings; facing += 1) {
        items.push({
          product: entry.product,
          measurement: entry.measurement,
          // Only the front-left facing is interactive and lit as the selection;
          // the rest are the same product standing behind it on the shelf.
          isPrimary: facing === 0,
          facingIndex: facing,
          x: cursor + slotWidth / 2,
        })
        cursor += slotWidth
      }
    }
    return { items, tallest: Math.max(...row.map((entry) => entry.measurement.height), 0) }
  }
}
