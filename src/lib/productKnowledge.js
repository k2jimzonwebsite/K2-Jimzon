/**
 * MAP-027 — the single product-knowledge source.
 *
 * One projection serves the product page, the Interactive Shop, staff tools, and
 * later SEO. There is deliberately no second FAQ system.
 *
 * The approval gate is the point of this module. Every field and FAQ carries a
 * status, and only `approved` is ever public. AI drafting is not a publication
 * authority: a draft, a failed generation, and a skipped field all render as
 * honestly unavailable rather than as filler.
 *
 * Records come from the `product_knowledge` and `product_knowledge_faqs`
 * tables, which only staff can write and which expose approved rows alone to
 * the public. `productKnowledgeSource.js` loads them; this module caches them
 * and applies the gate again on every read, so a bug in either layer still
 * cannot publish unapproved copy.
 */

export const KNOWLEDGE_STATUS = {
  APPROVED: 'approved',
  DRAFT: 'draft',
  UNAVAILABLE: 'unavailable',
}

/** The only status that may be shown to a customer. */
const PUBLIC_STATUS = KNOWLEDGE_STATUS.APPROVED

export const UNAVAILABLE_TEXT = 'Information not available yet.'

/**
 * The knowledge cache.
 *
 * `getProductKnowledge` is called during render, so it has to be synchronous.
 * The database read is not, which is why the records live here: something
 * loads them once and primes this, and every surface then reads the same
 * snapshot. There is still exactly one knowledge source — this is its
 * in-memory form, not a second store of truth.
 *
 * Nothing here relaxes the approval gate. Records are cached exactly as the
 * database returned them, statuses included, and `selectPublicKnowledge` does
 * the filtering on every read.
 */
const cache = new Map()
let version = 0
const listeners = new Set()

/**
 * Replace the cached knowledge.
 *
 * A whole-snapshot replace rather than a merge, so copy that staff have
 * unapproved or deleted disappears on the next load instead of lingering
 * because nothing told the cache to forget it.
 */
export function primeProductKnowledge(records = []) {
  cache.clear()
  for (const record of Array.isArray(records) ? records : []) {
    const sku = String(record?.sku ?? '').trim()
    if (!sku) continue
    cache.set(sku, { fields: record.fields || {}, faqs: record.faqs || [] })
  }
  version += 1
  for (const listener of listeners) listener()
}

/** Subscription plumbing for `useProductKnowledgeVersion`. */
export function subscribeProductKnowledge(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function productKnowledgeVersion() {
  return version
}

/** Test seam: forget everything, as if nothing had ever been loaded. */
export function resetProductKnowledge() {
  cache.clear()
  version += 1
  for (const listener of listeners) listener()
}

/**
 * The only source.
 *
 * An unprimed cache is the honest empty state: before the database has
 * answered, and in any environment where no approved knowledge exists, every
 * SKU reports unavailable rather than inventing content.
 */
function readKnowledgeSource(sku) {
  return cache.get(sku) || null
}
function publicFields(fields) {
  const out = {}
  // A default parameter only covers `undefined`; a record carrying an explicit
  // null would otherwise throw inside Object.entries.
  if (!fields || typeof fields !== 'object') return out
  for (const [key, entry] of Object.entries(fields)) {
    if (entry && entry.status === PUBLIC_STATUS && String(entry.value || '').trim()) {
      out[key] = String(entry.value).trim()
    }
  }
  return out
}

function publicFaqs(faqs = []) {
  if (!Array.isArray(faqs)) return []
  return faqs
    .filter(faq => faq && faq.status === PUBLIC_STATUS)
    .filter(faq => String(faq.question || '').trim() && String(faq.answer || '').trim())
    .map(faq => ({ question: String(faq.question).trim(), answer: String(faq.answer).trim() }))
}

/**
 * The approval gate, as a pure function over a knowledge record.
 *
 * Exported separately from `getProductKnowledge` so the rule that actually
 * matters — nothing unapproved is ever public — can be tested directly against
 * any record shape, including the real database projection once it exists,
 * without depending on the environment or on which source supplied the record.
 */
export function selectPublicKnowledge(source, sku = '') {
  const fields = publicFields(source?.fields)
  const faqs = publicFaqs(source?.faqs)

  return {
    sku: String(sku ?? '').trim(),
    fields,
    faqs,
    hasFields: Object.keys(fields).length > 0,
    hasFaqs: faqs.length > 0,
    hasAny: Object.keys(fields).length > 0 || faqs.length > 0,
  }
}

/**
 * Public knowledge for one SKU.
 *
 * Always returns a usable shape. `hasAny` lets a caller choose between rendering
 * the knowledge sections and rendering a single honest unavailable state,
 * without needing to know the approval rules.
 */
export function getProductKnowledge(sku) {
  const key = String(sku ?? '').trim()
  const source = key ? readKnowledgeSource(key) : null
  return selectPublicKnowledge(source, key)
}

/**
 * Bounded context handed to staff when a customer asks about a product.
 *
 * Product identity and the customer's actual question only. No conversation
 * history, no identity, no private evidence, and no response-time promise.
 */
export function buildStaffHandoffContext(product, question = '') {
  const sku = product?.sku || product?.id || ''
  return {
    sku,
    productName: product?.name || '',
    question: String(question || '').trim(),
    origin: 'product-page',
  }
}
