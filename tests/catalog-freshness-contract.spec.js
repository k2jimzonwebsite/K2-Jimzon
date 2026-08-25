import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const readStoreContext = () => readFile(
  new URL('../src/context/StoreContext.jsx', import.meta.url),
  'utf8',
)

test('storefront catalog has a bounded visible-page freshness fallback', async () => {
  const source = await readStoreContext()

  expect(source).toContain('const CATALOG_REFRESH_INTERVAL_MS = 60_000')
  expect(source).toContain("document.visibilityState === 'visible'")
  expect(source).toContain('window.setInterval(refreshWhenVisible, CATALOG_REFRESH_INTERVAL_MS)')
  expect(source).toContain("document.addEventListener('visibilitychange', refreshWhenVisible)")
  expect(source).toContain('window.clearInterval(refreshInterval)')
  expect(source).toContain("document.removeEventListener('visibilitychange', refreshWhenVisible)")
})

test('catalog refresh is overlap-safe and publishes product and stock atomically', async () => {
  const source = await readStoreContext()

  expect(source).toContain('if (catalogRefreshInFlightRef.current) return')
  expect(source).toContain('catalogRefreshInFlightRef.current = true')
  expect(source).toContain('catalogRefreshInFlightRef.current = false')
  expect(source).toContain('!productsResult.error && productsResult.data && !stockResult.error && stockResult.data')
  expect(source).not.toContain('(stockResult.data || [])')
})
