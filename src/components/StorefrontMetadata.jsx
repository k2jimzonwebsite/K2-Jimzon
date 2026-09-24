import { useEffect } from 'react'
import { useStore } from '../context/StoreContext'
import { resolveStorefrontMetadataOrigin } from '../lib/storefrontMetadataOrigin'
import {
  buildBreadcrumbStructuredData, buildFaqStructuredData, buildProductStructuredData, writeJsonLd,
} from '../lib/productStructuredData'
import { getProductKnowledge } from '../lib/productKnowledge'
import { useProductKnowledgeVersion } from '../lib/useProductKnowledgeVersion'
import { STOREFRONT_SEO_PAGES } from '../lib/storefrontSeoPages'

const DEFAULT_TITLE = STOREFRONT_SEO_PAGES.home.title
const DEFAULT_DESCRIPTION = STOREFRONT_SEO_PAGES.home.description

function setMeta(attribute, name, content) {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

/**
 * The shared social fallback.
 *
 * A product with no photograph previously fell back to the SVG icon, but no
 * social crawler renders SVG and `summary_large_image` expects a large raster,
 * so every share of an unphotographed product produced a blank card. Google
 * also refuses SVG for Product rich results.
 */
const SOCIAL_FALLBACK = '/og-card.png'

function absoluteUrl(value, origin) {
  try {
    return new URL(value || SOCIAL_FALLBACK, origin).href
  } catch {
    return new URL(SOCIAL_FALLBACK, origin).href
  }
}

export default function StorefrontMetadata() {
  const { view, productId, getProduct, loading } = useStore()
  const product = view === 'master_product' ? getProduct(productId) : null
  const unavailableSurface = view === 'not_found' || (view === 'master_product' && !loading && !product)
  const scopedSurface = /^(account|messages|checkout|confirmation)$/.test(view)
  // Approved knowledge arrives after the catalog, so the FAQ markup has to be
  // rewritten when it lands rather than computed once on first render.
  const knowledgeVersion = useProductKnowledgeVersion()

  useEffect(() => {
    const origin = resolveStorefrontMetadataOrigin({ origin: window.location.origin, hostname: window.location.hostname, isDev: import.meta.env.DEV })
    const seoPage = STOREFRONT_SEO_PAGES[view]
    const canonicalUrl = new URL(seoPage?.path || window.location.pathname, origin).href
    const title = product
      ? `${product.name} — K2 Jimzon`
      : view === 'not_found'
        ? 'Page not found — K2 Jimzon'
        : unavailableSurface
          ? 'Product unavailable — K2 Jimzon'
          : seoPage?.title || DEFAULT_TITLE
    const description = product
      ? product.description || product.short_description || `${product.name}, sourced in Italy and fulfilled in Manila by K2 Jimzon.`
      : seoPage?.description || DEFAULT_DESCRIPTION
    // Falls through to SOCIAL_FALLBACK inside absoluteUrl when the product has
    // no photograph, which today is every product.
    const image = absoluteUrl(product?.img || product?.primary_image_url, origin)

    document.title = title
    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
    }
    canonical.setAttribute('href', canonicalUrl)

    setMeta('name', 'description', description)
    setMeta('name', 'robots', unavailableSurface || scopedSurface || (view === 'master_product' && __K2_PRODUCT_NOINDEX__) ? 'noindex, nofollow' : 'index, follow')
    setMeta('property', 'og:type', product ? 'product' : 'website')
    setMeta('property', 'og:site_name', 'K2 Jimzon')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:url', canonicalUrl)
    setMeta('property', 'og:image', image)
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('name', 'twitter:image', image)

    // One builder serves this page and the virtual store. Markup that disagreed
    // between the two surfaces would cost the rich result, not just tidiness.
    writeJsonLd(
      'data-k2-product-jsonld',
      buildProductStructuredData({ product, description, image, url: canonicalUrl }),
    )

    // The virtual store already published FAQ markup from approved knowledge
    // while the product page — the canonical URL for that product, and the one
    // the sitemap lists — published none. Same source, same approval gate, so
    // nothing unapproved can reach either surface.
    const knowledge = product ? getProductKnowledge(product.sku || product.id || '') : null
    writeJsonLd(
      'data-k2-product-faq-jsonld',
      knowledge ? buildFaqStructuredData(knowledge.faqs) : null,
    )

    writeJsonLd(
      'data-k2-breadcrumb-jsonld',
      buildBreadcrumbStructuredData({ product, origin, url: canonicalUrl }),
    )
  }, [product, view, loading, unavailableSurface, scopedSurface, knowledgeVersion])

  return null
}
