import {
  K2_STOREFRONT_ORIGIN, selectVisibleProducts,
} from './generate-sitemap.mjs'
import {
  buildBreadcrumbStructuredData, buildProductStructuredData,
} from '../../src/lib/productStructuredData.js'

const SOCIAL_FALLBACK = '/og-card.png'

function fail(message) {
  throw new Error(`MAP024_PRODUCT_PRERENDER_REFUSAL: ${message}`)
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) fail(`template is missing ${label}`)
  return html.replace(pattern, replacement)
}

function replaceOptional(html, pattern, replacement = '') {
  return pattern.test(html) ? html.replace(pattern, replacement) : html
}

function metaPattern(attribute, name) {
  return new RegExp(`<meta\\s+${attribute}=["']${name}["'][^>]*>`, 'iu')
}

function meta(attribute, name, content) {
  return `<meta ${attribute}="${name}" content="${htmlEscape(content)}" />`
}

function jsonLd(payload, marker) {
  const json = JSON.stringify(payload)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
  return `<script type="application/ld+json" ${marker}>${json}</script>`
}

function productHtml({ template, product, loc, image, origin }) {
  const title = `${product.name} — K2 Jimzon`
  const description = product.description || product.short_description
    || `${product.name}, sourced in Italy and fulfilled in Manila by K2 Jimzon.`
  const absoluteImage = image || new URL(SOCIAL_FALLBACK, origin).href

  let html = template
  html = replaceRequired(html, /<title>[\s\S]*?<\/title>/iu, `<title>${htmlEscape(title)}</title>`, '<title>')
  html = replaceRequired(html, metaPattern('name', 'description'), meta('name', 'description', description), 'description')
  html = replaceRequired(html, /<link\s+rel=["']canonical["'][^>]*>/iu,
    `<link rel="canonical" href="${htmlEscape(loc)}" />`, 'canonical link')
  html = replaceRequired(html, metaPattern('property', 'og:type'), meta('property', 'og:type', 'product'), 'og:type')
  html = replaceRequired(html, metaPattern('property', 'og:title'), meta('property', 'og:title', title), 'og:title')
  html = replaceRequired(html, metaPattern('property', 'og:description'), meta('property', 'og:description', description), 'og:description')
  html = replaceRequired(html, metaPattern('property', 'og:url'), meta('property', 'og:url', loc), 'og:url')
  html = replaceRequired(html, metaPattern('property', 'og:image'), meta('property', 'og:image', absoluteImage), 'og:image')
  html = replaceRequired(html, metaPattern('name', 'twitter:title'), meta('name', 'twitter:title', title), 'twitter:title')
  html = replaceRequired(html, metaPattern('name', 'twitter:description'), meta('name', 'twitter:description', description), 'twitter:description')
  html = replaceRequired(html, metaPattern('name', 'twitter:image'), meta('name', 'twitter:image', absoluteImage), 'twitter:image')
  html = replaceOptional(html, metaPattern('property', 'og:image:width'))
  html = replaceOptional(html, metaPattern('property', 'og:image:height'))
  html = replaceOptional(html, metaPattern('property', 'og:image:type'))
  html = replaceOptional(html, metaPattern('property', 'og:image:alt'), meta('property', 'og:image:alt', product.name))
  html = replaceOptional(html, metaPattern('name', 'twitter:image:alt'), meta('name', 'twitter:image:alt', product.name))

  const productData = buildProductStructuredData({
    product, description, image: absoluteImage, url: loc,
  })
  const breadcrumbData = buildBreadcrumbStructuredData({ product, origin, url: loc })
  const blocks = `${jsonLd(productData, 'data-k2-product-jsonld')}\n    ${jsonLd(breadcrumbData, 'data-k2-breadcrumb-jsonld')}`
  return replaceRequired(html, /<\/head>/iu, `    ${blocks}\n  </head>`, '</head>')
}

export function generateProductPages({
  template, products = [], origin = K2_STOREFRONT_ORIGIN,
} = {}) {
  if (typeof template !== 'string' || !template.trim()) fail('template must be non-empty HTML')
  const visible = selectVisibleProducts({ products, origin })
  const pages = new Map()

  for (const entry of visible) {
    if (!entry.product.name || typeof entry.product.name !== 'string') {
      fail(`visible product ${entry.sku} has no name`)
    }
    pages.set(entry.segment, productHtml({
      template,
      product: entry.product,
      loc: entry.loc,
      image: entry.image,
      origin,
    }))
  }
  return pages
}
