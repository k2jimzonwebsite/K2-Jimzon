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
