import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { PUBLIC_STOREFRONT_ORIGIN, resolveStorefrontMetadataOrigin } from '../src/lib/storefrontMetadataOrigin.js'

const read = (path) => fs.readFileSync(path, 'utf8')

test('storefront identity metadata and crawler policy ship in the public artifact', () => {
  const html = read('index.html')
  const robots = read('public/robots.txt')
  const vite = read('vite.config.js')
  const boundary = read('scripts/verify-build-boundary.mjs')
  const supabaseConfig = read('supabase/config.toml')

  expect(html).toContain('property="og:title"')
  expect(html).toContain('name="twitter:card"')
  expect(html).toContain('rel="icon"')
  expect(html).toContain('<link rel="canonical" href="https://www.k2jimzon.com/" />')
  expect(html).toContain('<meta property="og:url" content="https://www.k2jimzon.com/" />')
  // Social crawlers do not render SVG and summary_large_image expects a large
  // raster, so an SVG here produced a blank card on every platform.
  expect(html).toContain('<meta property="og:image" content="https://www.k2jimzon.com/og-card.png" />')
  expect(html).toContain('<meta name="twitter:image" content="https://www.k2jimzon.com/og-card.png" />')
  expect(html).toContain('<meta property="og:image:width" content="1200" />')
  expect(html).toContain('<meta property="og:image:height" content="630" />')
  expect(html).not.toContain('og:image" content="https://www.k2jimzon.com/icon.svg')
  // iOS ignores SVG for apple-touch-icon.
  expect(html).toContain('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"')
  expect(robots).toContain('User-agent: *')
  expect(robots).toContain('Allow: /')
  // The admin path must NOT appear here. robots.txt is public, so naming it
  // published the "secure" path to anyone reading the file, scanners included,
  // while protecting nothing: the admin is a separate host that serves
  // X-Robots-Tag: noindex on every response.
  expect(robots).not.toContain('admin-portal-k2-secure')
  expect(robots).toContain('Sitemap: https://www.k2jimzon.com/sitemap.xml')
  expect(vite).toContain("src: '/icon.svg'")
  expect(vite).toContain("src: '/icon-maskable.svg'")
  // Raster entries are required for installability on several Android builds.
  expect(vite).toContain("src: '/icon-192.png'")
  expect(vite).toContain("src: '/icon-512.png'")
  // Static assets are still scanned for the other target's identity; what
  // changed is that no file gets a carve-out from that scan any more.
  expect(boundary).toContain('staticViolations')
  expect(boundary).toContain('const reviewedContents = contents')
  // The scan must still know the Admin route in order to detect it, so its
  // presence in the forbidden-marker list is correct. What must not exist is a
  // carve-out that removes the line before scanning.
  expect(boundary).toContain('/admin-portal-k2-secure/i')
  expect(boundary).not.toMatch(/replace\([^)]*admin-portal-k2-secure/)
  expect(supabaseConfig).toContain('site_url = "https://www.k2jimzon.com"')
  expect(supabaseConfig).toContain('"https://admin.k2jimzon.com/**"')
  expect(supabaseConfig).not.toContain('https://*.vercel.app/**')
})

test('both target builds emit a static noindex recovery page for real host 404 responses', () => {
  const packageJson = JSON.parse(read('package.json'))
  const emitter = read('scripts/emit-static-404.mjs')
  const boundaryVerifier = read('scripts/verify-build-boundary.mjs')
  const storeContext = read('src/context/StoreContext.jsx')

  expect(packageJson.scripts.build).toContain('emit-static-404.mjs auto')
  expect(packageJson.scripts['build:storefront']).toContain('emit-static-404.mjs storefront')
  expect(packageJson.scripts['build:admin']).toContain('emit-static-404.mjs admin')
  expect(emitter).toContain('<meta name="robots" content="noindex, nofollow">')
  expect(emitter).toContain('<h1>')
  expect(emitter).not.toContain('<script')
  expect(emitter).toContain("target === 'admin'")
  expect(boundaryVerifier).toContain('verifyStatic404')
  expect(boundaryVerifier).toContain("path.join(distDir, '404.html')")
  expect(storeContext).toContain("from '../lib/storefrontRoutes'")
})

test('the production boundary fails closed on missing or executable Storefront 404 output', () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'k2-static-404-'))
  const dist = path.join(fixtureRoot, 'dist')
  const verifier = path.resolve('scripts/verify-build-boundary.mjs')
  const valid404 = '<!doctype html><meta name="robots" content="noindex, nofollow"><main><h1>Page or product unavailable</h1><a href="/catalog">Catalog</a><a href="/contact">Contact</a></main>'

  try {
    fs.mkdirSync(path.join(dist, '.vite'), { recursive: true })
    fs.writeFileSync(path.join(dist, 'k2-build-target.json'), JSON.stringify({ target: 'storefront' }))
    fs.writeFileSync(path.join(dist, '.vite', 'manifest.json'), '{}')
    fs.writeFileSync(path.join(dist, 'runtime.js'), 'export const reviewed = "http://localhost:9999"')
    fs.writeFileSync(path.join(dist, '404.html'), valid404)

    const run = () => spawnSync(process.execPath, [verifier, 'storefront'], {
      cwd: fixtureRoot,
      encoding: 'utf8',
    })

    expect(run().status).toBe(0)

    fs.writeFileSync(path.join(dist, '404.html'), `${valid404}<script src="/unexpected.js"></script>`)
    const executable = run()
    expect(executable.status).not.toBe(0)
    expect(executable.stderr).toContain('contains executable script')

    fs.unlinkSync(path.join(dist, '404.html'))
    const missing = run()
    expect(missing.status).not.toBe(0)
    expect(missing.stderr).toContain('missing its static 404 recovery page')
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true })
  }
})

test('every local product fallback is shipped and build verification rejects missing references', () => {
  const verifier = read('scripts/verify-build-boundary.mjs')
  const products = read('src/data/products.js')
  const inventory = read('src/views/admin/InventoryGrid.jsx')

  expect(fs.existsSync('public/images/placeholder.svg')).toBe(true)
  expect(verifier).toContain('assertReferencedLocalAssets')
  expect(inventory).not.toContain('/placeholder.png')
  for (const deadReference of [
    '/800/334/006/2532/front_en.24.400.jpg',
    '/800/007/002/0542/front_en.4.400.jpg',
    '/800/301/730/7993/front_en.3.400.jpg',
  ]) expect(products).not.toContain(deadReference)
})

test('home discovery routes through the shared history and focus contract', () => {
  const arrivals = read('src/components/home/NewArrivals.jsx')

  expect(arrivals).not.toContain("window.location.href = '/catalog'")
  expect(arrivals).toMatch(/onClick=\{\(\) => go\('catalog'/)
})

test('the Storefront defers the full Supabase SDK until remote data is requested', () => {
  const lazyClient = read('src/lib/lazySupabaseClient.js')
  const store = read('src/context/StoreContext.jsx')
  const globe = read('src/data/globeCms.jsx')
  const account = read('src/services/customerAccountService.js')
  const vite = read('vite.config.js')

  expect(lazyClient).toContain("import('@k2-lazy-supabase-client')")
  expect(vite).toContain("'@k2-lazy-supabase-client'")
  expect(vite).toContain("target === 'admin'")
  for (const source of [store, globe, account]) {
    expect(source).not.toMatch(/from ['"]\.\.\/lib\/supabaseClient['"]|from ['"]\.\.\/\.\.\/lib\/supabaseClient['"]|from ['"]\.\.\/lib\/supabaseClient['"]/) 
    expect(source).toContain('lazySupabaseClient')
  }
})

test('production builds enforce the recorded route bundle budgets', () => {
  const pkg = JSON.parse(read('package.json'))
  const verifier = read('scripts/verify-bundle-budgets.mjs')

  expect(pkg.scripts['build:storefront']).toContain('verify-bundle-budgets.mjs storefront')
  expect(pkg.scripts['build:admin']).toContain('verify-bundle-budgets.mjs admin')
  expect(verifier).toContain('150_000')
  expect(verifier).toContain('30_000')
  expect(verifier).toContain('300_000')
  expect(verifier).toContain("'src/views/Home.jsx'")
  expect(verifier).toContain("'src/views/admin/Admin.jsx'")
})

test('optional brand fonts cannot block Storefront bootstrap', () => {
  const html = read('index.html')
  const main = read('src/main.jsx')

  expect(html).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+fonts\.googleapis\.com/)
  expect(main).toContain('requestIdleCallback')
  expect(main).toContain('fonts.googleapis.com/css2?family=Fraunces')
})

test('the cart overlay is loaded only when Storefront chrome requests it', () => {
  const app = read('src/StorefrontApp.jsx')

  expect(app).not.toMatch(/^import CartDrawer/m)
  expect(app).toContain("const CartDrawer = lazy(() => import('./components/CartDrawer'))")
  expect(app).toContain('{cartOpen && <Suspense fallback={null}>')
  expect(app).toMatch(/<Suspense fallback=\{null\}>\s*<CartDrawer \/>/)
})

test('product discovery metadata is derived from canonical storefront truth', () => {
  const metadata = read('src/components/StorefrontMetadata.jsx')

  // Product markup is now built by one shared builder, so the product page and
  // the virtual store cannot describe the same item differently — a divergence
  // there costs the rich result, not just tidiness.
  expect(metadata).toContain('buildProductStructuredData')
  expect(metadata).toContain('data-k2-product-jsonld')

  const structuredData = read('src/lib/productStructuredData.js')
  expect(structuredData).toContain("priceCurrency: 'PHP'")
  expect(structuredData).toContain('https://schema.org/InStock')
  expect(structuredData).toContain('https://schema.org/OutOfStock')
  expect(metadata).toContain("setMeta('property', 'og:type', product ? 'product' : 'website')")
  expect(metadata).toContain('resolveStorefrontMetadataOrigin')
  expect(PUBLIC_STOREFRONT_ORIGIN).toBe('https://www.k2jimzon.com')
  expect(resolveStorefrontMetadataOrigin({ origin: 'http://localhost:5173', hostname: 'localhost', isDev: true })).toBe('http://localhost:5173')
  expect(resolveStorefrontMetadataOrigin({ origin: 'https://k2jimzon.com', hostname: 'k2jimzon.com' })).toBe(PUBLIC_STOREFRONT_ORIGIN)
  expect(resolveStorefrontMetadataOrigin({ origin: 'https://preview.example.vercel.app', hostname: 'preview.example.vercel.app' })).toBe(PUBLIC_STOREFRONT_ORIGIN)
  expect(resolveStorefrontMetadataOrigin({ origin: 'https://staging.example.test', hostname: 'staging.example.test' })).toBe('https://staging.example.test')
})

test('the product page publishes Product, FAQ and Breadcrumb markup from one approved source', async () => {
  const { readFile } = await import('node:fs/promises')
  const metadata = await readFile(new URL('../src/components/StorefrontMetadata.jsx', import.meta.url), 'utf8')

  // The virtual store published FAQ markup while the product page -- the
  // canonical URL for the product, and the one the sitemap lists -- published
  // none. Both now read the same approved knowledge.
  expect(metadata).toContain('buildFaqStructuredData')
  expect(metadata).toContain('buildBreadcrumbStructuredData')
  expect(metadata).toContain('getProductKnowledge')

  // Knowledge loads after the catalog, so the markup has to be rewritten when
  // it lands rather than computed once on first render.
  expect(metadata).toContain('useProductKnowledgeVersion')
  expect(metadata).toMatch(/\[product, view, loading, unavailableSurface, knowledgeVersion\]/)

  // No social crawler renders SVG and Google refuses it for Product rich
  // results, so an unphotographed product must fall back to the raster card.
  expect(metadata).toContain("const SOCIAL_FALLBACK = '/og-card.png'")
  expect(metadata).not.toContain("|| '/icon.svg'")
})

test('breadcrumb markup is positional, absolute, and refuses an incomplete trail', async () => {
  const { buildBreadcrumbStructuredData } = await import('../src/lib/productStructuredData.js')
  const origin = 'https://www.k2jimzon.com'
  const url = `${origin}/product/caffe-milano-gold`
  const crumb = buildBreadcrumbStructuredData({ product: { name: 'Caffe Milano' }, origin, url })

  expect(crumb['@type']).toBe('BreadcrumbList')
  expect(crumb.itemListElement.map(entry => entry.position)).toEqual([1, 2, 3])
  expect(crumb.itemListElement.map(entry => entry.name)).toEqual(['Home', 'Catalog', 'Caffe Milano'])
  // Every item must be an absolute URL; a relative one is ignored by Google.
  for (const entry of crumb.itemListElement) expect(entry.item.startsWith(origin)).toBe(true)

  // A trail that cannot be resolved must produce nothing rather than markup
  // describing navigation that does not exist.
  expect(buildBreadcrumbStructuredData({ product: null, origin, url })).toBeNull()
  expect(buildBreadcrumbStructuredData({ product: { name: 'x' }, origin: '', url })).toBeNull()
})
