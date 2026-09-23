import { useEffect, useMemo } from 'react'
import { getProductKnowledge } from '../../lib/productKnowledge'
import { useProductKnowledgeVersion } from '../../lib/useProductKnowledgeVersion'
import {
  buildFaqStructuredData, buildProductStructuredData, writeJsonLd,
} from '../../lib/productStructuredData'
import { resolveStorefrontMetadataOrigin } from '../../lib/storefrontMetadataOrigin'

/**
 * MAP-027 / IDEA-20260923-03 — the store's indexable layer.
 *
 * A 3D canvas is invisible to a crawler. Everything a search engine could learn
 * from watching someone shop here has to be stated in the document, which is
 * what this does: structured data in the head for the crawler, built from the
 * same canonical catalog projections.
 *
 * The component operates headlessly to prevent rendering redundant, space-eating
 * container boxes inside the 3D scene while keeping full JSON-LD crawlability.
 */
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

  return null
}

