import { test, expect } from '@playwright/test'
import { generatePublicSeoDraft, generateProductOptimization } from '../server/admin-bff/gemini-public-draft.js'
import { validateInventory } from '../scripts/verify-deployment-environment-contract.mjs'

const publicCatalog = { status: 'found', barcode: '3017620422003', name: 'Hazelnut spread', brand: 'Ferrero', quantity: '400 g', source: 'Open Food Facts' }
const suggestion = { card_description: 'Ferrero hazelnut spread in a 400 g jar.', seo_title: 'Ferrero Hazelnut Spread 400 g', meta_description: 'Explore Ferrero hazelnut spread in a 400 g jar.', search_keywords: ['Ferrero hazelnut spread', 'hazelnut spread 400 g', 'Ferrero spread'] }
const optimizationSuggestion = {
  card_description: 'Authentic Barilla Spaghetti No. 5 crafted with durum wheat semolina.',
  seo_title: 'Barilla Spaghetti No. 5 500g',
  meta_description: 'Classic Italian Barilla Spaghetti No. 5 imported from Parma, Italy.',
  search_keywords: ['barilla spaghetti', 'spaghetti no 5', 'italian pasta 500g', 'barilla pasta'],
  storage_instructions: 'Store in a cool, dry place away from moisture and direct sunlight.',
  usage_instructions: 'Cook in boiling salted water for 9-11 minutes until al dente. Pair with marinara or pesto.',
}
const reply = body => new Response(JSON.stringify(body))

test('Gemini receives public catalog fields only and returns bounded review text', async () => {
  let calls = 0
  const result = await generatePublicSeoDraft({ ...publicCatalog, privateNote: 'never transmit', photo: 'private bytes', cost: 99 }, {
    env: { GEMINI_API_KEY: 'your-google-gemini-api-key' },
    fetchImpl: async (url, options) => {
      calls++
      expect(url).toContain('/models/gemini-3.5-flash-lite:generateContent')
      expect(options.headers['x-goog-api-key']).toBe('your-google-gemini-api-key')
      expect(JSON.parse(options.body).generationConfig.responseFormat.text.mimeType).toBe('APPLICATION_JSON')
      expect(options.body).toContain(publicCatalog.name)
      for (const forbidden of ['privateNote', 'never transmit', 'photo', 'private bytes', 'cost', '99', 'inline_data', 'tools']) expect(options.body).not.toContain(forbidden)
      return reply({ candidates: [{ content: { parts: [{ text: JSON.stringify(suggestion) }] }, finishReason: 'STOP' }] })
    },
  })
  expect(calls).toBe(1)
  expect(result).toEqual(suggestion)
})

test('generateProductOptimization sends allowlisted facts and returns structured optimization', async () => {
  let calls = 0
  const facts = {
    name: 'Barilla Spaghetti No. 5',
    brand: 'Barilla',
    category: 'Pasta',
    origin: 'Parma, Italy',
    quantity: '500g',
    secretStaffNote: 'high margin item',
    costPrice: 45,
  }
  const result = await generateProductOptimization(facts, {
    env: { GEMINI_API_KEY: 'your-google-gemini-api-key' },
    fetchImpl: async (url, options) => {
      calls++
      expect(url).toContain('/models/gemini-3.5-flash-lite:generateContent')
      expect(options.headers['x-goog-api-key']).toBe('your-google-gemini-api-key')
      const body = JSON.parse(options.body)
      expect(body.generationConfig.maxOutputTokens).toBe(600)
      expect(body.generationConfig.responseFormat.text.mimeType).toBe('APPLICATION_JSON')
      expect(options.body).toContain('Barilla Spaghetti No. 5')
      for (const forbidden of ['secretStaffNote', 'high margin item', 'costPrice', '45']) {
        expect(options.body).not.toContain(forbidden)
      }
      return reply({ candidates: [{ content: { parts: [{ text: JSON.stringify(optimizationSuggestion) }] }, finishReason: 'STOP' }] })
    },
  })
  expect(calls).toBe(1)
  expect(result).toEqual(optimizationSuggestion)
})

test('generateProductOptimization validates product facts and handles missing key', async () => {
  let calls = 0
  await expect(generateProductOptimization({ name: 'Valid Name' }, { env: {}, fetchImpl: () => { calls++ } })).rejects.toThrow('GEMINI_NOT_CONFIGURED')
  await expect(generateProductOptimization({ name: '' }, { env: { GEMINI_API_KEY: 'your-google-gemini-api-key' }, fetchImpl: () => { calls++ } })).rejects.toThrow('PRODUCT_FACTS_REQUIRED')
  await expect(generateProductOptimization(null, { env: { GEMINI_API_KEY: 'your-google-gemini-api-key' }, fetchImpl: () => { calls++ } })).rejects.toThrow('PRODUCT_FACTS_REQUIRED')
  expect(calls).toBe(0)
})

test('Gemini refuses missing key and invalid or invented output', async () => {
  let calls = 0
  await expect(generatePublicSeoDraft(publicCatalog, { env: {}, fetchImpl: () => { calls++ } })).rejects.toThrow('GEMINI_NOT_CONFIGURED')
  await expect(generatePublicSeoDraft({ ...publicCatalog, status: 'not_found' }, { env: { GEMINI_API_KEY: 'your-google-gemini-api-key' }, fetchImpl: () => { calls++ } })).rejects.toThrow('PUBLIC_CATALOG_REQUIRED')
  expect(calls).toBe(0)
  for (const bad of [{ ...suggestion, stock: 10 }, { ...suggestion, seo_title: 'x'.repeat(61) }, { ...suggestion, search_keywords: ['one'] }]) {
    await expect(generatePublicSeoDraft(publicCatalog, { env: { GEMINI_API_KEY: 'your-google-gemini-api-key' }, fetchImpl: async () => reply({ candidates: [{ content: { parts: [{ text: JSON.stringify(bad) }] }, finishReason: 'STOP' }] }) })).rejects.toThrow('GEMINI_OUTPUT_INVALID')
  }
})

test('deployment contract permits the server key in Admin only', () => {
  const errors = validateInventory({ admin: ['GEMINI_API_KEY'], storefront: ['GEMINI_API_KEY'] })
  expect(errors.some(error => error.includes('admin: provider secret GEMINI_API_KEY'))).toBe(false)
  expect(errors.some(error => error.includes('admin: unapproved custom variable GEMINI_API_KEY'))).toBe(false)
  expect(errors.some(error => error.includes('storefront: provider secret GEMINI_API_KEY'))).toBe(true)
})

