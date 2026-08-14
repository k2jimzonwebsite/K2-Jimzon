export const PRODUCT_RESEARCH_SCHEMA_VERSION = 'k2.product-content.v3'
export const PRODUCT_RESEARCH_LEGACY_VERSION = 'k2.product-research.v2'

export const PRODUCT_RESEARCH_COMMANDS = Object.freeze({
  json: 'PRODUCT_JSON',
  primary: 'PRIMARY',
  after: 'AFTER',
})

export const PRODUCT_RESEARCH_TEMPLATE = Object.freeze({
  schema_version: PRODUCT_RESEARCH_SCHEMA_VERSION,
  product: {
    barcode: null,
    name: '',
    short_name: '',
    brand_name: '',
    variant: '',
    net_weight: null,
    package_type: null,
    category: '',
    subcategory: '',
    origin: null,
    ingredients: [],
    allergens: [],
  },
  copy: {
    card_description: '',
    full_description: '',
    key_highlights: [],
    why_buy: '',
    why_rare: null,
  },
  seo: {
    seo_title: '',
    meta_description: '',
    page_heading: '',
    supporting_heading: '',
    search_keywords: [],
  },
  usage: {
    summary: null,
    use_cases: [
      {
        title: '',
        best_for: null,
      },
    ],
    instructions: [
      {
        title: '',
        amount_or_ratio: null,
        steps: [],
        expected_result: null,
      },
    ],
    pairings: [],
    storage: null,
    warnings: [],
  },
  media: {
    primary_alt_text: '',
    primary_composition: '',
    after_alt_text: '',
    after_scene: '',
    after_truth_constraints: [],
  },
  verification: {
    sources: [
      {
        fields: ['product.name'],
        source_type: 'package_image',
        reference: 'upload:front',
        confidence: 'high',
      },
    ],
    unknown_fields: [],
    review_notes: [],
  },
})

const V3_TOP_LEVEL_KEYS = new Set([
  'schema_version', 'product', 'copy', 'seo', 'usage', 'media', 'verification',
])

const V3_KEYS = Object.freeze({
  product: new Set([
    'barcode', 'name', 'short_name', 'brand_name', 'variant', 'net_weight',
    'package_type', 'category', 'subcategory', 'origin', 'ingredients', 'allergens',
  ]),
  copy: new Set(['card_description', 'full_description', 'key_highlights', 'why_buy', 'why_rare']),
  seo: new Set(['seo_title', 'meta_description', 'page_heading', 'supporting_heading', 'search_keywords']),
  usage: new Set(['summary', 'use_cases', 'instructions', 'pairings', 'storage', 'warnings']),
  useCase: new Set(['title', 'best_for']),
  instruction: new Set(['title', 'amount_or_ratio', 'steps', 'expected_result']),
  media: new Set([
    'primary_alt_text', 'primary_composition', 'after_alt_text', 'after_scene',
    'after_truth_constraints',
  ]),
  verification: new Set(['sources', 'unknown_fields', 'review_notes']),
  source: new Set(['fields', 'source_type', 'reference', 'confidence']),
})

const PROHIBITED_KEYS = new Set([
  'sku', 'id', 'product_id', 'slug', 'status', 'published', 'is_human_reviewed',
  'stock', 'stock_available', 'quantity', 'price', 'cost_price', 'srp',
  'retail_price', 'wholesale_price', 'dealer_price', 'promo_price',
  'expiry_date', 'best_before_date', 'batch', 'lot', 'delivery',
  'marketplace_availability', 'availability',
])

const SOURCE_TYPES = new Set(['package_image', 'manufacturer', 'official_regulatory', 'official_distributor'])
const CONFIDENCE_VALUES = new Set(['high', 'medium', 'low'])

function cleanJsonInput(value) {
  let clean = String(value || '').trim()
  if (!clean) throw new Error('Paste the product JSON returned by the K2 Product Content Project.')

  if (clean.startsWith('```')) {
    const firstNewline = clean.indexOf('\n')
    const lastFence = clean.lastIndexOf('```')
    if (firstNewline < 0 || lastFence <= firstNewline) {
      throw new Error('The JSON code block is incomplete. Copy the complete response and try again.')
    }
    clean = clean.slice(firstNewline + 1, lastFence).trim()
  }

  const parsed = JSON.parse(clean)
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('The response must be one JSON object, not a list or plain text.')
  }
  return parsed
}

function assertObject(value, label) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error(`${label} must be a JSON object.`)
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a JSON array.`)
}

function assertText(value, label, maxLength = null) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`)
  if (maxLength && value.trim().length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`)
  }
}

function assertNullableText(value, label, maxLength = null) {
  if (value === null) return
  assertText(value, label, maxLength)
}

function assertOnlyKeys(value, allowed, label) {
  const unexpected = Object.keys(value).find(key => !allowed.has(key))
  if (unexpected) {
    throw new Error(`Unexpected field ${label}.${unexpected}. Ask ChatGPT to use the exact K2 schema.`)
  }
}

function assertTextArray(value, label, maxItems = null) {
  assertArray(value, label)
  if (maxItems && value.length > maxItems) throw new Error(`${label} may contain at most ${maxItems} items.`)
  value.forEach((item, index) => assertText(item, `${label}[${index}]`))
}

function findProhibitedKey(value, path = '$') {
  if (!value || typeof value !== 'object') return null
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`
    if (PROHIBITED_KEYS.has(key)) return childPath
    const nested = findProhibitedKey(child, childPath)
    if (nested) return nested
  }
  return null
}

function validateV3(envelope) {
  if (envelope.schema_version !== PRODUCT_RESEARCH_SCHEMA_VERSION) {
    throw new Error(`Unsupported schema version. Expected ${PRODUCT_RESEARCH_SCHEMA_VERSION}.`)
  }

  assertOnlyKeys(envelope, V3_TOP_LEVEL_KEYS, '$')
  const prohibitedPath = findProhibitedKey(envelope)
  if (prohibitedPath) {
    throw new Error(`${prohibitedPath} is not allowed. ChatGPT cannot assign SKU, URL slug, price, stock, expiry, or publication state.`)
  }

  assertObject(envelope.product, 'product')
  assertObject(envelope.copy, 'copy')
  assertObject(envelope.seo, 'seo')
  assertObject(envelope.usage, 'usage')
  assertObject(envelope.media, 'media')
  assertObject(envelope.verification, 'verification')
  assertOnlyKeys(envelope.product, V3_KEYS.product, 'product')
  assertOnlyKeys(envelope.copy, V3_KEYS.copy, 'copy')
  assertOnlyKeys(envelope.seo, V3_KEYS.seo, 'seo')
  assertOnlyKeys(envelope.usage, V3_KEYS.usage, 'usage')
  assertOnlyKeys(envelope.media, V3_KEYS.media, 'media')
  assertOnlyKeys(envelope.verification, V3_KEYS.verification, 'verification')

  assertNullableText(envelope.product.barcode, 'product.barcode', 32)
  assertText(envelope.product.name, 'product.name', 140)
  assertText(envelope.product.short_name, 'product.short_name', 70)
  assertText(envelope.product.brand_name, 'product.brand_name', 80)
  assertText(envelope.product.variant, 'product.variant', 100)
  assertNullableText(envelope.product.net_weight, 'product.net_weight', 50)
  assertNullableText(envelope.product.package_type, 'product.package_type', 60)
  assertText(envelope.product.category, 'product.category', 80)
  assertText(envelope.product.subcategory, 'product.subcategory', 80)
  assertNullableText(envelope.product.origin, 'product.origin', 100)
  assertTextArray(envelope.product.ingredients, 'product.ingredients')
  assertTextArray(envelope.product.allergens, 'product.allergens')

  assertText(envelope.copy.card_description, 'copy.card_description', 180)
  assertText(envelope.copy.full_description, 'copy.full_description', 650)
  assertTextArray(envelope.copy.key_highlights, 'copy.key_highlights', 5)
  if (envelope.copy.key_highlights.length < 2) throw new Error('copy.key_highlights must contain at least two useful points.')
  assertText(envelope.copy.why_buy, 'copy.why_buy', 140)
  assertNullableText(envelope.copy.why_rare, 'copy.why_rare', 180)

  assertText(envelope.seo.seo_title, 'seo.seo_title', 60)
  assertText(envelope.seo.meta_description, 'seo.meta_description', 160)
  assertText(envelope.seo.page_heading, 'seo.page_heading', 90)
  assertText(envelope.seo.supporting_heading, 'seo.supporting_heading', 140)
  assertTextArray(envelope.seo.search_keywords, 'seo.search_keywords', 8)
  if (envelope.seo.search_keywords.length < 3) throw new Error('seo.search_keywords must contain at least three specific phrases.')

  assertNullableText(envelope.usage.summary, 'usage.summary', 240)
  assertArray(envelope.usage.use_cases, 'usage.use_cases')
  assertArray(envelope.usage.instructions, 'usage.instructions')
  assertTextArray(envelope.usage.pairings, 'usage.pairings', 3)
  assertNullableText(envelope.usage.storage, 'usage.storage', 300)
  assertTextArray(envelope.usage.warnings, 'usage.warnings', 8)
  if (envelope.usage.use_cases.length > 3) throw new Error('usage.use_cases may contain at most three cases.')
  if (envelope.usage.instructions.length > 3) throw new Error('usage.instructions may contain at most three procedures.')

  envelope.usage.use_cases.forEach((useCase, index) => {
    assertObject(useCase, `usage.use_cases[${index}]`)
    assertOnlyKeys(useCase, V3_KEYS.useCase, `usage.use_cases[${index}]`)
    assertText(useCase.title, `usage.use_cases[${index}].title`, 100)
    assertNullableText(useCase.best_for, `usage.use_cases[${index}].best_for`, 180)
  })

  envelope.usage.instructions.forEach((instruction, index) => {
    assertObject(instruction, `usage.instructions[${index}]`)
    assertOnlyKeys(instruction, V3_KEYS.instruction, `usage.instructions[${index}]`)
    assertText(instruction.title, `usage.instructions[${index}].title`, 100)
    assertNullableText(instruction.amount_or_ratio, `usage.instructions[${index}].amount_or_ratio`, 120)
    assertTextArray(instruction.steps, `usage.instructions[${index}].steps`, 6)
    assertNullableText(instruction.expected_result, `usage.instructions[${index}].expected_result`, 220)
  })

  assertText(envelope.media.primary_alt_text, 'media.primary_alt_text', 180)
  assertText(envelope.media.primary_composition, 'media.primary_composition', 320)
  assertText(envelope.media.after_alt_text, 'media.after_alt_text', 180)
  assertText(envelope.media.after_scene, 'media.after_scene', 360)
  assertTextArray(envelope.media.after_truth_constraints, 'media.after_truth_constraints', 6)

  assertArray(envelope.verification.sources, 'verification.sources')
  assertTextArray(envelope.verification.unknown_fields, 'verification.unknown_fields')
  assertTextArray(envelope.verification.review_notes, 'verification.review_notes')
  envelope.verification.sources.forEach((source, index) => {
    assertObject(source, `verification.sources[${index}]`)
    assertOnlyKeys(source, V3_KEYS.source, `verification.sources[${index}]`)
    assertTextArray(source.fields, `verification.sources[${index}].fields`)
    if (!SOURCE_TYPES.has(source.source_type)) throw new Error(`verification.sources[${index}].source_type is not approved.`)
    assertText(source.reference, `verification.sources[${index}].reference`)
    if (!CONFIDENCE_VALUES.has(source.confidence)) {
      throw new Error(`verification.sources[${index}].confidence must be high, medium, or low.`)
    }
  })
}

function formatUsageV3(usage) {
  const sections = []
  if (usage.summary) sections.push(usage.summary.trim())

  if (usage.use_cases.length) {
    const uses = usage.use_cases.map(useCase => (
      `- ${useCase.title.trim()}${useCase.best_for ? ` — ${useCase.best_for.trim()}` : ''}`
    ))
    sections.push(`Suitable uses\n${uses.join('\n')}`)
  }

  usage.instructions.forEach(instruction => {
    const lines = [instruction.title.trim()]
    if (instruction.amount_or_ratio) lines.push(`Amount or ratio: ${instruction.amount_or_ratio.trim()}`)
    instruction.steps.forEach((step, index) => lines.push(`${index + 1}. ${step.trim()}`))
    if (instruction.expected_result) lines.push(`Expected result: ${instruction.expected_result.trim()}`)
    sections.push(lines.join('\n'))
  })

  if (usage.warnings.length) sections.push(`Warnings\n${usage.warnings.map(item => `- ${item}`).join('\n')}`)
  return sections.join('\n\n')
}

function normalizeV3(envelope) {
  const firstResult = envelope.usage.instructions.find(item => item.expected_result)?.expected_result || ''
  const sourceUrls = envelope.verification.sources
    .map(item => item.reference)
    .filter(reference => /^https?:\/\//i.test(reference))

  return {
    product: {
      barcode: envelope.product.barcode,
      name: envelope.product.name,
      short: envelope.product.short_name,
      brand: envelope.product.brand_name,
      brand_id: envelope.product.brand_name,
      category: envelope.product.category,
      subcategory: envelope.product.subcategory,
      origin: envelope.product.origin,
      net_weight: envelope.product.net_weight,
      package_type: envelope.product.package_type,
      size: envelope.product.variant,
      inside: envelope.copy.full_description,
      description: envelope.copy.full_description,
      card_description: envelope.copy.card_description,
      key_highlights: envelope.copy.key_highlights,
      whyBuy: envelope.copy.why_buy,
      why_buy: envelope.copy.why_buy,
      whyRare: envelope.copy.why_rare,
      why_rare: envelope.copy.why_rare,
      usage_instructions: formatUsageV3(envelope.usage),
      usage_summary: envelope.usage.summary,
      use_cases: envelope.usage.use_cases,
      instruction_sets: envelope.usage.instructions,
      storage_instructions: envelope.usage.storage,
      ingredients: envelope.product.ingredients.join(', '),
      allergens: envelope.product.allergens.join(', '),
      finished_product_details: firstResult,
      pairings: envelope.usage.pairings,
      seo_title: envelope.seo.seo_title,
      meta_description: envelope.seo.meta_description,
      page_heading: envelope.seo.page_heading,
      supporting_heading: envelope.seo.supporting_heading,
      seo_keywords: envelope.seo.search_keywords,
      source_urls: sourceUrls,
      review_notes: envelope.verification.review_notes,
      unknown_fields: envelope.verification.unknown_fields,
    },
    meta: {
      schemaVersion: envelope.schema_version,
      legacy: false,
      evidenceCount: envelope.verification.sources.length,
      unknownFields: envelope.verification.unknown_fields,
      reviewNotes: envelope.verification.review_notes,
      sources: envelope.verification.sources,
      media: envelope.media,
    },
    warnings: envelope.verification.unknown_fields.length
      ? [`${envelope.verification.unknown_fields.length} field(s) still need manual verification.`]
      : [],
  }
}

function normalizeV2(envelope) {
  assertObject(envelope.request, 'request')
  assertObject(envelope.product, 'product')
  assertObject(envelope.usage, 'usage')
  assertObject(envelope.media, 'media')
  assertArray(envelope.usage.use_cases, 'usage.use_cases')
  assertArray(envelope.usage.warnings, 'usage.warnings')
  assertArray(envelope.evidence, 'evidence')
  assertArray(envelope.unknown_fields, 'unknown_fields')
  assertArray(envelope.review_notes, 'review_notes')
  const prohibitedPath = findProhibitedKey(envelope)
  if (prohibitedPath) throw new Error(`${prohibitedPath} is not allowed.`)
  assertText(envelope.product.name, 'product.name')

  const oldUsage = []
  if (envelope.usage.summary) oldUsage.push(envelope.usage.summary)
  envelope.usage.use_cases.forEach(useCase => {
    const lines = [useCase.title]
    if (useCase.best_for) lines.push(`Best for: ${useCase.best_for}`)
    if (useCase.amount_or_ratio) lines.push(`Amount or ratio: ${useCase.amount_or_ratio}`)
    ;(useCase.steps || []).forEach((step, index) => lines.push(`${index + 1}. ${step}`))
    if (useCase.expected_result) lines.push(`Expected result: ${useCase.expected_result}`)
    oldUsage.push(lines.join('\n'))
  })
  const sourceUrls = envelope.evidence
    .map(item => item.source_reference)
    .filter(reference => /^https?:\/\//i.test(reference))

  return {
    product: {
      barcode: envelope.request.barcode || null,
      name: envelope.product.name,
      short: envelope.product.short_name || '',
      brand: envelope.product.brand_name || '',
      brand_id: envelope.product.brand_name || '',
      category: envelope.product.category_hint || '',
      subcategory: envelope.product.subcategory_hint || envelope.product.category_hint || '',
      origin: envelope.product.origin,
      net_weight: envelope.product.net_weight,
      package_type: envelope.product.package_type,
      size: envelope.product.variant,
      inside: envelope.product.description,
      description: envelope.product.description,
      card_description: envelope.product.description,
      key_highlights: [],
      whyBuy: envelope.product.why_buy,
      why_buy: envelope.product.why_buy,
      whyRare: envelope.product.why_rare,
      why_rare: envelope.product.why_rare,
      usage_instructions: oldUsage.join('\n\n'),
      storage_instructions: envelope.product.storage_instructions,
      ingredients: envelope.product.ingredients,
      allergens: envelope.product.allergens,
      finished_product_details: envelope.usage.use_cases.find(item => item.expected_result)?.expected_result || '',
      pairings: envelope.product.pairings,
      seo_keywords: [],
      source_urls: sourceUrls,
      review_notes: envelope.review_notes,
      unknown_fields: envelope.unknown_fields,
    },
    meta: {
      schemaVersion: envelope.schema_version,
      legacy: true,
      evidenceCount: envelope.evidence.length,
      unknownFields: envelope.unknown_fields,
      reviewNotes: envelope.review_notes,
      sources: envelope.evidence,
      media: envelope.media,
    },
    warnings: ['Version 2 JSON accepted for compatibility. Regenerate with the Product Content v3 Project before bulk intake.'],
  }
}

function normalizeUnversioned(product) {
  if (!product.name && !product.product_name) throw new Error('Legacy JSON is missing the required name field.')
  return {
    product,
    meta: {
      schemaVersion: 'legacy-unversioned',
      legacy: true,
      evidenceCount: Array.isArray(product.source_urls) ? product.source_urls.length : 0,
      unknownFields: [],
      reviewNotes: Array.isArray(product.review_notes) ? product.review_notes : [],
      sources: [],
      media: null,
    },
    warnings: ['Legacy JSON accepted for compatibility. Recheck content, usage, SEO, evidence, SKU, and both images manually.'],
  }
}

export function parseProductResearchPaste(value) {
  let parsed
  try {
    parsed = cleanJsonInput(value)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON. Paste only the complete JSON object returned for PRODUCT_JSON.')
    }
    throw error
  }

  if (!parsed.schema_version) return normalizeUnversioned(parsed)
  if (parsed.schema_version === PRODUCT_RESEARCH_LEGACY_VERSION) return normalizeV2(parsed)
  validateV3(parsed)
  return normalizeV3(parsed)
}
