import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// The Sheet shop/custodian lens runs on a temporary fixture, because inventory
// has no shop dimension yet — 20260829_channel_vocabulary_and_shops.sql records
// the batch allocation dimension as left to MAP-026. These contracts exist for
// one reason: sample data that stops looking like sample data is how a demo
// becomes an operational belief. They pin that it stays labelled, stays
// isolated, and stays deletable in the two steps its own header promises.

const sheet = () => readFile('src/views/admin/Sheet.jsx', 'utf8')
const fixture = () => readFile('src/views/admin/sheetShopLensFixture.js', 'utf8')

test('the sample assignments say plainly that they are not real', async () => {
  const [source, view] = await Promise.all([fixture(), sheet()])

  expect(source).toContain('THIS IS NOT REAL DATA')
  expect(source).toContain('export const FIXTURE_NOTICE')
  // The notice has to reach the screen, not just the file.
  expect(view).toContain('{FIXTURE_NOTICE}')
  expect(source).toMatch(/placeholder data, not real stock custody/i)
})

test('the fixture is reachable from exactly one place', async () => {
  const view = await sheet()

  // One import, in the view that demonstrates it. If a second surface starts
  // reading these assignments, the sample data has become a data source.
  const imports = view.split('sheetShopLensFixture').length - 1
  expect(imports).toBe(2) // the comment reference and the import specifier
  expect(view).toContain("} from './sheetShopLensFixture'")
})

test('the fixture documents its own removal, and the steps still match the code', async () => {
  const [source, view] = await Promise.all([fixture(), sheet()])

  expect(source).toContain('HOW TO DELETE THIS')
  // Step 1: delete the file. Step 2: drop the import and the banner from Sheet.
  expect(source).toContain('Delete this file')
  expect(source).toContain('`Sheet.jsx`')
  expect(source).toContain('FIXTURE_NOTICE')
  // Both named removal points exist right now, so the instructions are runnable.
  expect(view).toContain('sheetShopLensFixture')
  expect(view).toContain('FIXTURE_NOTICE')
})

test('the lens filters the view without touching what is loaded or edited', async () => {
  const view = await sheet()

  // Editing is index-addressed. The rendered row must carry its index in
  // `rows`, not its position in the filtered list, or an edit lands on a
  // different product than the one on screen.
  expect(view).toContain('.map((row, index) => ({ row, index, shops: shopAssignmentsFor(row.sku) }))')
  expect(view).toContain('{visibleRows.map(({ row: r, index: i, shops }, position) => {')
  expect(view).toContain('updateField(i,')

  // The fetch is unfiltered: a lens must never silently narrow the source data.
  expect(view).toContain("supabase.from('products').select('*')")
})

test('custodians are a set, so two staff can be viewed together', async () => {
  const view = await sheet()

  // The owner asked for "Staff A + Staff B" as its own view, which a single
  // select cannot express.
  expect(view).toContain('const [lensCustodians, setLensCustodians] = useState([])')
  expect(view).toContain('lensCustodians.length > 0')
  expect(view).toContain('aria-pressed={active}')
})

test('clearing the lens resets every filter, not just the one in view', async () => {
  const view = await sheet()

  expect(view).toContain("setLensQuery(''); setLensStatus('all'); setLensShop('all'); setLensCustodians([])")
  // Both the toolbar control and the empty state use the same reset.
  expect(view.split('onClick={clearLens}').length - 1).toBe(2)
})

test('sample shop assignment is stable for a SKU', async () => {
  const { shopAssignmentsFor, custodiansForShops } = await import('../src/views/admin/sheetShopLensFixture.js')

  const first = shopAssignmentsFor('K2-TEST-SKU')
  const second = shopAssignmentsFor('K2-TEST-SKU')
  expect(second).toEqual(first)
  expect(first.length).toBeGreaterThan(0)

  // An unknown or empty SKU claims no shop rather than defaulting to one.
  expect(shopAssignmentsFor('')).toEqual([])
  expect(shopAssignmentsFor(null)).toEqual([])

  // Every assigned shop resolves to a named custodian, so the staff chips can
  // never show a row whose handler is unknown.
  expect(custodiansForShops(first).length).toBeGreaterThan(0)
})
