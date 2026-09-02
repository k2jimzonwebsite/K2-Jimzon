import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  CM_PER_UNIT, describeMeasurement, detectForm, measureForScene, measureProduct, parseQuantity,
} from '../src/components/shop/productDimensions.js'
import { facingsFor, packRows } from '../src/components/shop/shelfLayout.js'
import { selectPublicKnowledge, KNOWLEDGE_STATUS } from '../src/lib/productKnowledge.js'
import {
  approveDraft, assetGapsFor, buildAssetRequest, draftFromResearch, hasShelfImage, planStoreAssets,
} from '../src/lib/storeAssetPlan.js'
import {
  buildFaqStructuredData, buildProductStructuredData,
} from '../src/lib/productStructuredData.js'
import {
  CLOUD, COUNTER, FLOOR_Y, KEEPER, ZOOM_MAX, ZOOM_MIN,
  clampZoom, cm, computeFraming, visibleHeight,
} from '../src/components/shop/keeperRig.js'
import { deriveStoreMoment } from '../src/components/shop/storeGuideState.js'
import { COUNTER_SCENE, SHELF_DEFINITIONS, buildShelves } from '../src/components/shop/shelfModel.js'

const read = path => readFile(new URL(path, import.meta.url), 'utf8')

/**
 * Source with comments stripped.
 *
 * A presence check has to look at what the component can actually say, not at
 * prose describing the rule. Without this, a comment reading "does not claim to
 * be online" fails the very assertion it documents.
 */
const readCode = async (path) => (await read(path))
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')

/* -------------------------------------------------------------------------
   Automatic measurement
   ------------------------------------------------------------------------- */

test('a declared pack size is read into a real quantity', async () => {
  expect(parseQuantity('1 kg bag')).toMatchObject({ value: 1000, unit: 'g' })
  expect(parseQuantity('600 g jar')).toMatchObject({ value: 600, unit: 'g' })
  expect(parseQuantity('85 ml')).toMatchObject({ value: 85, unit: 'ml' })
  expect(parseQuantity('0.5 l')).toMatchObject({ value: 500, unit: 'ml' })

  // A multipack is the product of its factors, not one unit.
  expect(parseQuantity('2 × 80 g')).toMatchObject({ value: 160, unit: 'g', packCount: 2 })

  // A piece count is not a quantity.
  expect(parseQuantity('304 g · 22 pcs')).toMatchObject({ value: 304, unit: 'g' })

  // Nothing measurable is a real answer, not a zero.
  expect(parseQuantity('assorted')).toBeNull()
  expect(parseQuantity('')).toBeNull()
})

test('package form is detected on word boundaries, not substrings', async () => {
  // The bug this guards: "Barilla" contains "bar", which made a 500 g pasta box
  // a chocolate bar and drew it 1 cm deep on the shelf.
  expect(detectForm({ name: 'Barilla Spaghetti N°5', size: '500 g' })).toBe('box')
  expect(detectForm({ name: 'Lindt Bianco', size: '100 g bar' })).toBe('bar')

  // The declared field wins over anything inferred from free text.
  expect(detectForm({ package_type: 'Glass Jar', size: '400 g', name: 'Something bar' })).toBe('jar')

  // A volume in an unnamed container is a bottle, not a box.
  expect(detectForm({ size: '500 ml' })).toBe('bottle')
})

test('derived dimensions land near the real packages they describe', async () => {
  // A 1 kg foil coffee bag is roughly 15 x 30 x 7 cm in the hand.
  const coffee = measureProduct({ size: '1 kg bag', package_type: 'Foil Valve Bag' })
  expect(coffee.heightCm).toBeGreaterThan(24)
  expect(coffee.heightCm).toBeLessThan(34)
  expect(coffee.widthCm).toBeGreaterThan(11)
  expect(coffee.widthCm).toBeLessThan(19)
  expect(coffee.confidence).toBe('derived')

  // A 400 g hazelnut jar is roughly 7.5 cm across and 11 cm tall.
  const jar = measureProduct({ size: '400 g jar' })
  expect(jar.round).toBe(true)
  expect(jar.widthCm).toBeGreaterThan(5.5)
  expect(jar.widthCm).toBeLessThan(9.5)
  expect(jar.heightCm).toBeLessThan(14)

  // The point of the whole module: a bar and a coffee bag are not the same box.
  const bar = measureProduct({ size: '43 g bar' })
  expect(bar.heightCm).toBeLessThan(coffee.heightCm / 2)
  expect(bar.depthCm).toBeLessThan(coffee.depthCm)
})

test('an unmeasurable product still stands on the shelf, and says the size was assumed', async () => {
  const assumed = measureProduct({ name: 'Mystery item', package_type: 'jar' })
  expect(assumed.confidence).toBe('assumed')
  expect(assumed.heightCm).toBeGreaterThan(0)
  expect(assumed.widthCm).toBeGreaterThan(0)

  // An assumed size is never shown to a customer as a dimension.
  expect(describeMeasurement({ name: 'Mystery item', package_type: 'jar' })).toBeNull()
  expect(describeMeasurement({ size: '400 g jar' })).toContain('approx.')
})

test('a bad size string cannot produce a package taller than the bay', async () => {
  // A case weight mistakenly entered as a unit weight.
  const clamped = measureProduct({ size: '25 kg bag' })
  expect(clamped.heightCm).toBeLessThanOrEqual(32)
  expect(clamped.widthCm).toBeLessThanOrEqual(22)

  // And it still fits inside a shelf row once converted to scene units.
  const scene = measureForScene({ size: '25 kg bag' })
  expect(scene.height).toBeLessThan(2.9)
  expect(scene.height).toBeCloseTo(clamped.heightCm / CM_PER_UNIT, 5)
})

/* -------------------------------------------------------------------------
   Shelf packing
   ------------------------------------------------------------------------- */

test('a shelf is packed by width and never overflows its bay', async () => {
  const products = Array.from({ length: 14 }, (_, index) => ({
    id: `sku-${index}`, name: `Item ${index}`, size: '400 g', stock: 30,
  }))

  const rows = packRows(products, 15)
  expect(rows.length).toBeGreaterThan(1)

  for (const row of rows) {
    const width = row.items.reduce((sum, item) => sum + item.measurement.width, 0)
    // The usable run is the bay minus the clearance kept at each end.
    expect(width).toBeLessThanOrEqual(15)
    // Positions stay inside the bay.
    for (const item of row.items) {
      expect(Math.abs(item.x)).toBeLessThan(15 / 2)
    }
  }
})

test('facings come from real stock, so a nearly sold out line does not look full', async () => {
  const measurement = measureForScene({ size: '400 g' })

  expect(facingsFor({ stock_available: 64 }, measurement)).toBeGreaterThan(
    facingsFor({ stock_available: 2 }, measurement),
  )
  // Sold out is a single facing and an honest gap on the shelf.
  expect(facingsFor({ stock_available: 0 }, measurement)).toBe(1)
  // No line may take the whole bay.
  expect(facingsFor({ stock_available: 100000 }, measurement)).toBeLessThanOrEqual(4)
})

/* -------------------------------------------------------------------------
   The approval gate on generated assets
   ------------------------------------------------------------------------- */

test('generated store assets are never public until a person approves them', async () => {
  const drafted = draftFromResearch({
    copy: { card_description: 'A dark, cocoa-forward espresso blend.' },
    usage: {
      summary: 'Espresso, moka, or long black.',
      pairings: ['biscotti'],
      storage: 'Keep sealed.',
      use_cases: [{ title: 'Morning espresso', best_for: 'A short, dense shot.' }],
    },
    seo: { seo_title: 'Caffè Milano 1 kg', meta_description: 'Italian beans, Manila stock.' },
  }, { model: 'test' })

  // Everything produced is a draft, carrying its provenance.
  expect(Object.keys(drafted.fields).length).toBeGreaterThan(0)
  for (const record of Object.values(drafted.fields)) {
    expect(record.status).toBe(KNOWLEDGE_STATUS.DRAFT)
    expect(record.provenance.source).toBe('generated')
  }
  expect(drafted.faqs.every(faq => faq.status === KNOWLEDGE_STATUS.DRAFT)).toBe(true)

  // The gate: not one word of it reaches a customer.
  const published = selectPublicKnowledge(drafted, 'caffe-milano-gold')
  expect(published.hasAny).toBe(false)
  expect(Object.keys(published.fields)).toHaveLength(0)
  expect(published.faqs).toHaveLength(0)
})

test('approval records whether a person edited the copy before publishing it', async () => {
  const drafted = draftFromResearch({ copy: { card_description: 'Draft text.' } }, { model: 'test' })

  const asWritten = approveDraft(drafted.fields.description, {
    value: 'Draft text.', approvedBy: 'staff:jimzon',
  })
  expect(asWritten.status).toBe(KNOWLEDGE_STATUS.APPROVED)
  expect(asWritten.provenance.source).toBe('generated-approved')
  expect(asWritten.provenance.approvedBy).toBe('staff:jimzon')

  const rewritten = approveDraft(drafted.fields.description, {
    value: 'A person rewrote this.', approvedBy: 'staff:jimzon',
  })
  expect(rewritten.provenance.source).toBe('generated-edited')
  expect(rewritten.value).toBe('A person rewrote this.')

  // Once approved, it is public — that is the only path to publication.
  const published = selectPublicKnowledge({ fields: { description: rewritten }, faqs: [] }, 'x')
  expect(published.fields.description).toBe('A person rewrote this.')
})

test('the asset queue is derived from inventory and ranks what customers can see', async () => {
  const catalog = [
    { id: 'in-stock-empty', name: 'In stock, nothing written', stock_available: 40 },
    { id: 'no-stock-empty', name: 'No stock, nothing written', stock_available: 0 },
  ]
  const plan = planStoreAssets(catalog, () => selectPublicKnowledge(null, ''))

  expect(plan.total).toBe(2)
  expect(plan.blockingCustomers).toBe(2)
  // A product people can actually buy outranks one they cannot.
  expect(plan.items[0].sku).toBe('in-stock-empty')
  expect(plan.items[0].priority).toBe('urgent')
  expect(plan.items[1].priority).toBe('high')

  // A fully approved product drops off the queue rather than sitting on it.
  // It needs a shelf photograph as well as approved copy, because without one
  // the store draws a label instead of the pack.
  const withPhotos = catalog.map((entry) => ({ ...entry, img: '/images/mock/pack.jpg' }))
  const complete = planStoreAssets(withPhotos, () => selectPublicKnowledge({
    fields: Object.fromEntries(
      ['description', 'uses', 'pairings', 'preparation', 'storage', 'seoTitle', 'metaDescription']
        .map(key => [key, { status: KNOWLEDGE_STATUS.APPROVED, value: 'written' }]),
    ),
    faqs: [{ status: KNOWLEDGE_STATUS.APPROVED, question: 'Q', answer: 'A' }],
  }, ''), )
  expect(complete.total).toBe(0)
})

test('a generation request carries established facts and never asks for availability', async () => {
  const [item] = planStoreAssets(
    [{ id: 'sku', name: 'Caffè Milano', size: '1 kg bag', stock_available: 5, barcode: '8050039988776' }],
    () => selectPublicKnowledge(null, ''),
  ).items

  const request = buildAssetRequest(item)
  expect(request.facts.name).toBe('Caffè Milano')
  expect(request.facts.barcode).toBe('8050039988776')
  // Only the gaps are requested, so approved copy is never regenerated.
  expect(request.missing.map(entry => entry.field)).toContain('description')

  const constraints = request.constraints.join(' ').toLowerCase()
  expect(constraints).toContain('do not invent')
  expect(constraints).toContain('do not state stock, price, delivery time, or availability')

  // Nothing about stock or price leaks into what the generator is told.
  const serialised = JSON.stringify(request.facts)
  expect(serialised).not.toContain('stock_available')
  expect(serialised).not.toContain('srp')
})

test('a product with approved copy only reports the assets it is actually missing', async () => {
  const knowledge = selectPublicKnowledge({
    fields: { description: { status: KNOWLEDGE_STATUS.APPROVED, value: 'Written.' } },
    faqs: [],
  }, 'sku')

  const gaps = assetGapsFor({ id: 'sku' }, knowledge).map(gap => gap.key)
  expect(gaps).not.toContain('description')
  expect(gaps).toContain('uses')
})

/* -------------------------------------------------------------------------
   SEO
   ------------------------------------------------------------------------- */

test('structured data states only what the catalog has established', async () => {
  const markup = buildProductStructuredData({
    product: {
      id: 'sku', name: 'Caffè Milano', retail: 1899, stock: 25,
      barcode: '8050039988776', brand_id: 'Caffè Milano', country_of_origin: 'Italy',
    },
    description: 'Italian espresso beans.',
    image: 'https://example.test/a.jpg',
    url: 'https://example.test/product/sku',
  })

  expect(markup.offers.price).toBe('1899.00')
  expect(markup.offers.availability).toBe('https://schema.org/InStock')
  expect(markup.gtin13).toBe('8050039988776')

  // No rating, no review count — we collect neither, and claiming them is a
  // manual action rather than a growth tactic.
  expect(markup.aggregateRating).toBeUndefined()
  expect(markup.review).toBeUndefined()

  // A malformed barcode is omitted rather than emitted as an invalid GTIN.
  const shortCode = buildProductStructuredData({
    product: { id: 'x', name: 'X', barcode: '123' }, url: 'https://example.test/x',
  })
  expect(shortCode.gtin13).toBeUndefined()

  // Unknown stock is not asserted as out of stock, which would suppress a
  // listing for something sitting in the Manila room.
  const unknown = buildProductStructuredData({
    product: { id: 'x', name: 'X' }, url: 'https://example.test/x',
  })
  expect(unknown.offers.availability).toBeUndefined()
})

test('FAQ markup is built only from approved answers, and never empty', async () => {
  expect(buildFaqStructuredData([])).toBeNull()
  expect(buildFaqStructuredData([{ question: 'Q', answer: '' }])).toBeNull()

  const markup = buildFaqStructuredData([{ question: 'Is it ground?', answer: 'Whole bean.' }])
  expect(markup['@type']).toBe('FAQPage')
  expect(markup.mainEntity).toHaveLength(1)
})

test('the store points search engines at the product page, not the store route', async () => {
  const panel = await read('../src/components/shop/StoreSeoPanel.jsx')
  // Pointing the offer at /store would compete with the product page for the
  // same result and split its ranking signals.
  expect(panel).toContain('/product/')
  expect(panel).not.toMatch(/new URL\(\s*['"`]\/store/)
})

/* -------------------------------------------------------------------------
   In-store conversation and overlays
   ------------------------------------------------------------------------- */

test('the conversation happens in the store and claims no one is waiting', async () => {
  const chat = await read('../src/components/shop/StoreChatPanel.jsx')
  const chatCode = await readCode('../src/components/shop/StoreChatPanel.jsx')

  // The canonical guest boundary, not a store-only inbox.
  expect(chat).toContain('startGuestConversation')
  expect(chat).toContain('replyToGuestConversation')
  expect(chat).toContain('TurnstileChallenge')

  // No presence claim, no typing indicator, no reply-time promise.
  expect(chatCode).not.toMatch(/online now|is typing|typically replies|responds within|we will reply in/i)

  // It never navigates the customer out of the store.
  expect(chat).not.toContain("go('messages')")
})

test('the FAQ sheet collects approved answers only, and keeps the rail intact', async () => {
  const faq = await read('../src/components/shop/StoreFaqPanel.jsx')
  // One knowledge source; the approval gate is applied by the projection.
  expect(faq).toContain('getProductKnowledge')

  const shop = await read('../src/views/InteractiveShop.jsx')
  // Both long surfaces open over the scene rather than stacking into the rail.
  expect(shop).toContain('StoreSheet')
  expect(shop).toContain("setSheet('faq')")
})

test('closing a panel does not walk the customer out of the store', async () => {
  const sheet = await read('../src/components/shop/StoreSheet.jsx')
  // The sheet stops Escape reaching the store's own handler.
  expect(sheet).toContain('stopPropagation')

  const shop = await read('../src/views/InteractiveShop.jsx')
  // And the store refuses to act on Escape while a sheet is open.
  expect(shop).toMatch(/if \(sheet\) return/)
})

test('the shopkeeper is drawn, wears the K2 cap, and rests under reduced motion', async () => {
  const avatar = await read('../src/components/shop/StoreKeeperAvatar.jsx')
  // A drawing, not a photograph or a rendered human: it must not imply that a
  // specific named employee is sitting there.
  expect(avatar).toContain('K2')
  expect(avatar).toMatch(/role="img"/)
  expect(avatar).toContain('aria-label')

  const css = await read('../src/interactive-store.css')
  expect(css).toContain('k2-keeper-blink')
  // Idle motion is disabled wholesale for a visitor who asked for stillness.
  const reducedMotionBlocks = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\{[^}]*\}[^}]*\}/g) || []
  expect(reducedMotionBlocks.some(block => block.includes('k2-keeper'))).toBe(true)
})

test('room and package materials are still generated, never fetched', async () => {
  const room = await read('../src/components/shop/roomTextures.js')
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')

  // The production CSP forbids external asset hosts; a store that cannot render
  // offline is not a store.
  for (const source of [room, scene]) {
    expect(source).not.toMatch(/https?:\/\/(?!schema\.org)/)
  }
})

/* -------------------------------------------------------------------------
   The shopkeeper as a character in the room
   ------------------------------------------------------------------------- */

test('the shopkeeper stands in the scene rather than beside it', async () => {
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')
  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')
  const keeperCode = await readCode('../src/components/shop/StoreKeeper3D.jsx')

  // She belongs to the aisle and follows the active bay instead of being
  // stranded in the counter scene when the shopper moves.
  expect(scene).toContain('StoreKeeper3D')
  expect(scene).toContain('targetBay={activeIndex}')
  expect(scene).toMatch(/activeIndex \* BAY_SPACING/)

  // Built from geometry, not a sprite pinned to the camera.
  expect(keeper).toContain('sphereGeometry')
  expect(keeper).toContain('capsuleGeometry')

  // Still unmistakably a drawing: no presence claim, no typing, no promise.
  expect(keeperCode).not.toMatch(/online|is typing|typically replies|responds within/i)
})

test('the welcome is a greeting, not a permanent animation', async () => {
  const shop = await read('../src/views/InteractiveShop.jsx')
  const moments = await read('../src/components/shop/storeGuideState.js')

  // She waves once on arrival at the counter and the greeting clears itself.
  // The wording is asserted by the invitation test; this one guards the
  // behaviour, so re-writing the copy does not fail it.
  expect(moments).toContain("gesture: 'wave'")
  expect(shop).toMatch(/setGreeted\(true\)/)
  expect(moments).toContain("gesture: 'rest'")
  // The wave is bound to the counter, so it does not replay on every shelf.
  expect(moments).toMatch(/!greeted && shelf\?\.isCounter/)
})

test('the keeper blinks irregularly, because a metronome reads as a machine', async () => {
  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')
  expect(keeper).toMatch(/Math\.random\(\)/)
  expect(keeper).toContain('useBlink')
})

/* -------------------------------------------------------------------------
   The room
   ------------------------------------------------------------------------- */

test('the room is clad in marble rather than painted flat', async () => {
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')
  const room = await read('../src/components/shop/roomTextures.js')

  expect(room).toContain('wallMarbleTexture')
  // Walls, bay backs, counter front and floor all carry stone.
  const cladCount = (scene.match(/wallMarbleTexture\(/g) || []).length
  expect(cladCount).toBeGreaterThanOrEqual(4)

  // Each bay draws a different seed, so the veining never tiles down the run.
  expect(scene).toMatch(/wallMarbleTexture\(index \+ 3\)/)

  // Still drawn at runtime — the CSP forbids fetching stone from anywhere.
  expect(room).not.toMatch(/https?:\/\//)
})

test('the lamps are visible in frame, not invisible points', async () => {
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')
  // The earlier fitting was a bare rod with a point light at the end, which is
  // why the counter read as an unlit room.
  expect(scene).toContain('function Pendant')
  expect(scene).toContain('emissive')
})

/* -------------------------------------------------------------------------
   Store conversations reaching the admin inbox
   ------------------------------------------------------------------------- */

test('a conversation started at a shelf is tagged as such end to end', async () => {
  const panel = await read('../src/components/shop/StoreChatPanel.jsx')
  const route = await read('../prepared-api/storefront/conversation.js')
  const migration = await read('../supabase/migrations/20260828_store_conversation_origin.sql')

  // The store says where it is.
  expect(panel).toContain("origin: 'virtual_store'")

  // The boundary accepts it only as one of a closed set — a label staff rely on
  // must not be writable as free text.
  expect(route).toContain('CONVERSATION_ORIGINS')
  expect(route).toContain('enumerated')

  // And the database constrains it again rather than trusting its caller.
  expect(migration).toContain("v_origin not in ('storefront','virtual_store')")
  expect(migration).toContain("v_platform := 'Virtual Store'")

  // The signature is unchanged, so no grant has to be dropped and re-added.
  expect(migration).toContain('p_guest_grant_hash text default null')
  expect(migration).not.toMatch(/revoke all on function public\.start_guest_conversation_v1/)
})

test('an older client that sends no origin still works and is labelled honestly', async () => {
  const route = await read('../prepared-api/storefront/conversation.js')
  const migration = await read('../supabase/migrations/20260828_store_conversation_origin.sql')

  // Absent origin resolves to the plain storefront at both layers.
  expect(route).toMatch(/enumerated\(body\.origin, 'ORIGIN', CONVERSATION_ORIGINS, 'storefront'\)/)
  expect(migration).toContain("coalesce(v_payload->>'origin','storefront')")
})

test('the admin inbox marks a shelf-side question without relying on colour alone', async () => {
  const inbox = await read('../src/views/admin/Inbox.jsx')
  const meta = await read('../src/lib/channelMeta.js')

  expect(meta).toContain("'Virtual Store'")
  expect(inbox).toContain('isFromVirtualStore')
  // A drawn mark and a worded label accompany the brass, so the distinction
  // survives a monochrome display and a colour-blind reader.
  expect(inbox).toContain('ShelfMark')
  expect(inbox).toContain('Asked at the shelf')
})

/* -------------------------------------------------------------------------
   Scale and framing

   These exist because the failure they guard was invisible: the shopkeeper
   shipped 34 cm tall and the camera cropped the floor away, and both looked
   like ordinary code. The numbers now live in `keeperRig` so they can be
   checked without a GPU.
   ------------------------------------------------------------------------- */

test('the shopkeeper is a person, not a doll on the shelf', async () => {
  // The bug: a 2.6-unit figure in a two-metre aisle.
  const heightUnits = cm(KEEPER.totalCm)
  expect(KEEPER.totalCm).toBeGreaterThan(150)
  expect(KEEPER.totalCm).toBeLessThan(185)
  expect(heightUnits * CM_PER_UNIT).toBeCloseTo(KEEPER.totalCm, 6)

  // Six-ish heads tall: stylised but adult, not a three-head chibi.
  const heads = KEEPER.totalCm / (KEEPER.headRadiusCm * 2)
  expect(heads).toBeGreaterThan(5)
  expect(heads).toBeLessThan(7.5)

  // The skeleton runs in the right order, feet upward.
  expect(KEEPER.hipCm).toBeLessThan(KEEPER.torsoCm)
  expect(KEEPER.torsoCm).toBeLessThan(KEEPER.shoulderCm)
  expect(KEEPER.shoulderCm).toBeLessThan(KEEPER.neckCm)
  expect(KEEPER.neckCm).toBeLessThan(KEEPER.headCm)
  // Her head has to fit under her stated height.
  expect(KEEPER.headCm + KEEPER.headRadiusCm).toBeLessThanOrEqual(KEEPER.totalCm)
})

test('she can be seen over the counter she stands behind', async () => {
  // The counter was also laid out by eye and came out 34 cm tall.
  expect(COUNTER.heightCm).toBeGreaterThan(80)
  expect(COUNTER.heightCm).toBeLessThan(105)

  const counterTop = FLOOR_Y + cm(COUNTER.heightCm)
  const headCentre = FLOOR_Y + cm(KEEPER.headCm)
  // Her whole head clears the counter top.
  expect(headCentre - cm(KEEPER.headRadiusCm)).toBeGreaterThan(counterTop)
  // But she is standing behind it, not towering absurdly over it.
  expect((headCentre - counterTop) * CM_PER_UNIT).toBeLessThan(80)
})

test('the default view shows the floor, the counter and the top of the bay', async () => {
  const height = 5 * 2.9 + 1.8
  const framing = computeFraming({ height })
  const span = visibleHeight(framing.distance)
  const bottom = framing.target - span / 2
  const top = framing.target + span / 2

  // The bug this replaces: a fixed distance of 15 framed y from 2.4 upward, so
  // the floor, the counter plinth and her legs were all below the frame.
  expect(bottom).toBeLessThan(FLOOR_Y)
  expect(top).toBeGreaterThan(height)

  // And everything that matters sits inside the frame.
  const counterTop = FLOOR_Y + cm(COUNTER.heightCm)
  const headTop = FLOOR_Y + cm(KEEPER.headCm) + cm(KEEPER.headRadiusCm)
  for (const y of [FLOOR_Y, counterTop, headTop]) {
    expect(y).toBeGreaterThan(bottom)
    expect(y).toBeLessThan(top)
  }
})

test('framing holds for a short bay as well as a tall one', async () => {
  for (const rows of [3, 4, 5]) {
    const height = rows * 2.9 + 1.8
    const framing = computeFraming({ height })
    const span = visibleHeight(framing.distance)
    expect(framing.target - span / 2).toBeLessThan(FLOOR_Y)
    expect(framing.target + span / 2).toBeGreaterThan(height)
  }
})

test('zoom is bounded so the customer cannot leave the room', async () => {
  expect(clampZoom(99)).toBe(ZOOM_MAX)
  expect(clampZoom(-4)).toBe(ZOOM_MIN)
  expect(clampZoom(0.7)).toBeCloseTo(0.7, 6)

  const framing = computeFraming({ height: 5 * 2.9 + 1.8 })
  // Zoomed all the way in still frames more than a single shelf, and all the
  // way out still fits inside the run rather than drifting off into fog.
  const nearSpan = visibleHeight(framing.distance * ZOOM_MIN)
  const farSpan = visibleHeight(framing.distance * ZOOM_MAX)
  expect(nearSpan).toBeGreaterThan(2.9)
  expect(farSpan).toBeLessThan(60)
  expect(nearSpan).toBeLessThan(farSpan)
})

test('the room and the character are laid out against one scale', async () => {
  const rig = await read('../src/components/shop/keeperRig.js')
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')
  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')

  // `productDimensions` sizes the goods at 13 cm per unit; the room has to
  // agree, or the shelves and the people on them belong to different worlds.
  expect(CM_PER_UNIT).toBe(13)
  // The room re-exports the goods' scale rather than declaring its own.
  expect(rig).toContain("export { CM_PER_UNIT } from './productDimensions.js'")

  // Neither component may reintroduce a private scale.
  for (const source of [scene, keeper]) {
    expect(source).toContain("from './keeperRig'")
    expect(source).not.toMatch(/const\s+UNITS_PER_CM\s*=/)
  }
})

test('the face cannot be buried by the hair again', async () => {
  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')

  // The face patch must stay inside the gap cut in the hair, or the hairline
  // crops the cheeks. Both numbers are read from the source so a later tweak to
  // either one cannot quietly reintroduce the clash.
  const facePhi = Number(keeper.match(/const FACE_PHI = ([\d.]+)/)[1])
  const opening = Number(keeper.match(/const opening = ([\d.]+)/)[1])
  expect(facePhi / 2).toBeLessThan(opening)
  // The original bug: a full hair sphere at a larger radius than the face. The
  // shell now has the front cut out of it, so there is no geometry in front of
  // her face to occlude it however the radii are later tuned.
  expect(keeper).toMatch(/Math\.PI \/ 2 \+ opening, Math\.PI \* 2 - opening \* 2/)
  // The face shell hugs the skull rather than floating in front of it, and is
  // narrower than the hair opening so the hairline cannot clip the features.
  expect(keeper).toContain('FACE_PHI')
  expect(keeper).toMatch(/HEAD_R \* 1\.012/)
})

test('zoom is reachable without a wheel', async () => {
  const shop = await read('../src/views/InteractiveShop.jsx')
  // A wheel gesture is neither discoverable nor keyboard-reachable, so the
  // buttons are the real control.
  expect(shop).toContain('Zoom in')
  expect(shop).toContain('Zoom out')
  expect(shop).toContain('zoomRequest')
})

test('the portrait leads a functional pop-out guide', async () => {
  const panel = await read('../src/components/shop/StoreKeeper.jsx')
  const avatar = await read('../src/components/shop/StoreKeeperAvatar.jsx')

  // The portrait is now the control that opens and tucks away the guide.
  expect(panel).toContain('k2-store-guide-toggle')
  expect(panel).toContain('aria-expanded={open}')
  expect(panel).toContain('k2-store-guide-panel')

  // Large enough to read as a portrait, and shaded rather than flat.
  expect(avatar).toMatch(/size = 1[5-9]\d/)
  expect(avatar).toContain('radialGradient')
  expect(avatar).toContain('feDropShadow')
})

/* -------------------------------------------------------------------------
   The counter as a character scene
   ------------------------------------------------------------------------- */

test('the counter frames a person, not a two-metre shelf run', async () => {
  const height = 5 * 2.9 + 1.8
  const shelf = computeFraming({ height, mode: 'shelf' })
  const counter = computeFraming({ height, mode: 'counter' })

  // The bug this replaces: framing the greeting like a shelf bay left her head
  // at 9.5% of frame height — about 79px, with 14px eyes — and eight units of
  // empty marble below the counter.
  expect(counter.distance).toBeLessThan(shelf.distance)

  const span = visibleHeight(counter.distance)
  const head = cm(KEEPER.headRadiusCm * 2)
  const share = head / span
  expect(share).toBeGreaterThan(0.13)

  // She is still whole in frame: floor, counter and the top of her cap.
  const bottom = counter.target - span / 2
  const top = counter.target + span / 2
  expect(bottom).toBeLessThan(FLOOR_Y)
  expect(top).toBeGreaterThan(FLOOR_Y + cm(KEEPER.totalCm))
  expect(FLOOR_Y + cm(COUNTER.heightCm)).toBeGreaterThan(bottom)
})

test('her head is drawn at an anime proportion, not a realistic one', async () => {
  // Five and a half heads. A seven-head figure is anatomically right and reads
  // as a small adult in the distance rather than as a character.
  const heads = KEEPER.totalCm / (KEEPER.headRadiusCm * 2)
  expect(heads).toBeGreaterThan(5)
  expect(heads).toBeLessThan(6.2)
})

test('the mouth is its own texture so talking cannot blow up the cache', async () => {
  const textures = await read('../src/components/shop/keeperTextures.js')
  // Caching a 512px face per mouth shape as well as per blink step would cost
  // tens of megabytes of GPU memory for one character.
  expect(textures).toContain('MOUTH_SIZE = 128')
  expect(textures).toContain('export const MOUTH_SHAPES')

  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')
  expect(keeper).toContain('function Mouth')
  // The shape changes on a jittered clock; even timing reads as a flapping jaw.
  expect(keeper).toMatch(/next\.current = 0\.08 \+ Math\.random\(\)/)
})

test('she only moves her mouth while a line is being delivered', async () => {
  const shop = await read('../src/views/InteractiveShop.jsx')
  // A mouth that runs continuously is not talking, it is chewing.
  expect(shop).toContain('setTalking(false)')
  expect(shop).toMatch(/1400 \+ line\.length \* 45/)
})

test('the speech cloud is drawn in the scene, above her head', async () => {
  const textures = await read('../src/components/shop/keeperTextures.js')
  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')

  // Overlapping lobes and a bubble tail, not a rounded rectangle — a rect reads
  // as a UI toast rather than as speech in a game.
  expect(textures).toContain('speechCloudTexture')
  expect(textures).toContain('lobes')
  expect(keeper).toContain('function SpeechCloud')
  // Above the head, placed from the shared rig so the camera can be solved to
  // include it. The exact height is asserted against the framing elsewhere.
  expect(keeper).toContain('CLOUD.centreCm')
})

test('the greeting invites the customer through the aisle, and gives them a door', async () => {
  const shop = await read('../src/views/InteractiveShop.jsx')
  const moments = await read('../src/components/shop/storeGuideState.js')
  expect(moments).toContain('Welcome to K2 Jimzon!')
  expect(shop).toContain('Browse the shelves')
  // The button only stands at the counter, and only when there is somewhere to go.
  expect(shop).toMatch(/activeShelf\?\.isCounter && shelves\.length > 1/)
})

test('the hair has points in it, not just spheres', async () => {
  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')
  // A head built only from spheres and capsules reads as a mannequin however
  // good the face is. The points now come from the fringe strands and the
  // side locks; the swept wings that used to provide them crossed her face and
  // have been removed.
  expect(keeper).toContain('coneGeometry')
  expect(keeper).toContain('capsuleGeometry')
  expect(keeper).toContain('Short points below the fringe')
})

test('everything the counter scene has to show fits in one frame', async () => {
  // The recurring failure in this scene has been two files holding numbers that
  // must agree and quietly drifting: the shopkeeper against the room, the face
  // against the hair, and — caught here — the speech cloud against the camera,
  // which put the whole bubble five units above the top of the shot. The cloud
  // and the framing now come from one definition, and this asserts it holds.
  const framing = computeFraming({ height: 5 * 2.9 + 1.8, mode: 'counter' })
  const span = visibleHeight(framing.distance)
  const top = framing.target + span / 2
  const bottom = framing.target - span / 2

  const cloudTop = FLOOR_Y + cm(CLOUD.centreCm + CLOUD.heightCm / 2)
  const capTop = FLOOR_Y + cm(KEEPER.totalCm)
  const counterTop = FLOOR_Y + cm(COUNTER.heightCm)

  // Allow for the cloud's idle bob.
  expect(cloudTop + cm(3)).toBeLessThan(top)
  expect(capTop).toBeLessThan(top)
  expect(counterTop).toBeGreaterThan(bottom)
  expect(FLOOR_Y).toBeGreaterThan(bottom)

  // The cloud hangs above her, not across her face.
  expect(CLOUD.centreCm - CLOUD.heightCm / 2).toBeGreaterThan(KEEPER.headCm)

  // And she is still big enough to read as a person.
  expect(cm(KEEPER.headRadiusCm * 2) / span).toBeGreaterThan(0.12)
})

test('the cloud is placed from the rig, not from numbers typed into the component', async () => {
  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')
  const rig = await read('../src/components/shop/keeperRig.js')

  expect(rig).toContain('COUNTER_CONTENT_TOP_CM')
  expect(keeper).toContain('CLOUD.centreCm')
  expect(keeper).toContain('CLOUD.heightCm')
  // No literal centimetre placement left behind to drift.
  expect(keeper).not.toMatch(/cm\(21\d\)/)
  expect(keeper).not.toMatch(/planeGeometry args=\{\[cm\(150\), cm\(75\)\]\}/)
})

/* -------------------------------------------------------------------------
   The character, after the sun-hat build
   ------------------------------------------------------------------------- */

test('nothing in the hair is allowed to hang over her eyes', async () => {
  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')

  // The bug: ConeGeometry puts its base at -Y and apex at +Y, so an unrotated
  // cone points UP. The first fringe hung its WIDE END over her eyes and the
  // character had no face at all. Every fringe cone must be flipped.
  const fringe = keeper.slice(keeper.indexOf('Short points below the fringe'))
  expect(fringe.slice(0, 600)).toMatch(/rotation=\{\[Math\.PI, 0,/)

  // The swept "wings" that crossed the upper face are gone for good.
  expect(keeper).not.toContain('wing-')
})

test('the cap is a cap, not a sun hat', async () => {
  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')
  // The brim was a 45cm disc on a 30cm head. It is now scaled narrow across and
  // long front-to-back, so it projects forward instead of spanning the width.
  const brim = keeper.slice(keeper.indexOf('Brim: narrow across'))
  const scale = brim.match(/scale=\{\[([\d.]+), 1, ([\d.]+)\]\}/)
  expect(scale).not.toBeNull()
  expect(Number(scale[1])).toBeLessThan(1)
  expect(Number(scale[2])).toBeGreaterThan(1)
})

/* -------------------------------------------------------------------------
   Zoom, theme, and shelf photographs
   ------------------------------------------------------------------------- */

test('zoom goes where the pointer is, not to a fixed centre', async () => {
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')

  // Zooming to a fixed centre means zooming in and then hunting for the item.
  expect(scene).toContain('const focusOn =')
  expect(scene).toContain('getBoundingClientRect')
  // Both gestures steer: the wheel to the cursor, a pinch to its midpoint.
  expect(scene).toMatch(/focusOn\(event\.clientX, event\.clientY/)
  expect(scene).toMatch(/focusOn\(\(a\.x \+ b\.x\) \/ 2/)

  // The pan is bounded, so the customer cannot drift out of the bay, and it
  // unwinds at full zoom-out rather than leaving the view off-centre.
  expect(scene).toContain('MathUtils.clamp(pan.current.x')
  expect(scene).toContain('const roam =')
  // Reset recentres as well as pulling back.
  expect(scene).toMatch(/pan\.current = \{ x: 0, y: 0 \}/)
})

test('the store follows the light and dark theme instead of forcing white', async () => {
  const css = await read('../src/interactive-store.css')
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')
  const shop = await read('../src/views/InteractiveShop.jsx')

  // Chrome is tokenised so the whole room moves together.
  expect(css).toContain('.dark .k2-store')
  expect(css).toContain('--k2-ink')
  expect(css).toMatch(/background: var\(--k2-bar\)/)

  // A 3D scene cannot inherit a CSS variable, so the renderer gets its own
  // palette keyed off the same isDark the rest of the storefront uses.
  expect(scene).toContain('const ROOM = {')
  expect(scene).toMatch(/const room = isDark \? ROOM\.dark : ROOM\.light/)
  expect(scene).toMatch(/args=\{\[room\.wall\]\}/)

  // And it is reachable: the store carries its own toggle.
  expect(shop).toContain('toggleDarkMode')
  expect(shop).toContain('isDark')
})

test('the queue flags products with no shelf photograph', async () => {
  const withPhoto = { id: 'a', name: 'A', img: '/images/a.jpg', stock_available: 5 }
  const without = { id: 'b', name: 'B', stock_available: 5 }

  expect(hasShelfImage(withPhoto)).toBe(true)
  expect(hasShelfImage(without)).toBe(false)
  // The alternate field the media pipeline writes.
  expect(hasShelfImage({ primary_image_url: 'https://cdn.test/b.jpg' })).toBe(true)

  const plan = planStoreAssets([withPhoto, without], () => selectPublicKnowledge(null, ''))
  const flagged = plan.items.find((entry) => entry.sku === 'b')
  const fine = plan.items.find((entry) => entry.sku === 'a')
  expect(flagged.gaps.some((gap) => gap.key === 'image')).toBe(true)
  expect(fine.gaps.some((gap) => gap.key === 'image')).toBe(false)
  // A missing photograph blocks customers: the shelf shows a drawn label.
  expect(flagged.missingRequired).toContain('image')
})

test('the photo check reads the same fields the shelf reads', async () => {
  const plan = await read('../src/lib/storeAssetPlan.js')
  const texture = await read('../src/components/shop/packageTexture.js')

  // If these diverge, the queue tells staff a product is fine while the shelf
  // renders a drawn label instead of the goods.
  expect(texture).toMatch(/product\?\.img \|\| product\?\.primary_image_url/)
  expect(plan).toMatch(/text\(product\?\.img\) \|\| text\(product\?\.primary_image_url\)/)
})

test('the panel avatar stands free and waves', async () => {
  const avatar = await read('../src/components/shop/StoreKeeperAvatar.jsx')
  const panel = await read('../src/components/shop/StoreKeeper.jsx')
  const css = await read('../src/interactive-store.css')

  // No medallion: a circular frame turned her into a status chip.
  expect(avatar).not.toContain('k2-keeper-medallion')
  expect(avatar).toContain('k2-keeper-wave')
  // And no card around her in the rail either.
  expect(panel).not.toMatch(/aria-label="K2 shopkeeper"\s*\n\s*>\s*\n\s*\{\/\* The portrait/)
  expect(panel).toContain('flex flex-col gap-4" aria-label="K2 shopkeeper"')

  // The wave holds between passes rather than swinging forever.
  expect(css).toContain('@keyframes k2-keeper-wave')
  expect(css).toMatch(/0%, 62%, 100% \{ transform: rotate\(0deg\); \}/)
  // And stops entirely for a visitor who asked for stillness.
  const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
  expect(reduced).toContain('k2-keeper-wave')
})

/* -------------------------------------------------------------------------
   Living guide, aisle clerk, and canonical basket dock
   ------------------------------------------------------------------------- */

test('one store moment coordinates the guide and aisle clerk', async () => {
  expect(deriveStoreMoment({ shelf: { isCounter: true }, greeted: false })).toMatchObject({
    id: 'welcome',
    expression: 'delighted',
    gesture: 'wave',
  })
  expect(deriveStoreMoment({
    shelf: { name: 'Coffee', isCounter: false, products: [{}, {}] },
    product: { name: 'Caffè Milano' },
  })).toMatchObject({ id: 'inspect', expression: 'speaking', gesture: 'present' })
  expect(deriveStoreMoment({ shelf: { name: 'Coffee', isCounter: false }, basketPulse: 2 }))
    .toMatchObject({ id: 'added', expression: 'delighted', gesture: 'celebrate' })

  const shop = await read('../src/views/InteractiveShop.jsx')
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')
  expect(shop).toContain('deriveStoreMoment')
  expect(shop).toContain('moment={storeMoment}')
  expect(scene).toContain('targetBay={activeIndex}')
  expect(scene).toContain('gesture={keeper?.gesture')
})

test('the pop-out guide and visual basket are functional scene overlays', async () => {
  const shop = await read('../src/views/InteractiveShop.jsx')
  const guide = await read('../src/components/shop/StoreKeeper.jsx')
  const basket = await read('../src/components/shop/StoreBasketDock.jsx')
  const css = await read('../src/interactive-store.css')

  expect(shop).toContain('StoreBasketDock')
  expect(shop).toContain('basketCount={basketCount}')
  expect(shop).toContain('subtotal={subtotal}')
  expect(guide).toContain('k2-store-guide')
  expect(guide).toContain('aria-expanded={open}')
  expect(basket).toContain('aria-label="Your basket"')
  expect(basket).toContain('k2-store-parcel')
  expect(css).toContain('.k2-store-guide')
  expect(css).toContain('.k2-store-basket-dock')
  expect(css).toContain('@media (prefers-reduced-motion: reduce)')
})

test('the aisle clerk keeps a human scale and travels exactly one bay with the camera', async () => {
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')

  // The regression was a shelf-only 0.52 scale and an extra X jump. Together
  // they made her shrink into the fixtures and slide out of the camera move.
  expect(scene).not.toContain("activeIndex === 0 ? 1 : 0.52")
  expect(scene).toContain('scale={CLERK_STAGE_SCALE}')
  expect(scene).toContain('activeIndex * BAY_SPACING + CLERK_STAGE_X')
})

test('the right rail is an actionable shelf concierge before a product is selected', async () => {
  const shop = await read('../src/views/InteractiveShop.jsx')
  const panel = await read('../src/components/shop/StoreSidePanel.jsx')
  const css = await read('../src/interactive-store.css')

  expect(shop).toContain('StoreSidePanel')
  expect(panel).toContain('Shelf concierge')
  expect(panel).toContain('Now browsing')
  expect(panel).toContain('Shelf highlights')
  expect(panel).toContain('onSelect(product)')
  expect(panel).toContain('onShelfChange(index)')
  expect(css).toContain('.k2-store-side-console')
  expect(css).toContain('.k2-store-side-product')
})

test('the clerk dwells in a real gap between shelf bays and follows the camera travel rate', async () => {
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')
  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')

  // A shelf occupies its bay centre. The clerk belongs at the midpoint of the
  // deliberately widened gap, with enough Z clearance to stay in the aisle.
  expect(scene).toMatch(/const BAY_GAP = 10/)
  expect(scene).toMatch(/const CLERK_STAGE_X = BAY_WIDTH \/ 2 \+ BAY_GAP \/ 2/)
  expect(scene).toContain('CLERK_STAGE_Z')
  expect(scene).not.toMatch(/activeIndex === 0 \? -2\.3 : 0\.6/)

  // Identical target distance is not enough: interpolation must match too or
  // she drifts through the furniture while the camera settles.
  expect(scene).toContain('AISLE_TRAVEL_RATE')
  expect(keeper).toContain('AISLE_TRAVEL_RATE')
})

test('every product bay has two additional physical shelf levels', async () => {
  const scene = await read('../src/components/shop/ShelfScene3D.jsx')
  expect(scene).toMatch(/const MAX_ROWS = 7/)
  expect(scene).toMatch(/const MIN_ROWS = 5/)
})

test('the shop has one live-chat entrance: the shopkeeper question form', async () => {
  const shop = await read('../src/views/InteractiveShop.jsx')
  const guide = await read('../src/components/shop/StoreKeeper.jsx')
  const side = await read('../src/components/shop/StoreSidePanel.jsx')

  expect(guide).toContain('onAskStaff')
  expect((shop.match(/setSheet\('chat'\)/g) || [])).toHaveLength(1)
  expect(side).not.toContain('onChat')
  expect(side).not.toContain('Ask K2')
})

test('the clerk has articulated arm and palm silhouettes instead of ball hands', async () => {
  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')
  const arms = keeper.slice(keeper.indexOf('{/* Arms'), keeper.indexOf('{/* Neck'))

  expect(keeper).toContain('function ClerkArm')
  expect(arms).toContain('<ClerkArm')
  expect(arms).not.toContain('<sphereGeometry')
  expect(keeper).toContain('Upper sleeve')
  expect(keeper).toContain('Forearm')
  expect(keeper).toContain('Palm')
})

test("the clerk's anatomical right arm owns the wave without crossing her body", async () => {
  const keeper = await read('../src/components/shop/StoreKeeper3D.jsx')
  const arms = keeper.slice(keeper.indexOf('{/* Arms'), keeper.indexOf('{/* Neck'))

  // She faces the camera, so Three.js -X is her anatomical right (screen-left).
  // Binding +X makes her left arm rotate across the torso toward screen-left.
  expect(arms).toContain('<ClerkArm side={-1} armRef={rightArm} />')
  expect(arms).toContain('<ClerkArm side={1} />')
  expect(arms).not.toContain('<ClerkArm side={1} armRef={rightArm} />')
})

test('the clerk explains each category from its authored shelf facts', () => {
  const pantry = deriveStoreMoment({
    shelf: {
      name: 'Pantry',
      blurb: 'Pasta, passata, oil, and the staples a kitchen runs on.',
      products: [{ id: 'p1' }, { id: 'p2' }],
    },
  })

  expect(pantry).toMatchObject({
    id: 'explore',
    expression: 'speaking',
    gesture: 'present',
    message: 'Pantry — Pasta, passata, oil, and the staples a kitchen runs on. I can walk you through 2 items here.',
  })
})

test('every shelf carries an authored introduction in her own words', () => {
  // The rail already prints the blurb next to her. An introduction that only
  // repeated it would make her a label rather than a shopkeeper, so each one
  // has to say something the shelf heading does not.
  for (const shelf of [...SHELF_DEFINITIONS, COUNTER_SCENE]) {
    expect(typeof shelf.intro, `${shelf.name} has no authored introduction`).toBe('string')
    expect(shelf.intro.trim().length).toBeGreaterThan(20)
    expect(shelf.intro).not.toBe(shelf.blurb)
  }

  // Distinct per category, not one sentence with the name swapped in.
  const intros = SHELF_DEFINITIONS.map(shelf => shelf.intro)
  expect(new Set(intros).size).toBe(intros.length)
})

test('the introduction survives the shelf build so the clerk can speak it', () => {
  const shelves = buildShelves([
    { id: 'a', name: 'Beans', category: 'coffee', stock_available: 4 },
    { id: 'b', name: 'Passata', category: 'pantry', stock_available: 2 },
  ])
  const coffee = shelves.find(shelf => shelf.id === 'coffee')
  const authored = SHELF_DEFINITIONS.find(shelf => shelf.id === 'coffee')

  expect(coffee.intro).toBe(authored.intro)
})

test('the clerk introduces a category with its own line and a counted way in', () => {
  const authored = SHELF_DEFINITIONS.find(shelf => shelf.id === 'coffee')
  const moment = deriveStoreMoment({
    shelf: { ...authored, products: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }] },
  })

  expect(moment).toMatchObject({ id: 'explore', expression: 'speaking', gesture: 'present' })
  expect(moment.message).toBe(`Coffee & Drinks — ${authored.intro} I can walk you through 3 items here.`)
  // The count is derived, never authored, so it can never contradict the shelf.
  expect(authored.intro).not.toMatch(/\d/)
})

test('a single item on a shelf is introduced in the singular', () => {
  const authored = SHELF_DEFINITIONS.find(shelf => shelf.id === 'pantry')
  const moment = deriveStoreMoment({ shelf: { ...authored, products: [{ id: 'p1' }] } })

  expect(moment.message).toContain('1 item here')
  expect(moment.message).not.toContain('1 items here')
})

test('a shelf with no authored introduction still gets an honest one', () => {
  // Overflow and future shelves have no hand-written line. The clerk falls back
  // to the shelf's own facts rather than going silent or inventing a category.
  const moment = deriveStoreMoment({
    shelf: { name: 'Everything else', blurb: 'Not shelved yet.', products: [{ id: 'p1' }, { id: 'p2' }] },
  })

  expect(moment.message).toBe('Everything else — Not shelved yet. I can walk you through 2 items here.')
})

test('the counter greets with its authored line rather than a bare blurb', () => {
  const idle = deriveStoreMoment({ shelf: COUNTER_SCENE, greeted: true })

  expect(idle.id).toBe('idle')
  expect(idle.message).toBe(COUNTER_SCENE.intro)
})

test('the in-store chat reads as an automatically refreshing website conversation', async () => {
  const chat = await read('../src/components/shop/StoreChatPanel.jsx')
  const chatCode = await readCode('../src/components/shop/StoreChatPanel.jsx')

  expect(chat).toContain('const POLL_MS = 8000')
  expect(chat).toContain('Live website conversation')
  expect(chat).toContain('Replies refresh automatically')
  expect(chatCode).not.toMatch(/online now|staff online|is typing/i)
})

test('virtual-store messages have one signed customer-visible path into Admin', async () => {
  const migration = await read('../supabase/migrations/20260828_virtual_store_live_chat.sql').catch(() => '')
  const adminServer = await read('../server/admin-bff/inbox.js')
  const adminService = await read('../src/services/adminBffService.js')
  const runtime = await read('../src/context/useAdminInboxRuntime.js')
  const inbox = await read('../src/views/admin/Inbox.jsx')
  const normalization = await read('../src/lib/adminInboxNormalization.js')
  const router = await read('../server/admin-bff/router.js')
  const handler = await read('../prepared-api/admin/inbox/send-reply.js')

  expect(migration).toContain('append_website_customer_reply_v1')
  expect(migration).toContain("source_kind not in ('website_message','virtual_store_message')")
  expect(migration).toContain("'sent'")
  expect(migration).toContain("'outbound'")
  expect(migration).toContain("'customer_reply_sent'")
  expect(migration).toContain('website_reply_capability_v1')
  expect(adminServer).toContain("action === 'inbox_send_reply'")
  expect(adminServer).toContain("'execute_admin_website_reply_v1'")
  expect(adminService).toContain("inbox: new Set(['internal-note', 'send-reply', 'mark-read', 'workflow'])")
  expect(adminService).toContain('sendWebsiteReplyBff')
  expect(runtime).toContain('sendCustomerReply')
  expect(runtime).toContain("supabase.rpc('append_website_customer_reply_v1'")
  expect(runtime).toContain('websiteReplyReady')
  expect(normalization).toContain('sourceKind: conversation.sourceKind ?? conversation.source_kind')
  expect(router).toContain("['inbox/send-reply', inboxSendReply]")
  expect(handler).toContain("handleInboxCommand(req, res, 'inbox_send_reply')")
  expect(inbox).toContain('LIVE WEBSITE CHAT')
  expect(inbox).toContain('Customer-visible website reply')
  expect(inbox).toContain('Send to website customer')
  expect(inbox).toContain('Replies appear in the customer’s website chat')
})
