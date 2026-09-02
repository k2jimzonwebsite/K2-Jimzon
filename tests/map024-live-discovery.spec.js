import { expect, test } from '@playwright/test'
import { K2_STOREFRONT_ORIGIN, runCli, validateDiscoveryResponses } from '../scripts/map024-evidence/verify-live-discovery.mjs'

const validHome = `<!doctype html><html><head><title>K2 Jimzon</title><link rel="canonical" href="${K2_STOREFRONT_ORIGIN}/"><meta property="og:url" content="${K2_STOREFRONT_ORIGIN}/"><meta property="og:image" content="${K2_STOREFRONT_ORIGIN}/og-card.png"><meta name="twitter:image" content="${K2_STOREFRONT_ORIGIN}/og-card.png"></head></html>`
const validRobots = `User-agent: *\nAllow: /\nSitemap: ${K2_STOREFRONT_ORIGIN}/sitemap.xml\n`
const validSitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${K2_STOREFRONT_ORIGIN}/</loc></url><url><loc>${K2_STOREFRONT_ORIGIN}/catalog</loc></url></urlset>`

const response = (body, contentType) => ({ status: 200, headers: { 'content-type': contentType }, body })

test('MAP-024 live discovery validator accepts exact canonical crawler responses', () => {
  const result = validateDiscoveryResponses({
    responses: {
      '/': response(validHome, 'text/html; charset=utf-8'),
      '/robots.txt': response(validRobots, 'text/plain; charset=utf-8'),
      '/sitemap.xml': response(validSitemap, 'application/xml'),
    },
  })

  expect(result.origin).toBe(K2_STOREFRONT_ORIGIN)
  expect(result.home.checks.canonical).toBe(true)
  expect(result.robots.checks.sitemap).toBe(true)
  expect(result.robots.checks.adminPathAbsent).toBe(true)
  expect(result.sitemap.checks.urlCount).toBe(2)
})

test('MAP-024 live discovery validator rejects robots files that disclose the Admin route', () => {
  const responses = {
    '/': response(validHome, 'text/html'),
    '/robots.txt': response(
      validRobots.replace('Sitemap:', 'Disallow: /admin-portal-k2-secure\nSitemap:'),
      'text/plain',
    ),
    '/sitemap.xml': response(validSitemap, 'application/xml'),
  }

  expect(() => validateDiscoveryResponses({ responses })).toThrow('robots.txt discloses the Admin route')
})

test('MAP-024 live discovery validator rejects SPA HTML and missing crawler directives', () => {
  const responses = {
    '/': response(validHome, 'text/html'),
    '/robots.txt': response('<!doctype html><html></html>', 'text/html'),
    '/sitemap.xml': response('<!doctype html><html></html>', 'text/html'),
  }

  expect(() => validateDiscoveryResponses({ responses })).toThrow('robots.txt did not return text/plain')
})

test('MAP-024 live discovery validator rejects non-canonical sitemap URLs', () => {
  const invalidSitemap = validSitemap.replace('</urlset>', '<url><loc>https://preview.example.test/catalog</loc></url></urlset>')
  const responses = {
    '/': response(validHome, 'text/html'),
    '/robots.txt': response(validRobots, 'text/plain'),
    '/sitemap.xml': response(invalidSitemap, 'application/xml'),
  }

  expect(() => validateDiscoveryResponses({ responses })).toThrow('non-canonical or Admin URL')
})

test('MAP-024 product discovery requires product-specific initial-response metadata', () => {
  const sku = 'K2 & Cream'
  const path = `/product/${encodeURIComponent(sku)}`
  const productHtml = `<title>${sku} — K2 Jimzon</title><link rel="canonical" href="${K2_STOREFRONT_ORIGIN}${path}"><meta property="og:type" content="product"><meta property="og:url" content="${K2_STOREFRONT_ORIGIN}${path}"><meta property="og:image" content="${K2_STOREFRONT_ORIGIN}/images/cream.jpg"><meta name="twitter:image" content="${K2_STOREFRONT_ORIGIN}/images/cream.jpg">`
  const responses = {
    '/': response(validHome, 'text/html'),
    '/robots.txt': response(validRobots, 'text/plain'),
    '/sitemap.xml': response(validSitemap, 'application/xml'),
    [path]: response(productHtml, 'text/html'),
  }

  const result = validateDiscoveryResponses({ responses, products: [sku] })
  expect(result.products[0].checks.product).toBe(true)
})

test('MAP-024 live discovery validator refuses a non-canonical origin', () => {
  expect(() => validateDiscoveryResponses({ origin: 'https://k2jimzon.com', responses: {} }))
    .toThrow('origin must be exactly')
})

test('MAP-024 discovery CLI fetches only public paths and emits redacted evidence', async () => {
  const requested = []
  const output = []
  const originalLog = console.log
  console.log = (value) => output.push(String(value))
  try {
    const code = await runCli([], async (url) => {
      requested.push(String(url))
      const path = new URL(url).pathname
      const fixtures = {
        '/': response(validHome, 'text/html'),
        '/robots.txt': response(validRobots, 'text/plain'),
        '/sitemap.xml': response(validSitemap, 'application/xml'),
      }
      return {
        status: fixtures[path].status,
        headers: fixtures[path].headers,
        text: async () => fixtures[path].body,
      }
    })
    expect(code).toBe(0)
  } finally {
    console.log = originalLog
  }

  expect(requested).toEqual([
    `${K2_STOREFRONT_ORIGIN}/`,
    `${K2_STOREFRONT_ORIGIN}/robots.txt`,
    `${K2_STOREFRONT_ORIGIN}/sitemap.xml`,
  ])
  expect(output[0]).toContain('MAP024_DISCOVERY_VERIFIED')
  expect(output[0]).not.toContain('<!doctype')
})
