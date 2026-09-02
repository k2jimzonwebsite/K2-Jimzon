import { expect, test } from '@playwright/test'
import { generateSitemap, K2_STOREFRONT_ORIGIN } from '../scripts/map024-evidence/generate-sitemap.mjs'
import { generateProductPages } from '../scripts/map024-evidence/generate-product-pages.mjs'

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
  expect(xml).toContain(`${K2_STOREFRONT_ORIGIN}/product/K2%20%26%20Cream`)
  expect(xml).toContain(`${K2_STOREFRONT_ORIGIN}/product/Z-Coffee`)
  expect(xml).toContain('https://cdn.example.test/z.jpg?width=600&amp;format=webp')
  expect(xml).toContain('2026-08-25T00:00:00.000Z')
  expect(xml).not.toContain('UNLISTED')
  expect(xml).not.toContain('DRAFT')
  expect(xml).not.toContain('private field')
  expect(xml.indexOf('/product/K2%20%26%20Cream')).toBeLessThan(xml.indexOf('/product/Z-Coffee'))
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
