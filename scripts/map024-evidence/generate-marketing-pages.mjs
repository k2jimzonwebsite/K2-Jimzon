import { STOREFRONT_SEO_PAGES } from '../../src/lib/storefrontSeoPages.js'
import { K2_STOREFRONT_ORIGIN } from './generate-sitemap.mjs'

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function replaceRequired(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`MAP024_MARKETING_PRERENDER_REFUSAL: missing ${label}`)
  return html.replace(pattern, replacement)
}

function metaPattern(attribute, name) {
  return new RegExp(`<meta\\s+${attribute}=["']${name}["'][^>]*>`, 'iu')
}

function meta(attribute, name, content) {
  return `<meta ${attribute}="${name}" content="${escapeHtml(content)}" />`
}

export function generateMarketingPages({ template, origin = K2_STOREFRONT_ORIGIN } = {}) {
  if (origin !== K2_STOREFRONT_ORIGIN || typeof template !== 'string' || !template.trim()) {
    throw new Error('MAP024_MARKETING_PRERENDER_REFUSAL: canonical origin and HTML template required')
  }

  const pages = new Map()
  for (const [key, page] of Object.entries(STOREFRONT_SEO_PAGES)) {
    if (key === 'home') continue
    const loc = `${origin}${page.path}`
    let html = template
    html = replaceRequired(html, /<title>[\s\S]*?<\/title>/iu, `<title>${escapeHtml(page.title)}</title>`, 'title')
    html = replaceRequired(html, metaPattern('name', 'description'), meta('name', 'description', page.description), 'description')
    html = replaceRequired(html, /<link\s+rel=["']canonical["'][^>]*>/iu, `<link rel="canonical" href="${escapeHtml(loc)}" />`, 'canonical')
    for (const [attribute, name, content] of [
      ['property', 'og:title', page.title],
      ['property', 'og:description', page.description],
      ['property', 'og:url', loc],
      ['name', 'twitter:title', page.title],
      ['name', 'twitter:description', page.description],
    ]) {
      html = replaceRequired(html, metaPattern(attribute, name), meta(attribute, name, content), name)
    }
    pages.set(page.path.slice(1), html)
  }
  return pages
}
