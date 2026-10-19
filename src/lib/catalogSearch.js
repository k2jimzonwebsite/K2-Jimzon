import { compareCatalogProducts } from './catalogSort.js'

/**
 * catalogSearch.js
 *
 * Implements Shopee/Lazada-style multi-attribute tokenized relevance scoring
 * and intelligent recommendation partitioning for the K2 Jimzon catalog.
 *
 * Requirements:
 * - Tokenized multi-keyword matching across name, brand, tag, category, subcategory, origin, short, inside/desc.
 * - Deterministic relevance scoring: exact matches first, then multi-token matches, then single-token matches.
 * - Shopee/Lazada-style partitioning: direct matches first, followed by relevant recommendations
 *   (drawn from matched categories, complementary Italian provisions, or popular cabinet items).
 * - Deduplication: recommendations strictly exclude products already in directMatches.
 * - Safe fallback: if zero direct matches, recommendations surface popular & related stock
 *   so the shopper never hits an abrupt empty dead end.
 */

export function normalizeSearchTerm(str) {
  if (!str || typeof str !== 'string') return ''
  return str.toLowerCase().trim()
}

export function tokenizeQuery(query) {
  if (!query || typeof query !== 'string') return []
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function scoreProductRelevance(product, query, tokens) {
  if (!product) return 0
  if (!query || !tokens || tokens.length === 0) return 0

  const name = (product.name || '').toLowerCase()
  const sku = (product.sku || product.id || '').toLowerCase()
  const short = (product.short || '').toLowerCase()
  const tag = (product.tag || '').toLowerCase()
  const category = (product.category || '').toLowerCase()
  const subCategory = (product.sub_category || '').toLowerCase()
  const brand = (product.brand_id || product.brand || '').toLowerCase()
  const origin = (product.origin || product.country_of_origin || '').toLowerCase()
  const inside = (product.inside || product.description || '').toLowerCase()
  const ingredients = (product.ingredients || '').toLowerCase()

  let score = 0
  const cleanQuery = query.toLowerCase().trim()

  // 1. Exact full-string match (highest relevance)
  if (name === cleanQuery || sku === cleanQuery) {
    score += 120
  } else if (name.startsWith(cleanQuery)) {
    score += 80
  } else if (name.includes(cleanQuery)) {
    score += 60
  } else if (brand.includes(cleanQuery)) {
    score += 45
  } else if (tag.includes(cleanQuery)) {
    score += 35
  } else if (category.includes(cleanQuery) || subCategory.includes(cleanQuery)) {
    score += 30
  }

  // 2. Token-by-token scoring
  let matchedTokens = 0
  for (const token of tokens) {
    let tokenMatched = false

    if (name.includes(token)) {
      score += 25
      tokenMatched = true
    } else if (brand.includes(token)) {
      score += 20
      tokenMatched = true
    } else if (tag.includes(token)) {
      score += 15
      tokenMatched = true
    } else if (category.includes(token) || subCategory.includes(token)) {
      score += 12
      tokenMatched = true
    } else if (origin.includes(token)) {
      score += 10
      tokenMatched = true
    } else if (short.includes(token) || inside.includes(token) || ingredients.includes(token)) {
      score += 6
      tokenMatched = true
    }

    if (tokenMatched) matchedTokens++
  }

  // Bonus when every token in a multi-word search matched somewhere on the product
  if (matchedTokens === tokens.length && tokens.length > 1) {
    score += 35
  }

  return score
}

export function partitionCatalogSearch(products = [], query = '', category = 'All', sortBy = 'popular') {
  const cleanQuery = (query || '').trim()
  const tokens = tokenizeQuery(cleanQuery)

  let baseList = products || []
  if (category !== 'All') {
    baseList = baseList.filter((product) =>
      product.category === category || (category === 'Snacks' && product.category?.includes('Biscuits'))
    )
  }

  if (!cleanQuery) {
    // No active search query: standard category view sorted by user preference
    const sorted = [...baseList].sort((a, b) => compareCatalogProducts(a, b, sortBy))
    return {
      directMatches: sorted,
      recommendedMatches: [],
      matchedCategories: [],
      hasQuery: false,
    }
  }

  const scoredDirect = []
  const remainingProducts = []
  const matchedCategoriesSet = new Set()

  for (const product of products) {
    const matchesCategoryFilter =
      category === 'All' ||
      product.category === category ||
      (category === 'Snacks' && product.category?.includes('Biscuits'))

    const score = scoreProductRelevance(product, cleanQuery, tokens)
    if (score > 0 && matchesCategoryFilter) {
      scoredDirect.push({ product, score })
      if (product.category) matchedCategoriesSet.add(product.category)
    } else {
      remainingProducts.push(product)
    }
  }

  // Sort direct matches: respect explicit non-popular sort or sort by relevance score then popularity
  scoredDirect.sort((a, b) => {
    if (sortBy === 'price_asc' || sortBy === 'price_desc' || sortBy === 'latest') {
      return compareCatalogProducts(a.product, b.product, sortBy)
    }
    if (b.score !== a.score) return b.score - a.score
    return compareCatalogProducts(a.product, b.product, sortBy)
  })

  const directMatches = scoredDirect.map((entry) => entry.product)
  const directIdSet = new Set(directMatches.map((p) => p.id || p.sku).filter(Boolean))

  // Recommendations: Shopee/Lazada style
  // Exclude any product already in direct matches
  const availableRecommendations = (products || []).filter((p) => {
    const key = p.id || p.sku
    return key && !directIdSet.has(key)
  })

  // Prioritize recommendations:
  // 1. Products in categories related to the search query's matched categories
  // 2. High-stock or Bestseller Italian staples
  availableRecommendations.sort((a, b) => {
    const aInCat = matchedCategoriesSet.has(a.category) ? 1 : 0
    const bInCat = matchedCategoriesSet.has(b.category) ? 1 : 0
    if (bInCat !== aInCat) return bInCat - aInCat
    return compareCatalogProducts(a, b, sortBy)
  })

  return {
    directMatches,
    recommendedMatches: availableRecommendations,
    matchedCategories: Array.from(matchedCategoriesSet),
    hasQuery: true,
  }
}
