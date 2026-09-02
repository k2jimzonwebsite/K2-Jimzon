import { expect, test } from '@playwright/test'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import * as THREE from 'three'
import { buildShelves, toPlankRows, stockState } from '../src/components/shop/shelfModel.js'
import { disposePackageTextures, photoTexture } from '../src/components/shop/packageTexture.js'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

test('the production boundary rejects an Interactive Shop payload linked eagerly from the Storefront entry', async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'k2-map027-boundary-'))
  const distDir = join(fixtureRoot, 'dist')
  const manifestPath = join(distDir, '.vite', 'manifest.json')
  const verifierPath = fileURLToPath(new URL('../scripts/verify-build-boundary.mjs', import.meta.url))

  try {
    await mkdir(dirname(manifestPath), { recursive: true })
    await mkdir(join(distDir, 'assets'), { recursive: true })
    await writeFile(join(distDir, 'k2-build-target.json'), JSON.stringify({ target: 'storefront' }))
    await writeFile(manifestPath, JSON.stringify({
      'index.html': {
        file: 'assets/index.js',
        isEntry: true,
        imports: ['_InteractiveShop-eager.js'],
      },
      '_InteractiveShop-eager.js': {
        file: 'assets/InteractiveShop-eager.js',
        imports: [],
      },
    }))
    await writeFile(
      join(distDir, '404.html'),
      '<!doctype html><meta name="robots" content="noindex, nofollow"><main><h1>Page or product unavailable</h1><a href="/catalog">Catalog</a><a href="/contact">Contact</a></main>',
    )
    await writeFile(join(distDir, 'assets', 'index.js'), 'const reviewed = "http://localhost:9999";')
    await writeFile(join(distDir, 'assets', 'InteractiveShop-eager.js'), 'export default {};')

    const result = spawnSync(process.execPath, [verifierPath, 'storefront'], {
      cwd: fixtureRoot,
      encoding: 'utf8',
    })

    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/ordinary-route payload boundary/i)
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true })
  }
})

test('shelves group the canonical catalog and never drop a product', () => {
  const products = [
    { sku: 'A', category: 'Beverages' },
    { sku: 'B', category: 'Snack & Sweets' },
    { sku: 'C', category: 'Bath & Body' },
    { sku: 'D', category: 'Seasoning, Staple Foods & Baking Ingredients' },
    { sku: 'E', category: 'Something Nobody Mapped' },
    { sku: 'F', category: '' },
  ]

  const shelves = buildShelves(products)
  const placed = shelves.flatMap(shelf => shelf.products.map(p => p.sku))

  // An unmapped or missing category must fall into the overflow shelf rather
  // than disappearing from the shop.
  expect(placed.sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
  expect(shelves.find(s => s.id === 'everything-else').products.map(p => p.sku).sort()).toEqual(['E', 'F'])
})

test('the store opens at the counter, then only the shelves that have goods', () => {
  const shelves = buildShelves([{ sku: 'A', category: 'Beverages' }])

  // Concept §18 opens on Counter / Overview rather than dropping the customer
  // straight into a category.
  expect(shelves[0].id).toBe('counter')
  expect(shelves[0].isCounter).toBe(true)
  expect(shelves[0].products).toEqual([])

  // Categories with nothing on them are still omitted — no empty furniture.
  expect(shelves.map(s => s.id)).toEqual(['counter', 'coffee'])
})

test('New Arrivals appears only when the catalog actually flags something', () => {
  // Concept §18 allows the arrivals scene "only when real data supports it".
  const plain = buildShelves([{ sku: 'A', category: 'Beverages' }])
  expect(plain.map(s => s.id)).not.toContain('new-arrivals')

  const flagged = buildShelves([
    { sku: 'A', category: 'Beverages' },
    { sku: 'B', category: 'Snack & Sweets', is_featured: true },
  ])
  const arrivals = flagged.find(s => s.id === 'new-arrivals')
  expect(arrivals.products.map(p => p.sku)).toEqual(['B'])

  // It is a view of existing products, not a second listing: B still sits on
  // its own category shelf as well.
  expect(flagged.find(s => s.id === 'snacks').products.map(p => p.sku)).toEqual(['B'])
})

test('the store keeps Previous and Next shelf controls, not only dragging', async () => {
  // Concept §18: obvious navigation must exist beside the direct category
  // controls. Dragging the scene is an affordance, never the only route.
  const view = await read('../src/views/InteractiveShop.jsx')
  expect(view).toContain('k2-store-steps')
  expect(view).toContain('Previous shelf')
  expect(view).toContain('Next shelf')
})

test('the basket reads as a counter K2 will check, not an instant checkout', async () => {
  // Concept §16: K2 confirms stock, delivery and payment details afterwards.
  const basket = await read('../src/components/shop/StoreBasketDock.jsx')
  expect(basket).toContain('Send order request')
  expect(basket).toContain('K2 confirms stock and delivery before any payment details')
  expect(basket).not.toMatch(/pay now|checkout securely|complete payment/i)
})

test('an empty catalog produces no shelves at all', () => {
  expect(buildShelves([])).toEqual([])
  expect(buildShelves(null)).toEqual([])
})

test('plank rows split without padding empty slots', () => {
  expect(toPlankRows([1, 2, 3, 4, 5], 4)).toEqual([[1, 2, 3, 4], [5]])
  expect(toPlankRows([1, 2], 4)).toEqual([[1, 2]])
  expect(toPlankRows([], 4)).toEqual([])
})

test('unknown stock is never presented as sold out', () => {
  // The FEFO projection can be unavailable. Reporting that as `Sold out` would
  // assert an availability fact the catalog has not established.
  expect(stockState({ stock_available: null }).tone).toBe('unknown')
  expect(stockState({}).tone).toBe('unknown')
  expect(stockState({ stock_available: 'not-a-number' }).tone).toBe('unknown')

  expect(stockState({ stock_available: 0 }).tone).toBe('out')
  expect(stockState({ stock_available: 2 }).tone).toBe('low')
  expect(stockState({ stock_available: 40 }).tone).toBe('in')
})

test('the store is lazy in both entries so it never loads on landing', async () => {
  for (const entry of ['../src/StorefrontApp.jsx', '../src/App.jsx']) {
    const source = await read(entry)
    expect(source).toContain("lazy(() => import('./views/InteractiveShop'))")
    expect(source).toContain('store: InteractiveShop,')
  }
})

test('the shop reuses the canonical basket and never builds a second one', async () => {
  const view = await read('../src/views/InteractiveShop.jsx')
  const panel = await read('../src/components/shop/ShelfProductPanel.jsx')

  // It must call the shared cart, not hold quantities of its own.
  expect(view).toContain('addToCart(id)')
  expect(view).not.toMatch(/useState\(\s*\[\s*\]\s*\)\s*\/\/\s*cart/i)
  expect(view).not.toContain('localStorage')
  expect(panel).not.toContain('localStorage')

  // Prices and stock come from the projection, never from shop-local copies.
  expect(panel).toContain('product?.srp ?? product?.retail')
})

test('the shelf leads with usage, which is what a list view cannot do', async () => {
  const panel = await read('../src/components/shop/ShelfProductPanel.jsx')

  // Standing at a shelf, the question is what to do with the thing — not its
  // specification. These are the same approved fields the product page renders;
  // the shop only changes the emphasis.
  expect(panel).toContain("{ key: 'uses'")
  expect(panel).toContain("{ key: 'pairings'")
  expect(panel).toContain("{ key: 'preparation'")
  expect(panel).toContain('People ask')

  // Still one source: the panel must not carry its own answer content.
  expect(panel).toContain("from '../../lib/productKnowledge'")
  expect(panel).not.toMatch(/const\s+(FAQS|ANSWERS|USAGE_TEXT)\s*=/)

  // An item with no approved usage says so rather than inventing ideas.
  expect(panel).toContain('No usage notes for this one yet')
})

test('the 3D scene degrades to a usable store in every failure mode', async () => {
  const view = await read('../src/views/InteractiveShop.jsx')
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')

  // WebGL is lazy inside the already-lazy /store route, so a visitor who never
  // enters the store — or enters without WebGL — never downloads three.js.
  expect(view).toContain("lazy(() => import('../components/shop/ShelfScene3D'))")
  expect(view).toContain('detectWebgl')
  expect(view).toContain('prefers-reduced-motion: reduce')
  expect(view).toContain('getDerivedStateFromError')

  // The scene is decoration; this rail is the real interface and is rendered
  // whether or not WebGL drew anything.
  expect(view).toContain('aria-pressed={selectedSku === id}')
  expect(view).toContain('k2-store-rail')
  expect(scene).toContain('aria-hidden="true"')
})

test('the store is its own full frame, not a section of the catalog page', async () => {
  const view = await read('../src/views/InteractiveShop.jsx')
  const css = await read('../src/interactive-store.css')

  // Own room: fixed to the viewport, above the site chrome, one way out.
  expect(css).toContain('.k2-store {')
  expect(css).toContain('position: fixed')
  expect(view).toContain('Leave the store')
  expect(view).toContain("event.key !== 'Escape'")
  expect(view).toContain('event.preventDefault()')
  expect(view).toContain('leaveStore()')

  // The catalog remains the default surface; the store never replaces it.
  const catalog = await read('../src/views/Catalog.jsx')
  expect(catalog).toContain('<CatalogGrid />')
})

test('the optional store owns its CSS instead of charging every route for it', async () => {
  const view = await read('../src/views/InteractiveShop.jsx')
  const globalCss = await read('../src/index.css')

  expect(view).toContain("import '../interactive-store.css'")
  expect(globalCss).not.toContain('.k2-store {')
})

test('the virtual store owns the page main landmark', async () => {
  const shop = await read('../src/views/InteractiveShop.jsx')
  expect(shop).toContain('<main className="k2-store" aria-label="K2 virtual store">')
  expect(shop).toContain('</main>')
  expect(shop).not.toContain('className="k2-store" role="region"')
})

test('every item carries its own face without fetching a font or an HDR', async () => {
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')
  const texture = await read('../src/components/shop/packageTexture.js')

  // Product photo first, generated label second — never a blank package.
  expect(texture).toContain('export function photoTexture')
  expect(texture).toContain('export function labelTexture')
  expect(scene).toContain('photoTexture(product')
  expect(scene).toContain('labelTexture(product)')

  // No external network dependency in the scene: drei's <Text> fetches a font
  // and <Environment> fetches an HDR from a CDN the production CSP forbids.
  expect(scene).not.toMatch(/<Text[\s>]/)
  expect(scene).not.toMatch(/<Environment[\s/>]/)

  // GPU textures are released when the store closes.
  expect(texture).toContain('export function disposePackageTextures')
  expect(scene).toContain('disposePackageTextures()')
})

test('a failed product photo settles on the generated-label path instead of retrying forever', async () => {
  const originalLoad = THREE.TextureLoader.prototype.load
  let attempts = 0

  THREE.TextureLoader.prototype.load = function load(_source, _onLoad, _onProgress, onError) {
    attempts += 1
    const texture = new THREE.Texture()
    queueMicrotask(() => onError?.(new Error('blocked image')))
    return texture
  }

  try {
    const product = { sku: 'blocked-photo', img: 'https://images.invalid/product.jpg' }
    await new Promise(resolve => {
      expect(photoTexture(product, resolve)).toBeInstanceOf(THREE.Texture)
    })

    // `null` is the explicit signal Package uses to select labelTexture.
    expect(photoTexture(product)).toBeNull()
    expect(attempts).toBe(1)

    // A corrected image URL for the same SKU is a new source and must get one
    // real attempt without forcing the customer to leave and re-enter /store.
    expect(photoTexture({ ...product, img: 'https://images.invalid/replacement.jpg' }))
      .toBeInstanceOf(THREE.Texture)
    expect(attempts).toBe(2)
    await new Promise(resolve => queueMicrotask(resolve))
  } finally {
    THREE.TextureLoader.prototype.load = originalLoad
    disposePackageTextures()
  }
})

test('the K2 shopkeeper explains the shelf without simulating a person', async () => {
  const keeper = await read('../src/components/shop/StoreKeeper.jsx')

  // It speaks only from the shelf model and approved knowledge.
  expect(keeper).toContain('getProductKnowledge')
  expect(keeper).toContain('shelf.blurb')

  // No presence claim, no reply-time promise, no generated answer.
  expect(keeper).toContain('Messages are reviewed during Manila business hours')
  expect(keeper).not.toMatch(/online now|is typing|typically replies|responds within/i)

  // Anything it cannot answer goes to a real person through the canonical
  // boundary. The keeper now carries only the customer's words; the store owns
  // the product context and builds the bounded handoff, so that is where the
  // boundary is asserted.
  expect(keeper).toContain('onAskStaff')

  const shop = await read('../src/views/InteractiveShop.jsx')
  expect(shop).toContain('buildStaffHandoffContext')

  // And the conversation stays in the store rather than navigating the customer
  // out to the messages page mid-shop.
  expect(shop).toContain('StoreChatPanel')
  expect(shop).not.toMatch(/askStaffAboutProduct\s*[,}]/)
})

test('the store is an aisle the camera travels, not one orbited shelf', async () => {
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')
  const view = await read('../src/views/InteractiveShop.jsx')

  // Every category is a bay in one run, and the camera moves laterally between
  // them: looking left goes to the previous shelf rather than spinning in place.
  expect(scene).toContain('BAY_SPACING')
  expect(scene).toContain('function AisleCamera')
  expect(scene).toContain('camera.position.x +=')
  expect(view).toContain('shelves={shelves}')
  expect(view).toContain('onShelfChange={goToShelf}')

  // Still bounded: travel is clamped to the run and the camera always faces the
  // shelving, so there is no free world, walking, or turning away.
  expect(scene).toContain('Math.min(bayCount - 1')
  expect(scene).toContain('camera.lookAt')

  // The scene carries no price or stock logic of its own.
  expect(scene).toContain("from './shelfModel'")
})

test('selection works across the whole aisle, not just the shelf in view', async () => {
  const view = await read('../src/views/InteractiveShop.jsx')
  // Every bay renders, so a click can land on a neighbouring shelf's item.
  expect(view).toContain('for (const shelf of shelves)')
  expect(view).toContain('shelves.findIndex')
})

test('room materials are generated, never fetched', async () => {
  const room = await read('../src/components/shop/roomTextures.js')
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')

  expect(room).toContain('export function marbleTexture')
  expect(room).toContain('export function signTexture')
  expect(scene).toContain('marbleTexture(')
  expect(scene).toContain('signTexture(')

  // Deterministic: the stone must not reshuffle between visits.
  expect(room).not.toContain('Math.random')
  expect(room).toContain('export function disposeRoomTextures')
  expect(scene).toContain('disposeRoomTextures()')
})

test('the shop entry is an explicit choice that does not replace the catalog list', async () => {
  const catalog = await read('../src/views/Catalog.jsx')
  expect(catalog).toContain("go('store')")
  expect(catalog).toContain('Enter the store')
  // The list view must still render its grid.
  expect(catalog).toContain('<CatalogGrid />')
})
