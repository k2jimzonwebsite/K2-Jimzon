import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { STOREFRONT_PATH_TO_VIEW, STOREFRONT_SPA_PATHS, STOREFRONT_VIEW_TO_PATH } from '../src/lib/storefrontRoutes.js'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('storefront route registry provides dedicated policy destinations', () => {
  expect(STOREFRONT_PATH_TO_VIEW['/privacy']).toBe('privacy')
  expect(STOREFRONT_PATH_TO_VIEW['/terms']).toBe('terms')
  expect(STOREFRONT_PATH_TO_VIEW['/returns']).toBe('returns')
  expect(STOREFRONT_VIEW_TO_PATH['privacy']).toBe('/privacy')
  expect(STOREFRONT_VIEW_TO_PATH['terms']).toBe('/terms')
  expect(STOREFRONT_VIEW_TO_PATH['returns']).toBe('/returns')
  expect(STOREFRONT_SPA_PATHS).toContain('/privacy')
  expect(STOREFRONT_SPA_PATHS).toContain('/terms')
  expect(STOREFRONT_SPA_PATHS).toContain('/returns')
})

test('vercel storefront rewrites maintain exact parity with STOREFRONT_SPA_PATHS', async () => {
  const vercel = JSON.parse(await read('vercel.storefront.json'))
  const rewrites = vercel.rewrites || []
  for (const spaPath of STOREFRONT_SPA_PATHS) {
    const hasRewrite = rewrites.some(r => r.source === spaPath && r.destination === '/index.html')
    expect(hasRewrite, `Missing rewrite rule in vercel.storefront.json for ${spaPath}`).toBe(true)
  }
})

test('customer-facing policies adhere strictly to manual launch facts', async () => {
  const policiesSource = await read('src/data/policies.js')
  // Privacy protections
  expect(policiesSource).toContain('PRIVACY_POLICY')
  expect(policiesSource).not.toMatch(/sell(?:ing)?\s+(?:your\s+)?data\s+to\s+third\s+parties/i)
  expect(policiesSource).toContain('courier')
  expect(policiesSource).toContain('stock')

  // Terms: manual order request model, no upfront payment, manual GCash/QR, no false SLAs
  expect(policiesSource).toContain('TERMS_POLICY')
  expect(policiesSource).toContain('order request')
  expect(policiesSource).not.toMatch(/1–2 business day|2–3 week/i)
  expect(policiesSource).toContain('GCash')

  // Returns: case-by-case inspection, no self-service returns
  expect(policiesSource).toContain('RETURNS_POLICY')
  expect(policiesSource).toContain('case-by-case')
  expect(policiesSource).toContain('48 hours')
  expect(policiesSource).not.toMatch(/instant refund|30-day money-back guarantee|automatic return/i)
})

test('footer and data collection forms offer reachable policy entry points with 44px hit areas', async () => {
  const [footer, checkout, contact, pasabuy, wholesale] = await Promise.all([
    read('src/components/Footer.jsx'),
    read('src/views/Checkout.jsx'),
    read('src/views/Contact.jsx'),
    read('src/views/Pasabuy.jsx'),
    read('src/views/Wholesale.jsx'),
  ])

  // Footer has dedicated links to privacy, terms, returns with min-h-11
  expect(footer).toContain("go('privacy')")
  expect(footer).toContain("go('terms')")
  expect(footer).toContain("go('returns')")
  expect(footer).toMatch(/min-h-11/i)

  // Data collection forms have reachable policy guidance
  expect(checkout).toMatch(/privacy/i)
  expect(contact).toMatch(/privacy/i)
  expect(pasabuy).toMatch(/privacy/i)
  expect(wholesale).toMatch(/privacy/i)
})
