import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { validateInventory } from '../scripts/verify-deployment-environment-contract.mjs'

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
}

function globalHeaders(config) {
  return Object.fromEntries(config.headers
    .find((entry) => entry.source === '/(.*)').headers
    .map(({ key, value }) => [key, value]))
}

test('separate production artifacts declare baseline headers and report-only CSP', async () => {
  const configs = await Promise.all([
    readJson('../vercel.storefront.json'),
    readJson('../vercel.admin.json'),
  ])

  for (const config of configs) {
    const headers = globalHeaders(config)
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Permissions-Policy']).toBeTruthy()
    expect(headers['Content-Security-Policy']).toBeUndefined()
    expect(headers['Content-Security-Policy-Report-Only']).toContain("default-src 'self'")
    expect(headers['Content-Security-Policy-Report-Only']).toContain("object-src 'none'")
    expect(headers['Content-Security-Policy-Report-Only']).toContain("frame-ancestors 'none'")
    expect(headers['Content-Security-Policy-Report-Only']).not.toContain("script-src 'self' 'unsafe-inline'")
    // HSTS is deliberately withheld until every production host/subdomain has HTTPS evidence.
    expect(headers['Strict-Transport-Security']).toBeUndefined()
  }

  expect(globalHeaders(configs[1])['X-Robots-Tag']).toBe('noindex, nofollow')
})

test('HTML and authenticated surfaces do not use shared caches while hashed assets are immutable', async () => {
  const [storefront, admin] = await Promise.all([
    readJson('../vercel.storefront.json'),
    readJson('../vercel.admin.json'),
  ])

  expect(globalHeaders(storefront)['Cache-Control']).toBe('no-store')
  expect(globalHeaders(admin)['Cache-Control']).toBe('private, no-store')
  for (const config of [storefront, admin]) {
    const assets = Object.fromEntries(config.headers
      .find((entry) => entry.source === '/assets/(.*)').headers
      .map(({ key, value }) => [key, value]))
    expect(assets['Cache-Control']).toBe('public, max-age=31536000, immutable')
  }
})

test('server JSON boundaries explicitly prohibit response caching', async () => {
  const [storefrontSecurity, adminSecurity] = await Promise.all([
    readFile(new URL('../server/storefront-bff/security.js', import.meta.url), 'utf8'),
    readFile(new URL('../server/admin-bff/security.js', import.meta.url), 'utf8'),
  ])
  for (const source of [storefrontSecurity, adminSecurity]) {
    expect(source).toContain("res.setHeader('Cache-Control', 'no-store')")
    expect(source).toContain("res.setHeader('X-Content-Type-Options', 'nosniff')")
  }
})

test('catalog media fixture no longer creates mixed-content traffic', async () => {
  const products = await readFile(new URL('../src/data/products.js', import.meta.url), 'utf8')
  expect(products).not.toContain("product_video_url: 'http://")
})

test('pre-render theme initialization is same-origin and does not require inline script', async () => {
  const [document, themeInit] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/theme-init.js', import.meta.url), 'utf8'),
  ])
  expect(document).toContain('<script src="/theme-init.js"></script>')
  expect(document).not.toMatch(/<script>\s*\(\(\) =>/)
  expect(themeInit).toContain("localStorage.getItem('theme')")
  expect(themeInit).toContain("matchMedia('(prefers-color-scheme: dark)')")
})

test('BFF activation requires the complete target-specific server environment by name', () => {
  const inactive = {
    admin: ['K2_DEPLOYMENT_TARGET', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_ADMIN_BFF_ENABLED'],
    storefront: ['K2_DEPLOYMENT_TARGET', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_GUEST_BFF_ENABLED'],
  }
  expect(validateInventory(inactive)).toEqual([])
  expect(validateInventory({
    ...inactive,
    storefront: [...inactive.storefront, 'VITE_CUSTOMER_ACCOUNT_ENABLED'],
  })).toEqual([])
  expect(validateInventory(inactive, { activationTargets: ['admin'] }))
    .toContain('admin: activation missing server variable K2_SESSION_COOKIE_KEY')

  const adminActivated = {
    ...inactive,
    admin: [...inactive.admin, 'K2_ADMIN_BFF_ENABLED', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY',
      'K2_SESSION_COOKIE_KEY', 'K2_ADMIN_BFF_REQUEST_SECRET', 'K2_ADMIN_ORIGINS',
      'VITE_TURNSTILE_SITE_KEY', 'K2_TURNSTILE_SECRET_KEY'],
  }
  expect(validateInventory(adminActivated, { activationTargets: ['admin'] })).toEqual([])
  expect(validateInventory({
    ...adminActivated,
    admin: [...adminActivated.admin, 'K2_ADMIN_PASSWORD_RECOVERY_ENABLED', 'K2_ADMIN_PASSWORD_RECOVERY_CALLBACK_URL'],
  }, { activationTargets: ['admin'] })).toEqual([])
})

test('each Vercel artifact declares one exact consolidated BFF entrypoint and rewrite', async () => {
  const [storefront, admin, storefrontEntrypoint, adminEntrypoint] = await Promise.all([
    readJson('../vercel.storefront.json'),
    readJson('../vercel.admin.json'),
    readFile(new URL('../api/storefront/index.js', import.meta.url), 'utf8'),
    readFile(new URL('../api/admin/index.js', import.meta.url), 'utf8'),
  ])

  // Rewrite ORDER is load-bearing. Vercel takes the first match, so the BFF route
  // must precede the SPA catch-all or every API call would be rewritten to
  // index.html. The catch-all itself is what makes deep links work in production:
  // without it, /product/:sku has no file on disk and Vercel returns 404. The dev
  // server falls back to index.html on its own, so this failure is invisible
  // locally and in the smoke suite — it only appears once deployed.
  expect(Object.keys(storefront.functions)).toEqual(['api/storefront/index.js'])
  expect(storefront.rewrites).toEqual([
    { source: '/api/storefront/:route*', destination: '/api/storefront?route=:route*' },
    { source: '/(.*)', destination: '/index.html' },
  ])
  expect(Object.keys(admin.functions)).toEqual(['api/admin/index.js'])
  expect(admin.rewrites).toEqual([
    { source: '/api/admin/:route*', destination: '/api/admin?route=:route*' },
    { source: '/(.*)', destination: '/index.html' },
  ])

  // Every client-side route the storefront can push must be reachable by a cold
  // direct request, which is only true while the catch-all is last.
  for (const artifact of [storefront, admin]) {
    const last = artifact.rewrites[artifact.rewrites.length - 1]
    expect(last).toEqual({ source: '/(.*)', destination: '/index.html' })
    expect(artifact.rewrites.findIndex((r) => r.source === '/(.*)')).toBe(artifact.rewrites.length - 1)
  }
  expect(storefrontEntrypoint).toContain("process.env.K2_STOREFRONT_BFF_ENABLED === 'true'")
  expect(storefrontEntrypoint).not.toContain('admin-bff')
  expect(adminEntrypoint).toContain("process.env.K2_ADMIN_BFF_ENABLED === 'true'")
  expect(adminEntrypoint).not.toContain('storefront-bff')
})
