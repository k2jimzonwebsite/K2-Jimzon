import { expect, test } from '@playwright/test'
import { generateSitemap, K2_STOREFRONT_ORIGIN } from '../scripts/map024-evidence/generate-sitemap.mjs'
import { generateProductPages } from '../scripts/map024-evidence/generate-product-pages.mjs'
import { generateMarketingPages } from '../scripts/map024-evidence/generate-marketing-pages.mjs'
import { auditProjection, readPublishedCatalog } from '../scripts/map024-evidence/read-published-catalog.mjs'
import * as catalogProjection from '../scripts/map024-evidence/read-published-catalog.mjs'
import { readFileSync } from 'node:fs'

test('search readiness holds shared descriptions and missing genuine primary photos', () => {
  expect(typeof catalogProjection.annotateSearchReadiness).toBe('function')
  const rows = catalogProjection.annotateSearchReadiness([
    { sku: 'A', description: 'Shared package description.', primary_image_url: 'https://example.test/a.jpg' },
    { sku: 'B', description: 'Shared package description.', primary_image_url: 'https://example.test/b.jpg' },
    { sku: 'C', description: 'A distinct reviewed package.', primary_image_url: 'https://example.test/c.jpg' },
    { sku: 'D', description: 'Another reviewed package.', image_url: 'https://example.test/fallback.jpg' },
  ])
  expect(rows.map(row => row.search_indexable)).toEqual([false, false, true, false])
  expect(rows.map(({ search_indexable, ...row }) => row)).toEqual([
    { sku: 'A', description: 'Shared package description.', primary_image_url: 'https://example.test/a.jpg' },
    { sku: 'B', description: 'Shared package description.', primary_image_url: 'https://example.test/b.jpg' },
    { sku: 'C', description: 'A distinct reviewed package.', primary_image_url: 'https://example.test/c.jpg' },
    { sku: 'D', description: 'Another reviewed package.', image_url: 'https://example.test/fallback.jpg' },
  ])
})

test('search-held products keep share pages but stay out of the sitemap', () => {
  const products = [
    { sku: 'READY', name: 'Ready coffee', status: 'Live', published: true, search_indexable: true, description: 'Reviewed coffee.', primary_image_url: 'https://example.test/a.jpg' },
    { sku: 'HELD', name: 'Held coffee', status: 'Live', published: true, search_indexable: false, description: 'Shared description.', primary_image_url: 'https://example.test/b.jpg' },
  ]
  const xml = generateSitemap({ products })
  expect(xml).toContain('/product/READY')
  expect(xml).not.toContain('/product/HELD')
  const pages = generateProductPages({ template: readFileSync('index.html', 'utf8'), products })
  expect(pages.size).toBe(2)
  expect(pages.get('HELD')).toContain('<meta name="robots" content="noindex, follow"')
  expect(pages.get('READY')).not.toContain('noindex')
})

test('catalog discovery reads only reviewed published Website members in read-only mode', async () => {
  let request
  await readPublishedCatalog({ env: { SUPABASE_ACCESS_TOKEN: 'test-only-token' }, fetchImpl: async (url, options) => {
    request = { url, ...JSON.parse(options.body) }
    return { status: 200, json: async () => [] }
  } })
  expect(request.url).toBe('https://api.supabase.com/v1/projects/pixplcjqivlfflickobf/database/query')
  expect(request.read_only).toBe(true)
  expect(request.query).toContain('v_storefront_visible_skus')
  expect(request.query).toMatch(/published\s+is\s+true/i)
  expect(request.query).toMatch(/is_human_reviewed\s+is\s+true/i)
  expect(request.query).not.toContain('select *')
  expect(request.query).toContain('left join public.brands b on b.id = p.brand_id')
  expect(request.query).toContain('b.name as brand_name')
  expect(request.query).toContain('p.net_weight')
  expect(request.query).toContain('p.country_of_origin')
})

const visibleProducts = [
  {
    sku: 'Z-Coffee',
    status: 'Active',
    published: true,
    customer_visible: true,
    primary_image_url: 'https://cdn.example.test/z.jpg?width=600&format=webp',
    updated_at: '2026-08-26T12:34:56Z',
    description: 'This private field must never enter a sitemap.',
  },
  {
    sku: 'K2 & Cream',
    status: 'Live',
    primary_image_url: '/images/cream.jpg',
    lastmod: '2026-08-25',
  },
  { sku: 'UNLISTED', status: 'Unlisted', primary_image_url: '/images/nope.jpg' },
  { sku: 'DRAFT', status: 'Draft', primary_image_url: '/images/nope.jpg' },
]

test('MAP-024 sitemap emits only canonical visible product URLs', () => {
  const xml = generateSitemap({ products: visibleProducts })

  expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
  expect(xml).toContain(`<loc>${K2_STOREFRONT_ORIGIN}/</loc>`)
  expect(xml).toContain(`<loc>${K2_STOREFRONT_ORIGIN}/catalog</loc>`)
  expect(xml).toContain(`<loc>${K2_STOREFRONT_ORIGIN}/pasabuy</loc>`)
  expect(xml).toContain(`<loc>${K2_STOREFRONT_ORIGIN}/trade</loc>`)
  expect(xml).toContain(`${K2_STOREFRONT_ORIGIN}/product/K2%20%26%20Cream`)
  expect(xml).toContain(`${K2_STOREFRONT_ORIGIN}/product/Z-Coffee`)
  expect(xml).toContain('https://cdn.example.test/z.jpg?width=600&amp;format=webp')
  expect(xml).toContain('2026-08-25T00:00:00.000Z')
  expect(xml).not.toContain('UNLISTED')
  expect(xml).not.toContain('DRAFT')
  expect(xml).not.toContain('private field')
  expect(xml.indexOf('/product/K2%20%26%20Cream')).toBeLessThan(xml.indexOf('/product/Z-Coffee'))
})

test('MAP-024 marketing routes have distinct initial-response metadata', () => {
  const template = `<!doctype html><html><head>
    <title>Home title</title>
    <meta name="description" content="Home description" />
    <link rel="canonical" href="https://www.k2jimzon.com/" />
    <meta property="og:title" content="Home title" />
    <meta property="og:description" content="Home description" />
    <meta property="og:url" content="https://www.k2jimzon.com/" />
    <meta name="twitter:title" content="Home title" />
    <meta name="twitter:description" content="Home description" />
  </head><body><div id="root"></div></body></html>`
  const pages = generateMarketingPages({ template })

  expect([...pages.keys()]).toEqual(['catalog', 'pasabuy', 'trade', 'contact', 'privacy', 'terms', 'returns', 'policies', 'store'])
  expect(pages.get('contact')).toContain('<title>Contact K2 Jimzon')
  expect(pages.get('privacy')).toContain('https://www.k2jimzon.com/privacy')
  expect(pages.get('store')).toContain('<link rel="canonical" href="https://www.k2jimzon.com/catalog"')
  expect(pages.get('pasabuy')).toContain('<title>Pasabuy from Italy to the Philippines | K2 Jimzon</title>')
  expect(pages.get('pasabuy')).toContain('<link rel="canonical" href="https://www.k2jimzon.com/pasabuy"')
  expect(pages.get('trade')).toContain('Italian Grocery Wholesale')
  expect(pages.get('catalog')).toContain('Italian Imported Goods in Manila')
  expect(pages.get('pasabuy')).not.toContain('Home description')
})

test('MAP-024 catalog projection reports product content readiness', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../scripts/map024-evidence/read-published-catalog.mjs', import.meta.url), 'utf8')
  expect(source).toContain("'description'")
  expect(source).toContain("'short_description'")
  expect(auditProjection([
    { sku: 'READY', description: 'Specific product description', primary_image_url: 'https://example.test/a.jpg' },
    { sku: 'MISSING', description: '  ', short_description: null },
  ])).toMatchObject({ total: 2, missingDescription: 1, missingImage: 1 })
})

test('MAP-024 sitemap refuses non-canonical hosts and incomplete visible rows', () => {
  expect(() => generateSitemap({ origin: 'https://k2jimzon.com', products: [] })).toThrow('MAP024_SITEMAP_REFUSAL')
  expect(() => generateSitemap({ origin: 'http://www.k2jimzon.com', products: [] })).toThrow('MAP024_SITEMAP_REFUSAL')
  expect(() => generateSitemap({ products: [{ status: 'Live', primary_image_url: '/images/missing-sku.jpg' }] }))
    .toThrow('has no valid SKU')
})

test('MAP-024 sitemap lists an approved product that has no photograph yet', () => {
  // Owner decision, 28 August 2026: <image:image> is an enhancement. A real
  // published product must still be discoverable before photography exists.
  const xml = generateSitemap({ products: [{ sku: 'K2-001', status: 'Live' }] })
  expect(xml).toContain(`${K2_STOREFRONT_ORIGIN}/product/K2-001`)
  expect(xml).not.toContain('<image:image>')

  // A supplied image is still validated exactly as strictly.
  expect(() => generateSitemap({ products: [
    { sku: 'K2-004', status: 'Live', primary_image_url: 'http://cdn.example.test/a.jpg' },
  ] })).toThrow('image must be an HTTPS URL')
})

test('MAP-024 sitemap refuses duplicate visible SKUs and unsafe image URLs', () => {
  expect(() => generateSitemap({ products: [
    { sku: 'K2-001', status: 'Live', primary_image_url: '/images/a.jpg' },
    { sku: 'k2-001', status: 'Active', primary_image_url: '/images/b.jpg' },
  ] })).toThrow('duplicate visible SKU')

  expect(() => generateSitemap({ products: [
    { sku: 'K2-002', status: 'Live', primary_image_url: 'http://cdn.example.test/a.jpg' },
  ] })).toThrow('image must be an HTTPS URL')

  expect(() => generateSitemap({ products: [
    { sku: 'K2-003', status: 'Live', primary_image_url: 'https://k2-jimzon-admin-seven.vercel.app/images/a.jpg' },
  ] })).toThrow('legacy K2 Vercel host')
})

test('the storefront build emits the sitemap instead of leaving it a manual script', async () => {
  const { readFile } = await import('node:fs/promises')
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  const emitter = await readFile(new URL('../scripts/emit-storefront-sitemap.mjs', import.meta.url), 'utf8')
  const robots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8')

  // The generator was reviewed and tested long before this, but its output never
  // reached dist/, so no sitemap was ever deployed.
  expect(pkg.scripts['build:storefront']).toContain('emit-storefront-sitemap.mjs')
  expect(pkg.scripts.build).toContain('emit-storefront-sitemap.mjs')

  // Storefront only. An admin deployment must never publish a crawl manifest.
  expect(emitter).toContain("target !== 'storefront'")
  // It must not invent product URLs; the projection is produced separately.
  expect(emitter).not.toMatch(/from ['"]@supabase/)

  expect(robots).toContain('Sitemap: https://www.k2jimzon.com/sitemap.xml')
  expect(robots).not.toContain('admin-portal-k2-secure')
})

test('MAP-024 prerenders product-specific metadata from the reviewed catalog projection', () => {
  const template = `<!doctype html><html><head>
    <title>Home title</title>
    <meta name="description" content="Home description" />
    <link rel="canonical" href="https://www.k2jimzon.com/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Home title" />
    <meta property="og:description" content="Home description" />
    <meta property="og:url" content="https://www.k2jimzon.com/" />
    <meta property="og:image" content="https://www.k2jimzon.com/og-card.png" />
    <meta name="twitter:title" content="Home title" />
    <meta name="twitter:description" content="Home description" />
    <meta name="twitter:image" content="https://www.k2jimzon.com/og-card.png" />
  </head><body><script src="/assets/index.js"></script></body></html>`

  const pages = generateProductPages({
    template,
    products: [
      {
        sku: 'K2 & Cream',
        name: 'K2 <Cream>',
        status: 'Live',
        published: true,
        description: 'Italian cream & cocoa.',
        primary_image_url: '/images/cream.jpg',
        srp: '249',
        stock_available: 3,
      },
      { sku: 'DRAFT', name: 'Draft', status: 'Draft', published: false },
    ],
  })

  expect([...pages.keys()]).toEqual(['K2%20%26%20Cream'])
  const html = pages.get('K2%20%26%20Cream')
  expect(html).toContain('<title>K2 &lt;Cream&gt; — K2 Jimzon</title>')
  expect(html).toContain('<link rel="canonical" href="https://www.k2jimzon.com/product/K2%20%26%20Cream"')
  expect(html).toContain('<meta property="og:type" content="product"')
  expect(html).toContain('<meta property="og:image" content="https://www.k2jimzon.com/images/cream.jpg"')
  expect(html).toContain('<meta name="twitter:image" content="https://www.k2jimzon.com/images/cream.jpg"')
  expect(html).toContain('"@type":"Product"')
  expect(html).toContain('"price":"249.00"')
  expect(html).toContain('"availability":"https://schema.org/InStock"')
  expect(html).toContain('<script src="/assets/index.js"></script>')
  expect(html).not.toContain('<link rel="canonical" href="https://www.k2jimzon.com/"')
})

test('the storefront config lets filesystem product HTML win and recovers missing products in the SPA', async () => {
  const { readFile } = await import('node:fs/promises')
  const config = JSON.parse(await readFile(new URL('../vercel.storefront.json', import.meta.url), 'utf8'))
  const productRewrite = config.rewrites.findIndex(rule => rule.source === '/product/:sku')
  const apiRewrite = config.rewrites.findIndex(rule => rule.source === '/api/storefront/:route*')

  expect(productRewrite).toBeGreaterThanOrEqual(0)
  // Vercel's higher-level rewrites check the filesystem first. A generated
  // product page therefore wins; only an unpublished/missing SKU reaches the
  // client recovery surface in index.html.
  expect(config.rewrites[productRewrite].destination).toBe('/index.html')
  expect(apiRewrite).toBeLessThan(productRewrite)
  expect(config.rewrites.some(rule => rule.source === '/(.*)')).toBe(false)
})
