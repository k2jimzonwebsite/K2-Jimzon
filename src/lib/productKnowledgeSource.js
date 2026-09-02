import { primeProductKnowledge } from './productKnowledge.js'

/**
 * MAP-027 — loading approved product knowledge from the database.
 *
 * Two tables, read the same way the storefront reads the catalog: directly,
 * under row-level security. The public policy on both returns approved rows
 * only, so an anonymous visitor cannot see a draft even if this code asked for
 * one. Staff sessions see everything, which is what the Store Asset Studio
 * needs to show what is still waiting for review.
 *
 * A read failure is not an error state worth showing a customer. Knowledge is
 * additive: without it a product panel says the information is not available
 * yet, which is exactly what it should say when the read fails too.
 */

/** Rows to a record shape, keyed by SKU. */
export function groupKnowledgeRows(fieldRows = [], faqRows = []) {
  const bySku = new Map()
  const record = (sku) => {
    if (!bySku.has(sku)) bySku.set(sku, { sku, fields: {}, faqs: [] })
    return bySku.get(sku)
  }

  for (const row of fieldRows || []) {
    const sku = String(row?.sku ?? '').trim()
    const key = String(row?.field_key ?? '').trim()
    if (!sku || !key) continue
    record(sku).fields[key] = { status: row.status, value: row.value }
  }

  for (const row of [...(faqRows || [])].sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0))) {
    const sku = String(row?.sku ?? '').trim()
    if (!sku) continue
    record(sku).faqs.push({ status: row.status, question: row.question, answer: row.answer })
  }

  return [...bySku.values()]
}

/**
 * The development seed, and why it is loaded this way.
 *
 * `import.meta.env.DEV` is the exact expression Vite substitutes, so in a
 * production build this reads `if (!false) return []` and the dynamic import
 * below becomes unreachable — Rollup then drops the seed module from the
 * bundle rather than shipping its text as dead data.
 *
 * It only fills SKUs the database returned nothing for. A product that has a
 * real record is never seeded over, so local work cannot quietly disagree with
 * what staff actually approved.
 */
async function developmentSeed(existing) {
  if (!import.meta.env.DEV) return []
  try {
    const { DEV_SEED } = await import('./productKnowledgeDevSeed.js')
    return Object.entries(DEV_SEED)
      .filter(([sku]) => !existing.has(sku))
      .map(([sku, record]) => ({ sku, fields: record.fields, faqs: record.faqs }))
  } catch {
    return []
  }
}

/**
 * Load every approved record and prime the shared cache.
 *
 * Loads the whole set rather than one SKU at a time: the catalog is small, the
 * shop needs many products' knowledge at once to build its shelves, and one
 * read is cheaper than one request per panel.
 */
export async function loadProductKnowledge(client) {
  let records = []
  if (client) {
    const [fieldResult, faqResult] = await Promise.all([
      client.from('product_knowledge').select('sku,field_key,status,value'),
      client.from('product_knowledge_faqs').select('sku,position,status,question,answer'),
    ])
    // Either read can fail on its own — most likely because the migration has
    // not been applied yet. Whatever did come back is still usable.
    records = groupKnowledgeRows(
      fieldResult?.error ? [] : fieldResult?.data,
      faqResult?.error ? [] : faqResult?.data,
    )
  }

  const seeded = await developmentSeed(new Set(records.map((record) => record.sku)))
  primeProductKnowledge([...records, ...seeded])
  return records.length
}
