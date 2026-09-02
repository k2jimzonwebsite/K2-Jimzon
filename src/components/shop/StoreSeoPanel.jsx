import { useEffect, useMemo } from 'react'
import { getProductKnowledge } from '../../lib/productKnowledge'
import { useProductKnowledgeVersion } from '../../lib/useProductKnowledgeVersion'
import { describeMeasurement } from './productDimensions'
import {
  buildFaqStructuredData, buildProductStructuredData, writeJsonLd,
} from '../../lib/productStructuredData'
import { resolveStorefrontMetadataOrigin } from '../../lib/storefrontMetadataOrigin'

/**
 * MAP-027 — the store's indexable layer.
 *
 * A 3D canvas is invisible to a crawler. Everything a search engine could learn
 * from watching someone shop here has to be stated in the document, which is
 * what this does: readable specifics for the customer, and the matching
 * structured data in the head for the crawler, built from the same values.
 *
 * The rule that keeps it honest is that both halves read the same projections
 * the rest of the store reads. There is no SEO-only description, no keyword
 * block, and no claim — rating, review count, GTIN, availability — that the
 * catalog has not established. Markup that overstates the page is a manual
 * action, not a growth tactic.
 *
 * Derived pack dimensions are labelled as approximate and only shown when they
 * were actually derived from a declared quantity, never when assumed.
 */

/** Facts worth stating, in the order a shopper scans them. */
function detailRows(product) {
  const measurement = describeMeasurement(product)
  return [
    ['Brand', product?.brand_id],
    ['Origin', product?.country_of_origin || product?.origin],
    ['Pack size', product?.size || product?.net_weight],
    ['Pack dimensions', measurement],
    ['Barcode', product?.barcode],
  ].filter(([, value]) => Boolean(value))
}

export default function StoreSeoPanel({ product }) {
  const sku = product?.sku || product?.id || ''
  const knowledgeVersion = useProductKnowledgeVersion()
  const knowledge = useMemo(() => getProductKnowledge(sku), [sku, knowledgeVersion])

  useEffect(() => {
    // Nothing selected means the store is not showing a product, so any markup
    // left from the previous selection would describe the wrong thing.
    if (!product) {
      writeJsonLd('data-k2-store-product-jsonld', null)
      writeJsonLd('data-k2-store-faq-jsonld', null)
      return undefined
    }

    const origin = resolveStorefrontMetadataOrigin({
      origin: window.location.origin,
      hostname: window.location.hostname,
      isDev: import.meta.env.DEV,
    })

    // The canonical address of a product is its own page, not the store route.
    // Pointing the offer at `/store` would compete with the product page for the
    // same result and split its ranking signals.
    const url = new URL(`/product/${encodeURIComponent(sku)}`, origin).href
    const image = product.img || product.primary_image_url
      ? new URL(product.img || product.primary_image_url, origin).href
      : undefined

    writeJsonLd('data-k2-store-product-jsonld', buildProductStructuredData({
      product,
      description: knowledge.fields.description || product.short || product.short_description,
      image,
      url,
    }))
    writeJsonLd('data-k2-store-faq-jsonld', buildFaqStructuredData(knowledge.faqs))

    return () => {
      writeJsonLd('data-k2-store-product-jsonld', null)
      writeJsonLd('data-k2-store-faq-jsonld', null)
    }
  }, [product, sku, knowledge])

  if (!product) return null

  const rows = detailRows(product)
  if (rows.length === 0) return null

  return (
    <section
      className="rounded-2xl border border-[#E4DCD1] bg-white p-5"
      aria-label={`Product details for ${product.name}`}
    >
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-navy-faint">
        Product details
      </h2>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 text-sm">
            <dt className="shrink-0 text-navy-faint">{label}</dt>
            <dd className="text-right font-medium text-[#2B2B2B]">{value}</dd>
          </div>
        ))}
      </dl>
      {describeMeasurement(product) && (
        <p className="mt-3 text-[12px] leading-5 text-navy-faint">
          Pack dimensions are calculated from the declared pack size to show scale on the shelf.
          They are approximate and not a specification.
        </p>
      )}
    </section>
  )
}
