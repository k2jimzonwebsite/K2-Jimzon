/**
 * MAP-027 — keeping the store stocked with more than goods.
 *
 * Inventory is the source of truth. When a product is checked in and published,
 * it appears on a shelf immediately — but it arrives bare: no description, no
 * usage notes, no answers, nothing for a search engine to read. Someone has to
 * notice and write all of that, per SKU, forever. That does not scale past a
 * few dozen lines, and what actually happens is that the shelf fills with items
 * whose panels say "Information not available yet".
 *
 * This module is the machinery that closes that gap:
 *
 *   1. `planStoreAssets` reads the catalog and reports, per product, exactly
 *      which store assets are missing. It is derived from inventory, so a new
 *      arrival appears in the plan the moment it is published.
 *   2. `buildAssetRequest` turns one gap into a request in the existing
 *      `k2.product-content.v3` contract — the same shape the product research
 *      flow already uses, so generated content has one schema, not two.
 *   3. `draftFromResearch` maps a returned document into knowledge records
 *      marked `draft`.
 *
 * Step three is the one that matters. Everything generated lands as `draft`,
 * and `productKnowledge` only ever publishes `approved`. There is no path
 * through this module that puts machine-written copy in front of a customer:
 * generation proposes, a person disposes. That is the deliberation the pipeline
 * is built around, not a checkbox bolted onto it afterwards.
 *
 * Provider-agnostic by design. Nothing here calls an API or holds a key; it
 * builds the request and consumes the response, so the transport can be wired
 * to whichever service the business chooses without touching these rules.
 */

import { KNOWLEDGE_STATUS } from './productKnowledge.js'
import { PRODUCT_RESEARCH_SCHEMA_VERSION } from '../views/admin/productResearchContract.js'

/**
 * The assets a product needs before its shelf panel is complete.
 *
 * `required` marks the ones without which the store shows an unavailable state
 * to a customer. The rest improve the listing but their absence is not a hole
 * in the shopfront.
 */
export const STORE_ASSETS = Object.freeze([
  // The shelf photograph. Not knowledge — it comes from the media uploaded
  // against the product in inventory, and it is the single asset that most
  // changes whether the store looks like a real shop: `photoTexture` wraps a
  // real photograph onto the package, and without one the item falls back to a
  // drawn label. It is checked against the product record rather than the
  // approved-knowledge projection, which is why `assetGapsFor` special-cases it.
  { key: 'image', label: 'Shelf photograph', required: true, source: 'media.primary_image' },
  { key: 'description', label: 'Shelf description', required: true, source: 'copy.card_description' },
  { key: 'uses', label: 'What you can make', required: true, source: 'usage.summary' },
  { key: 'pairings', label: 'Goes well with', required: false, source: 'usage.pairings' },
  { key: 'preparation', label: 'How to prepare it', required: false, source: 'usage.instructions' },
  { key: 'storage', label: 'Storage', required: false, source: 'usage.storage' },
  { key: 'seoTitle', label: 'SEO title', required: false, source: 'seo.seo_title' },
  { key: 'metaDescription', label: 'Meta description', required: false, source: 'seo.meta_description' },
  { key: 'faqs', label: 'Customer questions', required: false, source: 'usage.use_cases' },
])

const REQUIRED_KEYS = STORE_ASSETS.filter((asset) => asset.required).map((asset) => asset.key)

const text = (value) => String(value ?? '').trim()

/**
 * Which assets one product is missing.
 *
 * `knowledge` is the public projection — the approved-only view. Reading the
 * approved view rather than the raw record is deliberate: an asset sitting in
 * draft is still missing from the customer's point of view, and the queue
 * should keep showing it until someone actually approves it.
 */
export function assetGapsFor(product, knowledge) {
  const fields = knowledge?.fields || {}
  const gaps = []

  for (const asset of STORE_ASSETS) {
    if (asset.key === 'image') {
      // Whatever the media pipeline has stored against the product. The 3D
      // shelf reads exactly these two fields, so this reports what the customer
      // will actually see rather than what the record merely mentions.
      if (!hasShelfImage(product)) gaps.push(asset)
      continue
    }
    if (asset.key === 'faqs') {
      if (!knowledge?.hasFaqs) gaps.push(asset)
      continue
    }
    if (!text(fields[asset.key])) gaps.push(asset)
  }

  return gaps
}

/**
 * Whether this product has a photograph the store can actually put on a shelf.
 *
 * Deliberately the same two fields `photoTexture` reads. If those ever diverge,
 * the queue would tell staff a product is fine while the shelf shows a drawn
 * label instead of the goods.
 */
export function hasShelfImage(product) {
  return Boolean(text(product?.img) || text(product?.primary_image_url))
}

/**
 * Rank what to work on first.
 *
 * Two things decide urgency, and both are business facts rather than
 * preferences: a product missing a required asset is showing an unavailable
 * state to customers right now, and a product with stock on the shelf is one
 * people can actually buy. A well-documented item with no stock is the least
 * useful thing to write about.
 */
function priorityFor(product, gaps) {
  const missingRequired = gaps.some((gap) => gap.required)
  const stock = Number(product?.stock_available ?? product?.stock)
  const inStock = Number.isFinite(stock) && stock > 0

  if (missingRequired && inStock) return 'urgent'
  if (missingRequired) return 'high'
  if (gaps.length > 0 && inStock) return 'normal'
  return 'low'
}

const PRIORITY_ORDER = { urgent: 0, high: 1, normal: 2, low: 3 }

/**
 * The whole queue, derived from the catalog.
 *
 * Products with nothing missing are dropped rather than listed as complete —
 * a work queue that shows finished work is a report, and staff have to scan
 * past it every time.
 */
export function planStoreAssets(products = [], readKnowledge) {
  if (typeof readKnowledge !== 'function') {
    throw new TypeError('planStoreAssets needs a knowledge reader')
  }

  const safe = Array.isArray(products) ? products.filter(Boolean) : []
  const items = []

  for (const product of safe) {
    const sku = product?.sku || product?.id
    if (!sku) continue
    const gaps = assetGapsFor(product, readKnowledge(sku))
    if (gaps.length === 0) continue
    items.push({
      sku,
      name: product?.name || sku,
      product,
      gaps,
      missingRequired: gaps.filter((gap) => gap.required).map((gap) => gap.key),
      priority: priorityFor(product, gaps),
    })
  }

  items.sort((a, b) => {
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    return byPriority !== 0 ? byPriority : a.name.localeCompare(b.name)
  })

  return {
    items,
    total: items.length,
    urgent: items.filter((item) => item.priority === 'urgent').length,
    blockingCustomers: items.filter((item) => item.missingRequired.length > 0).length,
  }
}

/**
 * A generation request for one product.
 *
 * Carries only what the catalog already knows, which is what stops the
 * generator inventing a different product. `facts` is explicitly labelled as
 * established so a prompt can instruct the model to treat it as fixed rather
 * than as a suggestion, and `missing` scopes the work to the actual gaps
 * instead of regenerating fields a person has already approved.
 */
export function buildAssetRequest(planItem) {
  const product = planItem?.product || {}
  return {
    schema_version: PRODUCT_RESEARCH_SCHEMA_VERSION,
    sku: planItem?.sku || '',
    // Established facts. Not to be contradicted or embellished.
    hasShelfImage: hasShelfImage(product),
    facts: {
      name: text(product.name),
      brand_name: text(product.brand_id),
      barcode: text(product.barcode),
      net_weight: text(product.net_weight || product.size),
      package_type: text(product.package_type),
      category: text(product.category),
      origin: text(product.country_of_origin || product.origin),
      ingredients: text(product.ingredients),
      allergens: text(product.allergens),
    },
    // Only the gaps. Approved copy is never re-requested.
    missing: (planItem?.gaps || []).map((gap) => ({
      field: gap.key,
      label: gap.label,
      target: gap.source,
      required: gap.required,
    })),
    constraints: [
      'Use only the established facts. Do not invent certifications, awards, health claims, or origin stories.',
      'Do not state stock, price, delivery time, or availability.',
      'If a fact is not supplied, omit the field rather than guessing it.',
      'Write for a Philippine customer buying an imported Italian product.',
    ],
  }
}

/** Pull a value out of the research document for one asset key. */
function valueForAsset(key, research) {
  const copy = research?.copy || {}
  const usage = research?.usage || {}
  const seo = research?.seo || {}

  switch (key) {
    case 'description':
      return text(copy.card_description) || text(copy.full_description)
    case 'uses': {
      if (text(usage.summary)) return text(usage.summary)
      const cases = Array.isArray(usage.use_cases) ? usage.use_cases : []
      return cases.map((entry) => text(entry?.title)).filter(Boolean).join('. ')
    }
    case 'pairings':
      return (Array.isArray(usage.pairings) ? usage.pairings : []).map(text).filter(Boolean).join(', ')
    case 'preparation': {
      const instructions = Array.isArray(usage.instructions) ? usage.instructions : []
      const first = instructions.find((entry) => Array.isArray(entry?.steps) && entry.steps.length > 0)
      return first ? first.steps.map(text).filter(Boolean).join(' ') : ''
    }
    case 'storage':
      return text(usage.storage)
    case 'seoTitle':
      return text(seo.seo_title)
    case 'metaDescription':
      return text(seo.meta_description)
    default:
      return ''
  }
}

/**
 * Turn a returned research document into knowledge records awaiting review.
 *
 * Every produced field is stamped `draft` and carries its provenance, so a
 * reviewer can see that a machine wrote it and what it was derived from. An
 * empty value is dropped rather than stored as an empty draft — a blank row in
 * a review queue costs a person time and teaches them nothing.
 *
 * This function cannot mark anything approved. Approval is a human action taken
 * against these records, and keeping the two apart is what makes the gate real
 * rather than a naming convention.
 */
export function draftFromResearch(research, { generatedAt = new Date().toISOString(), model = '' } = {}) {
  const fields = {}

  for (const asset of STORE_ASSETS) {
    if (asset.key === 'faqs') continue
    const value = valueForAsset(asset.key, research)
    if (!value) continue
    fields[asset.key] = {
      status: KNOWLEDGE_STATUS.DRAFT,
      value,
      provenance: { source: 'generated', model, generatedAt, contract: PRODUCT_RESEARCH_SCHEMA_VERSION },
    }
  }

  const useCases = Array.isArray(research?.usage?.use_cases) ? research.usage.use_cases : []
  const faqs = useCases
    .filter((entry) => text(entry?.title) && text(entry?.best_for))
    .map((entry) => ({
      status: KNOWLEDGE_STATUS.DRAFT,
      question: text(entry.title),
      answer: text(entry.best_for),
      provenance: { source: 'generated', model, generatedAt, contract: PRODUCT_RESEARCH_SCHEMA_VERSION },
    }))

  return { fields, faqs }
}

/**
 * Approve one drafted field.
 *
 * Records who approved it and when. A reviewer who edits the text before
 * approving is the author of the result, and the provenance says so — the
 * distinction matters when someone later asks where a product claim came from.
 */
export function approveDraft(record, { value, approvedBy = '', approvedAt = new Date().toISOString() } = {}) {
  const edited = text(value)
  if (!edited) return record
  const wasEdited = edited !== text(record?.value)

  return {
    ...record,
    status: KNOWLEDGE_STATUS.APPROVED,
    value: edited,
    provenance: {
      ...(record?.provenance || {}),
      source: wasEdited ? 'generated-edited' : 'generated-approved',
      approvedBy,
      approvedAt,
    },
  }
}
