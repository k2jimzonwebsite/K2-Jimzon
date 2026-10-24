import test from 'node:test'
import assert from 'node:assert/strict'
import {
  tokenizeQuery,
  scoreProductRelevance,
  partitionCatalogSearch,
} from '../src/lib/catalogSearch.js'

test('tokenizeQuery splits keywords and trims punctuation', () => {
  const tokens = tokenizeQuery('Combino, Spaghetti No. 5!')
  assert.deepEqual(tokens, ['combino', 'spaghetti', 'no', '5'])
})

test('tokenizeQuery handles empty and whitespace inputs gracefully', () => {
  assert.deepEqual(tokenizeQuery(''), [])
  assert.deepEqual(tokenizeQuery('   '), [])
  assert.deepEqual(tokenizeQuery(null), [])
})

test('scoreProductRelevance ranks exact matches highest', () => {
  const query = 'spaghetti'
  const tokens = tokenizeQuery(query)

  const exact = {
    name: 'Spaghetti',
    sku: 'K2-SKU-001',
    category: 'Pasta',
  }
  const partial = {
    name: 'Combino Pasta Sauce Bolognese',
    sku: 'K2-SKU-002',
    category: 'Sauces',
    inside: 'pairs well with spaghetti',
  }
  const unrelated = {
    name: 'Olive Oil',
    sku: 'K2-SKU-003',
    category: 'Oils',
  }

  const exactScore = scoreProductRelevance(exact, query, tokens)
  const partialScore = scoreProductRelevance(partial, query, tokens)
  const unrelatedScore = scoreProductRelevance(unrelated, query, tokens)

  assert.ok(exactScore > partialScore, 'Exact name match must outscore description match')
  assert.ok(partialScore > unrelatedScore, 'Partial match must outscore unrelated product')
  assert.equal(unrelatedScore, 0, 'Unrelated product must have score 0')
})

test('partitionCatalogSearch separates direct matches from relevant recommendations', () => {
  const mockProducts = [
    {
      id: 'prod-1',
      name: 'Combino Spaghetti No. 5',
      sku: 'K2-SKU-001001',
      category: 'Seasoning, Staple Foods & Baking Ingredients',
      tag: 'Bestseller',
      srp: 249,
    },
    {
      id: 'prod-2',
      name: 'Baresa Pesto alla Genovese',
      sku: 'K2-SKU-001002',
      category: 'Seasoning, Staple Foods & Baking Ingredients',
      tag: 'Fresh Arrival',
      srp: 299,
    },
    {
      id: 'prod-3',
      name: 'Lavazza Qualità Oro Coffee 250g',
      sku: 'K2-SKU-001003',
      category: 'Beverages',
      tag: 'Classic',
      srp: 585,
    },
    {
      id: 'prod-4',
      name: 'Caffè Milano Espresso Beans',
      sku: 'K2-SKU-001004',
      category: 'Beverages',
      tag: 'Bestseller',
      srp: 1450,
    },
  ]

  // Searching "spaghetti"
  const result = partitionCatalogSearch(mockProducts, 'spaghetti', 'All', 'popular')

  assert.equal(result.hasQuery, true)
  assert.equal(result.directMatches.length, 1)
  assert.equal(result.directMatches[0].id, 'prod-1')

  // Recommended matches must NOT contain prod-1 (strict deduplication)
  const recommendedIds = result.recommendedMatches.map((p) => p.id)
  assert.ok(!recommendedIds.includes('prod-1'), 'Direct match must not appear in recommendations')

  // Recommended matches should prioritize products from the same category ("Seasoning, Staple Foods...")
  assert.equal(result.recommendedMatches[0].id, 'prod-2', 'Same category product must be recommended first')
})

test('partitionCatalogSearch provides recommendations when zero direct matches occur (anti-dead-end)', () => {
  const mockProducts = [
    {
      id: 'prod-1',
      name: 'Combino Spaghetti No. 5',
      category: 'Seasoning, Staple Foods & Baking Ingredients',
      tag: 'Bestseller',
    },
    {
      id: 'prod-2',
      name: 'Lavazza Espresso',
      category: 'Beverages',
      tag: 'Bestseller',
    },
  ]

  // Searching for an item not in stock
  const result = partitionCatalogSearch(mockProducts, 'truffle risotto', 'All', 'popular')

  assert.equal(result.hasQuery, true)
  assert.equal(result.directMatches.length, 0, 'No direct matches expected')
  assert.equal(result.recommendedMatches.length, 2, 'All products available as recommendations so shopper never hits dead-end')
})

test('partitionCatalogSearch returns standard list without query', () => {
  const mockProducts = [
    { id: 'prod-1', name: 'Product A', category: 'Beverages', tag: 'Bestseller' },
    { id: 'prod-2', name: 'Product B', category: 'Beverages' },
  ]

  const result = partitionCatalogSearch(mockProducts, '', 'All', 'popular')
  assert.equal(result.hasQuery, false)
  assert.equal(result.directMatches.length, 2)
  assert.equal(result.recommendedMatches.length, 0)
})

test('canonical subcategory is searchable independently of the parent category', () => {
  const product = { id: 'clothing-1', name: 'Everyday basics', category: 'Clothing', subcategory: 'Undergarments' }
  const result = partitionCatalogSearch([product], 'undergarments')
  assert.deepEqual(result.directMatches, [product])
  assert.deepEqual(result.recommendedMatches, [])
})

test('readable brand is searchable when the canonical brand ID is a UUID', () => {
  const product = { id: 'clothing-1', name: 'Everyday basics', brand_id: '11111111-1111-4111-8111-111111111111', brand: 'Bench' }
  assert.deepEqual(partitionCatalogSearch([product], 'bench').directMatches, [product])
  assert.equal(scoreProductRelevance(product, product.brand_id, tokenizeQuery(product.brand_id)), 0)
})

test('missing readable brand never searches an internal reference ID', () => {
  const product = { name: 'Everyday basics', brand_id: '11111111-1111-4111-8111-111111111111', brand: null }
  assert.equal(scoreProductRelevance(product, product.brand_id, tokenizeQuery(product.brand_id)), 0)
})

const pistachioProducts = [
  { id: 'smooth', name: 'Siciliani Crema Pistacchio 200g', category: 'Spreads', stock: 0, srp: 449 },
  { id: 'crunchy', name: 'Siciliani Pistacchio Crunchy 200g', category: 'Spreads', stock: 7, srp: 499 },
  { id: 'bar', name: 'Dulciar Bar Pistacchio', category: 'Chocolate', stock: 8, srp: 199 },
  { id: 'etna', name: 'Etna Pistachio Cream', category: 'Spreads', stock: 0, srp: 1200 },
  { id: 'almond', name: 'Almond Cream', category: 'Spreads', srp: 299 },
]

test('English and Italian pistachio searches find the same sold-out and available products', () => {
  for (const query of ['pistachio', 'PISTACCHIO', 'pistachios', 'pistacchi']) {
    const result = partitionCatalogSearch(pistachioProducts, query)
    assert.deepEqual(result.directMatches.map(p => p.id).sort(), ['bar', 'crunchy', 'etna', 'smooth'])
    assert.deepEqual(result.recommendedMatches.map(p => p.id), ['almond'])
  }
})

test('pistachio aliases preserve literal ranking, category filtering and explicit price sorting', () => {
  const exact = { id: 'exact', name: 'Pistachio', category: 'Spreads', srp: 99 }
  assert.equal(partitionCatalogSearch([...pistachioProducts, exact], 'pistachio').directMatches[0], exact)
  assert.deepEqual(partitionCatalogSearch(pistachioProducts, 'pistachio', 'Spreads', 'price_asc')
    .directMatches.map(p => p.id), ['smooth', 'crunchy', 'etna'])
  const query = 'pistachio crunchy'
  assert.equal(partitionCatalogSearch(pistachioProducts, query).directMatches[0].id, 'crunchy')
  assert.equal(scoreProductRelevance({ name: 'Pistacchiotto' }, 'pistachio', tokenizeQuery('pistachio')), 0)
})


test('literal partial SKU searches remain supported while full SKU ranks highest', () => {
  const product = { id: 'jar', sku: 'K2-SKU-001173', name: 'Crunchy spread' }
  for (const query of ['001173', 'K2-SKU', 'k2-sku-001173']) {
    assert.deepEqual(partitionCatalogSearch([product], query).directMatches, [product])
  }
  assert.ok(scoreProductRelevance(product, 'K2-SKU-001173', tokenizeQuery('K2-SKU-001173')) >
    scoreProductRelevance(product, '001173', tokenizeQuery('001173')))
})


test('exact product name ranks above prefix matches when family options are present', () => {
  const exact = { id: 'z-exact', name: 'Pistachio Cream', family: { name: 'Pistachio Cream' }, variantOptions: { size: '200g' } }
  const prefix = { id: 'a-prefix', name: 'Pistachio Cream Crunchy' }
  assert.equal(partitionCatalogSearch([prefix, exact], 'pistachio cream').directMatches[0], exact)
})
