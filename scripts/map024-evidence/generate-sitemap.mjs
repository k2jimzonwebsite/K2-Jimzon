import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * MAP-024 prepared sitemap generator.
 *
 * This module deliberately accepts a caller-supplied catalog projection. It
 * never connects to Supabase, reads .env files, or invents product rows. The
 * production caller must provide a read-only projection that has already
 * applied the storefront publication and FEFO-stock rules.
 */

export const K2_STOREFRONT_ORIGIN = 'https://www.k2jimzon.com'
const VISIBLE_STATUSES = new Set(['live', 'active'])
const SITEMAP_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9'
const IMAGE_NAMESPACE = 'http://www.google.com/schemas/sitemap-image/1.1'
const LEGACY_K2_VERCEL_HOST = /^k2[-_]?jimzon(?:[-_][a-z0-9-]+)*\.vercel\.app$/iu

function fail(code, message) {
  throw new Error(`${code}: ${message}`)
}

function canonicalOrigin(value) {
  if (value !== K2_STOREFRONT_ORIGIN) {
    fail('MAP024_SITEMAP_REFUSAL', `origin must be exactly ${K2_STOREFRONT_ORIGIN}`)
  }
  return K2_STOREFRONT_ORIGIN
}

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function isVisibleProduct(product) {
  if (!product || typeof product !== 'object') return false
  const status = String(product.status || '').trim().toLowerCase()
  const publicationStatus = String(product.publication_status || '').trim().toLowerCase()
  const statusAllowsVisibility = VISIBLE_STATUSES.has(status)
    || (!status && publicationStatus === 'published')

  if (!statusAllowsVisibility) return false
  if (product.published === false || product.customer_visible === false || product.is_customer_visible === false) return false
  if (product.unlisted === true) return false
  return true
}

function requiredSku(product, index) {
  const sku = typeof product.sku === 'string' ? product.sku.trim() : ''
  if (!sku || sku.length > 160 || /[\u0000-\u001f\u007f]/u.test(sku)) {
    fail('MAP024_SITEMAP_REFUSAL', `visible product at index ${index} has no valid SKU`)
  }
  return sku
}

function isoLastmod(product, index) {
  const supplied = product.lastmod ?? product.updated_at ?? product.modified_at ?? null
  if (supplied == null || supplied === '') return null
  const date = new Date(supplied)
  if (Number.isNaN(date.getTime())) {
    fail('MAP024_SITEMAP_REFUSAL', `visible product at index ${index} has an invalid modification date`)
  }
  return date.toISOString()
}

/**
 * `<image:image>` is a sitemap enhancement, not a requirement.
 *
 * Owner decision, 28 August 2026: a genuine published product must not be
 * excluded from discovery solely because it has no photograph yet. A missing
 * image therefore yields no image element rather than aborting the sitemap.
 * An image that IS supplied is still validated exactly as strictly as before —
 * HTTPS only, no credentials, no fragment, no legacy Vercel host.
 */
function imageUrl(product, origin, index) {
  const supplied = product.primary_image_url ?? product.primaryImageUrl ?? product.img ?? null
  if (supplied == null || String(supplied).trim() === '') return null

  let url
  try {
    url = new URL(String(supplied), origin)
  } catch {
    fail('MAP024_SITEMAP_REFUSAL', `visible product at index ${index} has an invalid primary image URL`)
  }

  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    fail('MAP024_SITEMAP_REFUSAL', `visible product at index ${index} image must be an HTTPS URL without credentials or fragments`)
  }
  if (LEGACY_K2_VERCEL_HOST.test(url.hostname)) {
    fail('MAP024_SITEMAP_REFUSAL', `visible product at index ${index} image must not use a legacy K2 Vercel host`)
  }
  return url.href
}

export function productPathSegment(sku) {
  return encodeURIComponent(sku).replaceAll('.', '%2E')
}

function productUrl(origin, sku) {
  return `${origin}/product/${productPathSegment(sku)}`
}

function compareSku(left, right) {
  const a = left.sku.toLowerCase()
  const b = right.sku.toLowerCase()
  if (a < b) return -1
  if (a > b) return 1
  return left.sku < right.sku ? -1 : left.sku > right.sku ? 1 : 0
}

function urlEntry({ loc, lastmod = null, image = null }) {
  const lines = ['  <url>', `    <loc>${xmlEscape(loc)}</loc>`]
  if (lastmod) lines.push(`    <lastmod>${xmlEscape(lastmod)}</lastmod>`)
  if (image) {
    lines.push('    <image:image>', `      <image:loc>${xmlEscape(image)}</image:loc>`, '    </image:image>')
  }
  lines.push('  </url>')
  return lines.join('\n')
}

/**
 * Build a deterministic sitemap for the exact canonical K2 storefront host.
 *
 * `products` is expected to be a redacted/public projection with at least
 * `{ sku, status, primary_image_url }` for each visible product. Rows that are
 * not customer-visible are ignored. A visible row with malformed required
 * data aborts generation so an incomplete sitemap cannot be deployed.
 */
export function selectVisibleProducts({ products = [], origin = K2_STOREFRONT_ORIGIN } = {}) {
  const canonical = canonicalOrigin(origin)
  if (!Array.isArray(products)) fail('MAP024_SITEMAP_REFUSAL', 'products must be an array')

  const seen = new Set()
  const visible = products
    .filter(isVisibleProduct)
    .map((product, index) => {
      const sku = requiredSku(product, index)
      const key = sku.toLowerCase()
      if (seen.has(key)) fail('MAP024_SITEMAP_REFUSAL', `duplicate visible SKU: ${sku}`)
      seen.add(key)
      return {
        product,
        sku,
        segment: productPathSegment(sku),
        loc: productUrl(canonical, sku),
        lastmod: isoLastmod(product, index),
        image: imageUrl(product, canonical, index),
      }
    })
    .sort(compareSku)

  return visible
}

export function generateSitemap({ products = [], origin = K2_STOREFRONT_ORIGIN } = {}) {
  const canonical = canonicalOrigin(origin)
  const visible = selectVisibleProducts({ products, origin: canonical })

  const entries = [
    urlEntry({ loc: `${canonical}/` }),
    urlEntry({ loc: `${canonical}/catalog` }),
    ...visible.map(urlEntry),
  ]

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${SITEMAP_NAMESPACE}" xmlns:image="${IMAGE_NAMESPACE}">`,
    entries.join('\n'),
    '</urlset>',
    '',
  ].join('\n')
}

function optionValue(args, name) {
  const prefix = `--${name}=`
  const argument = args.find(value => value.startsWith(prefix))
  return argument ? argument.slice(prefix.length) : null
}

/**
 * CLI entry point used later by the reviewed deployment pipeline. It uses an
 * exclusive output create so a prepared artifact cannot silently overwrite a
 * prior evidence file; pass `--force` only to an explicitly named local path.
 */
export function runCli(args = process.argv.slice(2)) {
  const inputPath = optionValue(args, 'input')
  const outputPath = optionValue(args, 'output')
  if (!inputPath || !outputPath) {
    console.error('Usage: node scripts/map024-evidence/generate-sitemap.mjs --input=<catalog.json> --output=<sitemap.xml> [--force]')
    return 2
  }

  let products
  try {
    products = JSON.parse(readFileSync(inputPath, 'utf8'))
  } catch (error) {
    console.error(`MAP024_SITEMAP_REFUSAL: cannot read JSON input (${error.message})`)
    return 2
  }

  try {
    const xml = generateSitemap({ products })
    writeFileSync(outputPath, xml, { encoding: 'utf8', flag: args.includes('--force') ? 'w' : 'wx' })
  } catch (error) {
    console.error(error.message)
    return 2
  }

  console.log(`MAP024_SITEMAP_PREPARED: wrote ${outputPath}`)
  return 0
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = runCli()
}
