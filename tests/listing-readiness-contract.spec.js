import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

import { displayBrand, displayCategory, isReferenceId } from '../src/lib/productIdentity.js'
import { buildProductStructuredData } from '../src/lib/productStructuredData.js'

// MAP-018/MAP-027. Three defects measured against live K2 on 29 September 2026.
// Each one was invisible in the current data and would have fired the moment a
// staff member filled in the missing product facts, which is exactly the
// inventory-listing work the plan is waiting on.

const UUID = '3f2b8c14-9a7d-4e52-b6c1-0d5e7a913f88'

test('a bare foreign key is recognised as a reference, not as text', () => {
  expect(isReferenceId(UUID)).toBe(true)
  expect(isReferenceId(UUID.toUpperCase())).toBe(true)
  expect(isReferenceId('Lavazza')).toBe(false)
  expect(isReferenceId('')).toBe(false)
  expect(isReferenceId(null)).toBe(false)
  expect(isReferenceId(undefined)).toBe(false)
})

test('a product with only a brand_id shows no brand instead of a UUID', () => {
  // The live shape: 0 of 30 products have a resolved brand, so the reference is
  // all that exists. Printing it put a raw UUID in the customer-facing Brand row.
  const product = { sku: 'lavazza-oro', name: 'Lavazza Qualita Oro', brand_id: UUID }
  expect(displayBrand(product)).toBeNull()
})

test('a resolved brand name is shown, and wins over the reference', () => {
  expect(displayBrand({ brand_id: UUID, brand: { name: 'Lavazza' } })).toBe('Lavazza')
  expect(displayBrand({ brand_id: UUID, brand_name: 'Lavazza' })).toBe('Lavazza')
  // The local sample catalogue stores a human name in the same field.
  expect(displayBrand({ brand_id: 'Caffe Milano' })).toBe('Caffe Milano')
  expect(displayBrand({})).toBeNull()
})

test('the category chip prefers the human subcategory over the reference', () => {
  expect(displayCategory({ subcategory: 'Beverages', category_id: UUID })).toBe('Beverages')
  expect(displayCategory({ category_id: UUID })).toBeNull()
  expect(displayCategory({ subcategory: '   ', category_id: UUID })).toBeNull()
})

test('schema.org never receives a UUID as the brand name', () => {
  const data = buildProductStructuredData({
    product: { sku: 'lavazza-oro', name: 'Lavazza Qualita Oro', brand_id: UUID, srp: 450 },
    description: 'Whole bean coffee.',
    image: '/images/lavazza.jpg',
    url: 'https://k2jimzon.com/product/lavazza-oro',
  })
  // schema.org Brand.name is human text. A UUID here is invalid markup and a
  // rich-result penalty, not a cosmetic issue.
  expect(data.brand).toBeUndefined()
  expect(JSON.stringify(data)).not.toContain(UUID)

  const named = buildProductStructuredData({
    product: { sku: 'lavazza-oro', name: 'Lavazza Qualita Oro', brand_id: UUID, brand: { name: 'Lavazza' }, srp: 450 },
    description: 'Whole bean coffee.',
    image: '/images/lavazza.jpg',
    url: 'https://k2jimzon.com/product/lavazza-oro',
  })
  expect(named.brand).toEqual({ '@type': 'Brand', name: 'Lavazza' })
})

test('the product page and the 3D store plan both resolve the brand', async () => {
  const page = await readFile(new URL('../src/views/MasterProduct.jsx', import.meta.url), 'utf8')
  expect(page).toContain('displayBrand')
  expect(page).toContain('displayCategory')
  // The raw identifier must not reach the customer-facing JSX again.
  expect(page).not.toMatch(/\{product\.brand_id\}/)
  expect(page).not.toMatch(/product\.subcategory \|\| product\.category_id/)

  const plan = await readFile(new URL('../src/lib/storeAssetPlan.js', import.meta.url), 'utf8')
  expect(plan).toContain('displayBrand(product)')
  expect(plan).not.toContain('brand_name: text(product.brand_id)')
})

test('the admin cannot publish a product nobody has reviewed', async () => {
  const sheet = await readFile(new URL('../src/views/admin/Sheet.jsx', import.meta.url), 'utf8')
  // `published` is the flag the storefront filters on, and the database only
  // guards a status change to Live. Without this the checkbox exposed an
  // unreviewed product to customers.
  expect(sheet).toContain("field === 'published' && value === true && !product.is_human_reviewed")
  expect(sheet).toContain('PUBLISH_REVIEW_REQUIRED')

  const errors = await readFile(new URL('../src/lib/safeUiError.js', import.meta.url), 'utf8')
  expect(errors).toContain('PUBLISH_REVIEW_REQUIRED')
})
