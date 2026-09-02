import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * MAP-024 exact-host discovery verifier.
 *
 * This tool performs public GETs only. It records status/content-type and
 * structural checks, never response bodies, headers, cookies, or credentials.
 * Product paths are optional and must be supplied by the caller; no catalog is
 * invented or read from Supabase.
 */

export const K2_STOREFRONT_ORIGIN = 'https://www.k2jimzon.com'
const SITEMAP_URL = `${K2_STOREFRONT_ORIGIN}/sitemap.xml`
const REQUIRED_HOME_IMAGE = `${K2_STOREFRONT_ORIGIN}/og-card.png`

function refusal(message) {
  throw new Error(`MAP024_DISCOVERY_REFUSAL: ${message}`)
}

function requireCanonicalOrigin(origin) {
  if (origin !== K2_STOREFRONT_ORIGIN) {
    refusal(`origin must be exactly ${K2_STOREFRONT_ORIGIN}`)
  }
  return origin
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function responseStatus(response) {
  const status = Number(response?.status)
  if (!Number.isInteger(status)) refusal('response status must be an integer')
  return status
}

function responseContentType(response) {
  if (response?.headers && typeof response.headers.get === 'function') {
    return String(response.headers.get('content-type') || '').trim().toLowerCase()
  }
  const headers = response?.headers && typeof response.headers === 'object' ? response.headers : {}
  const value = Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1]
  return String(value || '').trim().toLowerCase()
}

function responseBody(response) {
  const body = response?.body ?? response?.text ?? ''
  if (typeof body !== 'string') refusal('response body must be text')
  return body
}

function normaliseProductSku(sku) {
  if (typeof sku !== 'string') refusal('product SKUs must be non-empty strings')
  const cleanSku = sku.trim()
  if (!cleanSku || cleanSku.length > 160 || /[\u0000-\u001f\u007f]/u.test(cleanSku)) {
    refusal('product SKUs must be non-empty, bounded, and free of control characters')
  }
  return cleanSku
}

function summary(path, response) {
  return { path, status: responseStatus(response), contentType: responseContentType(response) || 'missing' }
}

function requireHtml(response, path) {
  if (responseStatus(response) !== 200) refusal(`${path} returned HTTP ${responseStatus(response)}`)
  if (!responseContentType(response).startsWith('text/html')) refusal(`${path} did not return text/html`)
}

function requireXml(response) {
  if (responseStatus(response) !== 200) refusal(`/sitemap.xml returned HTTP ${responseStatus(response)}`)
  const type = responseContentType(response)
  if (!type.startsWith('application/xml') && !type.startsWith('text/xml')) {
    refusal('/sitemap.xml did not return an XML content type')
  }
}

function requirePlainText(response) {
  if (responseStatus(response) !== 200) refusal(`/robots.txt returned HTTP ${responseStatus(response)}`)
  if (!responseContentType(response).startsWith('text/plain')) refusal('/robots.txt did not return text/plain')
}

function hasTagAttributes(body, tagName, pairs) {
  const tags = body.match(new RegExp(`<${tagName}\\b[^>]*>`, 'giu')) || []
  return tags.some((tag) => pairs.every(([name, value]) => {
    const pattern = new RegExp(`\\b${escapeRegExp(name)}\\s*=\\s*["']${escapeRegExp(value)}["']`, 'iu')
    return pattern.test(tag)
  }))
}

function hasTagWithAbsoluteContent(body, tagName, pairs) {
  const tags = body.match(new RegExp(`<${tagName}\\b[^>]*>`, 'giu')) || []
  return tags.some((tag) => pairs.every(([name, value]) => {
    const pattern = new RegExp(`\\b${escapeRegExp(name)}\\s*=\\s*["']${escapeRegExp(value)}["']`, 'iu')
    return pattern.test(tag)
  }) && /\bcontent\s*=\s*["']https:\/\/[^"']+["']/iu.test(tag))
}

function requireHomeDiscovery(response) {
  const body = responseBody(response)
  requireHtml(response, '/')
  if (!/<title>[^<]+<\/title>/iu.test(body)) refusal('/ has no non-empty title')
  if (!hasTagAttributes(body, 'link', [['rel', 'canonical'], ['href', `${K2_STOREFRONT_ORIGIN}/`]])) {
    refusal('/ is missing the absolute canonical home tag')
  }
  if (!hasTagAttributes(body, 'meta', [['property', 'og:url'], ['content', `${K2_STOREFRONT_ORIGIN}/`]])) {
    refusal('/ is missing the absolute og:url home tag')
  }
  if (!hasTagAttributes(body, 'meta', [['property', 'og:image'], ['content', REQUIRED_HOME_IMAGE]])) {
    refusal('/ is missing the absolute og:image home tag')
  }
  if (!hasTagAttributes(body, 'meta', [['name', 'twitter:image'], ['content', REQUIRED_HOME_IMAGE]])) {
    refusal('/ is missing the absolute twitter:image home tag')
  }
  return { title: true, canonical: true, openGraph: true, twitter: true }
}

function requireRobots(response) {
  const body = responseBody(response).replaceAll('\r\n', '\n')
  requirePlainText(response)
  if (/<(?:!doctype|html|body)\b/iu.test(body)) refusal('/robots.txt contains HTML')
  const requiredLines = [
    /^User-agent:\s*\*\s*$/imu,
    /^Allow:\s*\/\s*$/imu,
    new RegExp(`^Sitemap:\\s*${escapeRegExp(SITEMAP_URL)}\\s*$`, 'imu'),
  ]
  if (requiredLines.some((pattern) => !pattern.test(body))) refusal('/robots.txt is missing a required exact directive')
  if (/admin-portal-k2-secure/iu.test(body)) refusal('/robots.txt discloses the Admin route')
  return { userAgent: true, allow: true, adminPathAbsent: true, sitemap: true }
}

function requireSitemap(response) {
  const body = responseBody(response)
  requireXml(response)
  if (/<(?:!doctype|html|body)\b/iu.test(body)) refusal('/sitemap.xml contains HTML')
  if (!/^\s*<\?xml\s+version=/iu.test(body)) refusal('/sitemap.xml is missing an XML declaration')
  if (!/<urlset\b[^>]*xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/iu.test(body)) {
    refusal('/sitemap.xml is missing the standard urlset namespace')
  }
  const locs = [...body.matchAll(/<loc>([^<]*)<\/loc>/giu)].map((match) => match[1].trim())
  if (!locs.includes(`${K2_STOREFRONT_ORIGIN}/`) || !locs.includes(`${K2_STOREFRONT_ORIGIN}/catalog`)) {
    refusal('/sitemap.xml must include canonical home and catalog URLs')
  }
  if (locs.some((loc) => !loc.startsWith(`${K2_STOREFRONT_ORIGIN}/`) || /admin-portal-k2-secure/iu.test(loc))) {
    refusal('/sitemap.xml contains a non-canonical or Admin URL')
  }
  return { urlCount: locs.length, canonicalUrls: locs.length }
}

function requireProductDiscovery(response, sku) {
  const encodedSku = encodeURIComponent(sku)
  const path = `/product/${encodedSku}`
  const canonicalUrl = `${K2_STOREFRONT_ORIGIN}${path}`
  const body = responseBody(response)
  requireHtml(response, path)
  if (!hasTagAttributes(body, 'link', [['rel', 'canonical'], ['href', canonicalUrl]])) {
    refusal(`${path} is missing its absolute product canonical tag`)
  }
  if (!hasTagAttributes(body, 'meta', [['property', 'og:type'], ['content', 'product']])) {
    refusal(`${path} is missing product og:type`)
  }
  if (!hasTagAttributes(body, 'meta', [['property', 'og:url'], ['content', canonicalUrl]])) {
    refusal(`${path} is missing its absolute product og:url tag`)
  }
  if (!hasTagWithAbsoluteContent(body, 'meta', [['property', 'og:image']])) {
    refusal(`${path} is missing product og:image`)
  }
  if (!hasTagWithAbsoluteContent(body, 'meta', [['name', 'twitter:image']])) {
    refusal(`${path} is missing product twitter:image`)
  }
  return { path, canonical: true, product: true, shareImage: true }
}

/**
 * Validate captured public responses without making a network request.
 * `responses` must contain `/`, `/robots.txt`, `/sitemap.xml`, and optional
 * `/product/<encoded SKU>` entries. Only redacted summaries are returned.
 */
export function validateDiscoveryResponses({ origin = K2_STOREFRONT_ORIGIN, responses = {}, products = [] } = {}) {
  const canonical = requireCanonicalOrigin(origin)
  if (!responses || typeof responses !== 'object') refusal('responses must be an object')
  if (!Array.isArray(products)) refusal('products must be an array')
  const home = responses['/']
  const robots = responses['/robots.txt']
  const sitemap = responses['/sitemap.xml']
  if (!home || !robots || !sitemap) refusal('responses must include /, /robots.txt, and /sitemap.xml')

  const result = {
    origin: canonical,
    home: { ...summary('/', home), checks: requireHomeDiscovery(home) },
    robots: { ...summary('/robots.txt', robots), checks: requireRobots(robots) },
    sitemap: { ...summary('/sitemap.xml', sitemap), checks: requireSitemap(sitemap) },
    products: [],
  }

  for (const sku of products) {
    const cleanSku = normaliseProductSku(sku)
    const path = `/product/${encodeURIComponent(cleanSku)}`
    const response = responses[path]
    if (!response) refusal(`responses are missing ${path}`)
    result.products.push({ ...summary(path, response), checks: requireProductDiscovery(response, cleanSku) })
  }
  return result
}

async function fetchPublicPath(origin, path, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') refusal('global fetch is unavailable')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetchImpl(new URL(path, origin), {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
    })
    return {
      status: response.status,
      headers: response.headers,
      body: await response.text(),
    }
  } catch (error) {
    const code = error?.name === 'AbortError' ? 'timeout' : 'network-error'
    refusal(`GET ${path} failed (${code})`)
  } finally {
    clearTimeout(timeout)
  }
}

function optionValues(args, name) {
  const prefix = `--${name}=`
  return args.filter((value) => value.startsWith(prefix)).map((value) => value.slice(prefix.length))
}

export async function runCli(args = process.argv.slice(2), fetchImpl = globalThis.fetch) {
  const origin = optionValues(args, 'origin')[0] || K2_STOREFRONT_ORIGIN
  requireCanonicalOrigin(origin)
  const products = optionValues(args, 'product').map(normaliseProductSku)
  const outputPath = optionValues(args, 'output')[0] || null
  const responses = {}
  for (const path of ['/', '/robots.txt', '/sitemap.xml', ...products.map((sku) => `/product/${encodeURIComponent(sku)}`)]) {
    responses[path] = await fetchPublicPath(origin, path, fetchImpl)
  }

  const evidence = validateDiscoveryResponses({ origin, responses, products })
  const rendered = `${JSON.stringify({ code: 'MAP024_DISCOVERY_VERIFIED', ...evidence }, null, 2)}\n`
  if (outputPath) writeFileSync(outputPath, rendered, { encoding: 'utf8', flag: args.includes('--force') ? 'w' : 'wx' })
  console.log(rendered.trim())
  return 0
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  runCli().catch((error) => {
    console.error(error.message)
    process.exitCode = 2
  })
}
