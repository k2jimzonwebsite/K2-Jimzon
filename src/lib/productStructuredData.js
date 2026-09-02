/**
 * MAP-027 — one builder for product structured data.
 *
 * The product page and the virtual store both describe the same item to a
 * search engine. Two builders would eventually disagree, and a disagreement here
 * is a rich-result penalty rather than a cosmetic bug — Google compares the
 * markup against the rendered page and drops the listing when they diverge.
 *
 * Every value comes from the canonical catalog projection or the approved
 * knowledge projection. Nothing is invented for SEO: no aggregate rating we do
 * not collect, no review count, no fabricated GTIN, no availability we have not
 * established. A missing field is omitted, which is a valid document; a guessed
 * field is a false claim about a real product.
 */

/** Schema.org will reject a key with an undefined value, so they are stripped. */
function compact(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

/**
 * Availability, mapped from the same stock projection the shelf reads.
 *
 * An unknown stock figure becomes `undefined` rather than `OutOfStock`. Telling
 * a search engine an item is unavailable because our own projection was slow
 * would suppress a listing for a product sitting in the Manila room.
 */
function availabilityFor(product) {
  const raw = product?.stock_available ?? product?.stock
  if (raw === null || raw === undefined || raw === '') return undefined
  const quantity = Number(raw)
  if (!Number.isFinite(quantity)) return undefined
  return quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
}

/**
 * Product markup for one catalog item.
 *
 * `description` and `image` are passed in rather than derived, because the two
 * calling surfaces already resolve them — the product page against its own
 * copy, the store against the approved knowledge projection — and resolving
 * them twice is how the two would drift apart.
 */
export function buildProductStructuredData({ product, description, image, url }) {
  if (!product) return null

  const price = Number(product.srp ?? product.retail)
  const sku = product.sku || product.id

  return compact({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku,
    description,
    image: image ? [image] : undefined,
    brand: product.brand_id ? { '@type': 'Brand', name: product.brand_id } : undefined,
    countryOfOrigin: product.country_of_origin || undefined,
    // `gtin13` is only emitted for a barcode that is actually thirteen digits.
    // A malformed GTIN invalidates the whole offer in Search Console.
    gtin13: /^\d{13}$/.test(String(product.barcode || '')) ? String(product.barcode) : undefined,
    weight: product.net_weight
      ? { '@type': 'QuantitativeValue', name: String(product.net_weight) }
      : undefined,
    offers: compact({
      '@type': 'Offer',
      url,
      price: Number.isFinite(price) && price > 0 ? price.toFixed(2) : undefined,
      priceCurrency: 'PHP',
      availability: availabilityFor(product),
      itemCondition: 'https://schema.org/NewCondition',
    }),
  })
}

/**
 * FAQ markup.
 *
 * Only ever built from approved entries — the caller passes the output of the
 * knowledge projection, which has already applied the approval gate. Returns
 * null for an empty set rather than an empty `FAQPage`, which Search Console
 * reports as an error.
 */
export function buildFaqStructuredData(faqs = []) {
  const entries = (Array.isArray(faqs) ? faqs : [])
    .filter((faq) => faq?.question && faq?.answer)
    .map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    }))

  if (entries.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries,
  }
}

/**
 * Breadcrumb trail for a product page.
 *
 * Google renders this as the path shown above a result instead of a bare URL,
 * which is worth more on a catalog where every product URL is an opaque SKU.
 * Only emitted when the trail actually resolves to real pages: a breadcrumb
 * pointing at a category route the storefront does not serve would be markup
 * describing navigation that does not exist.
 */
export function buildBreadcrumbStructuredData({ product, origin, url }) {
  if (!product || !origin || !url) return null

  const items = [
    { name: 'Home', item: new URL('/', origin).href },
    { name: 'Catalog', item: new URL('/catalog', origin).href },
    { name: product.name, item: url },
  ].filter((entry) => entry.name)

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  }
}

/**
 * Write a JSON-LD block into the document head, keyed by a marker attribute./**
 * Write a JSON-LD block into the document head, keyed by a marker attribute.
 *
 * Passing `null` removes the block. That is the important half: a stale Product
 * block left behind after the customer deselects an item would describe a page
 * that no longer shows that product.
 */
export function writeJsonLd(marker, payload) {
  if (typeof document === 'undefined') return
  const selector = `script[${marker}]`
  const existing = document.head.querySelector(selector)

  if (!payload) {
    existing?.remove()
    return
  }

  const node = existing || document.createElement('script')
  if (!existing) {
    node.type = 'application/ld+json'
    node.setAttribute(marker, '')
    document.head.appendChild(node)
  }
  node.textContent = JSON.stringify(payload)
}
