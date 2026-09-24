import { test, expect } from '@playwright/test'
import { lookupBarcodeCatalog } from '../server/admin-bff/barcode-catalog.js'

const barcode = '3017620422003'
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status })

test('looks up an exact package barcode and returns bounded suggestions without images', async () => {
  let requested = ''
  const result = await lookupBarcodeCatalog(barcode, {
    fetchImpl: async (url, options) => {
      requested = String(url)
      expect(options.headers['User-Agent']).toContain('K2Jimzon')
      return reply({ status: 1, product: { code: barcode, product_name: 'Hazelnut spread', brands: 'Ferrero', quantity: '400 g', image_front_url: 'https://example.test/image.jpg' } })
    },
  })
  expect(requested).toContain(`/api/v2/product/${barcode}.json`)
  expect(result).toMatchObject({ status: 'found', barcode, name: 'Hazelnut spread', brand: 'Ferrero', quantity: '400 g', source: 'Open Food Facts' })
  expect(result).not.toHaveProperty('image_front_url')
  expect(JSON.stringify(result)).not.toContain('example.test/image.jpg')
})

test('rejects non-barcode input before any public API call', async () => {
  let calls = 0
  for (const input of ['K2-SKU-000123', 'Pasta', '3017620422004', '']) {
    await expect(lookupBarcodeCatalog(input, { fetchImpl: () => { calls++; return reply({}) } })).rejects.toThrow('BARCODE_INVALID')
  }
  expect(calls).toBe(0)
})

test('keeps not found, mismatched response and provider outage distinct', async () => {
  expect((await lookupBarcodeCatalog(barcode, { fetchImpl: async () => reply({ status: 0 }) })).status).toBe('not_found')
  await expect(lookupBarcodeCatalog(barcode, { fetchImpl: async () => reply({ status: 1, product: { code: '0000000000000', product_name: 'Wrong item' } }) })).rejects.toThrow('CATALOG_MISMATCH')
  await expect(lookupBarcodeCatalog(barcode, { fetchImpl: async () => reply({}, 503) })).rejects.toThrow('CATALOG_UNAVAILABLE')
})
