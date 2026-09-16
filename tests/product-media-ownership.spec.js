import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { rejectForeignLegacyMedia, validateProductMediaOrphanAge } from '../server/admin-bff/product-media.js'

test('orphan review age rejects alternate numeric syntax and repeated query values', () => {
  for (const value of ['1e2', '0x100', ['60', '120'], [60], true, null, '', [], {}, 59, 10081, 60.5]) {
    expect(() => validateProductMediaOrphanAge(value), JSON.stringify(value)).toThrow('PRODUCT_MEDIA_ORPHAN_RANGE_INVALID')
  }
})

test('orphan review age preserves its default and inclusive safety bounds', () => {
  expect(validateProductMediaOrphanAge(undefined)).toBe(60)
  expect(validateProductMediaOrphanAge('60')).toBe(60)
  expect(validateProductMediaOrphanAge(10080)).toBe(10080)
  expect(validateProductMediaOrphanAge('120')).toBe(120)
})

// MAP-020 F-020-003: a null object path marks a legacy reference. Legacy URLs
// may be retained unchanged, but a foreign URL must not be smuggled in as one.
test('legacy media URLs are retained, never introduced', () => {
  const payload = {
    sku: 'K2-001',
    primary: { url: 'https://cdn.example.test/old-primary.jpg', objectPath: null },
    lifestyle: [],
    secondary: [{ url: 'https://cdn.example.test/old-extra.jpg', objectPath: null }],
    reason: 'Keep existing photography.',
  }
  const current = ['https://cdn.example.test/old-primary.jpg', 'https://cdn.example.test/old-extra.jpg']
  expect(() => rejectForeignLegacyMedia(payload, current)).not.toThrow()
  expect(() => rejectForeignLegacyMedia(payload, ['https://cdn.example.test/old-primary.jpg']))
    .toThrow('REQUEST_INVALID')
  expect(() => rejectForeignLegacyMedia(payload, [])).toThrow('REQUEST_INVALID')
  expect(() => rejectForeignLegacyMedia(payload, null)).toThrow('REQUEST_INVALID')
})

test('fresh uploads skip the legacy retention gate', () => {
  const payload = {
    sku: 'K2-001',
    primary: { url: 'https://storage.test/product-images/a/product-media/b.jpg', objectPath: 'a/product-media/b-0123456789abcdef.jpg' },
    lifestyle: [],
    secondary: [],
    reason: 'Replace the primary photo.',
  }
  expect(() => rejectForeignLegacyMedia(payload, [])).not.toThrow()
})

test('assignment reads the current register before accepting legacy references', async () => {
  const source = await readFile(new URL('../server/admin-bff/product-media.js', import.meta.url), 'utf8')
  expect(source).toContain('readCurrentProductMediaUrls')
  expect(source).toContain('rejectForeignLegacyMedia')
})
