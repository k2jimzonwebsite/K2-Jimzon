import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { validateInventory } from '../scripts/verify-deployment-environment-contract.mjs'
import { STOREFRONT_SPA_PATHS } from '../src/lib/storefrontRoutes.js'

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
}

function globalHeaders(config) {
  return Object.fromEntries(config.headers
    .find((entry) => entry.source === '/(.*)').headers
    .map(({ key, value }) => [key, value]))
}

function runDeploymentSelector({
  target,
  projectId,
  projectIds = {
    storefront: 'prj_test_storefront',
    admin: 'prj_test_admin',
  },
  configTargets = ['storefront', 'admin'],
}) {
  const selectorUrl = new URL('../scripts/map024-evidence/select-vercel-deployment-config.mjs', import.meta.url).href
  const source = `
    import { readFileSync } from 'node:fs'
    import { join } from 'node:path'
    const { selectVercelDeploymentConfig } = await import(process.env.K2_TEST_SELECTOR_URL)

    const readConfig = (name) => JSON.parse(readFileSync(join(process.cwd(), name), 'utf8'))
    const selected = selectVercelDeploymentConfig({
      target: process.env.K2_DEPLOYMENT_TARGET,
      projectId: process.env.VERCEL_PROJECT_ID,
      projectIds: JSON.parse(process.env.K2_TEST_PROJECT_IDS),
      configs: Object.fromEntries(JSON.parse(process.env.K2_TEST_CONFIG_TARGETS).map((target) => [target, ({
        storefront: readConfig('vercel.storefront.json'),
        admin: readConfig('vercel.admin.json'),
      })[target]])),
    })
    process.stdout.write(JSON.stringify(selected))
  `

  const env = {
    ...process.env,
    K2_TEST_SELECTOR_URL: selectorUrl,
    K2_TEST_PROJECT_IDS: JSON.stringify(projectIds),
    K2_TEST_CONFIG_TARGETS: JSON.stringify(configTargets),
  }
  if (target !== undefined) env.K2_DEPLOYMENT_TARGET = target
  else delete env.K2_DEPLOYMENT_TARGET
  if (projectId !== undefined) env.VERCEL_PROJECT_ID = projectId
  else delete env.VERCEL_PROJECT_ID

  return spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env,
  })
}

function runRootVercelConfig({ target, projectId }) {
  const source = `
    const { config } = await import(${JSON.stringify(new URL('../vercel.ts', import.meta.url).href)})
    process.stdout.write(JSON.stringify(config))
  `
  const env = { ...process.env }
  if (target !== undefined) env.K2_DEPLOYMENT_TARGET = target
  else delete env.K2_DEPLOYMENT_TARGET
  if (projectId !== undefined) env.VERCEL_PROJECT_ID = projectId
  else delete env.VERCEL_PROJECT_ID

  return spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
    env,
  })
}

test('root Vercel config binds each real K2 project identity to its exact artifact contract', async () => {
  const cases = [
    {
      target: 'storefront',
      projectId: 'prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL',
      config: '../vercel.storefront.json',
    },
    {
      target: 'admin',
      projectId: 'prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x',
      config: '../vercel.admin.json',
    },
  ]

  for (const entry of cases) {
    const result = runRootVercelConfig(entry)
    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual(await readJson(entry.config))
  }
})

test('Vercel has exactly one root configuration authority', async () => {
  await expect(readFile(new URL('../vercel.ts', import.meta.url), 'utf8')).resolves.toContain(
    'selectVercelDeploymentConfig',
  )
  await expect(readFile(new URL('../vercel.json', import.meta.url), 'utf8')).rejects.toMatchObject({
    code: 'ENOENT',
  })
})

test('root Vercel config refuses a real K2 target attached to the opposite project', () => {
  const result = runRootVercelConfig({
    target: 'admin',
    projectId: 'prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL',
  })

  expect(result.status).toBe(1)
  expect(result.stderr).toContain(
    'MAP024_VERCEL_CONFIG_REFUSAL: target "admin" does not match Vercel project "prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL"',
  )
})

test('prepared Vercel selector returns the exact config for each reviewed target and project pair', async () => {
  const cases = [
    { target: 'storefront', projectId: 'prj_test_storefront', config: '../vercel.storefront.json' },
    { target: 'admin', projectId: 'prj_test_admin', config: '../vercel.admin.json' },
  ]

  for (const entry of cases) {
    const result = runDeploymentSelector(entry)
    expect(result.status, result.stderr).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual(await readJson(entry.config))
  }
})

test('prepared Vercel selector refuses missing, invalid, and mismatched deployment identity', () => {
  const cases = [
    {
      input: { projectId: 'prj_test_storefront' },
      message: 'K2_DEPLOYMENT_TARGET is required; set it to "storefront" or "admin"',
    },
    {
      input: { target: 'backoffice', projectId: 'prj_test_admin' },
      message: 'K2_DEPLOYMENT_TARGET must be "storefront" or "admin"',
    },
    {
      input: { target: 'admin' },
      message: 'VERCEL_PROJECT_ID is required; enable Vercel system environment variables',
    },
    {
      input: { target: 'storefront', projectId: 'prj_test_admin' },
      message: 'target "storefront" does not match Vercel project "prj_test_admin"',
    },
  ]

  for (const entry of cases) {
    const result = runDeploymentSelector(entry.input)
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(`MAP024_VERCEL_CONFIG_REFUSAL: ${entry.message}`)
  }
})

test('prepared Vercel selector refuses a target without a reviewed project mapping', () => {
  const result = runDeploymentSelector({
    target: 'storefront',
    projectId: 'prj_test_storefront',
    projectIds: { admin: 'prj_test_admin' },
  })

  expect(result.status).toBe(1)
  expect(result.stderr).toContain(
    'MAP024_VERCEL_CONFIG_REFUSAL: no reviewed Vercel project mapping exists for target "storefront"',
  )
})

test('prepared Vercel selector refuses a target without a reviewed artifact config', () => {
  const result = runDeploymentSelector({
    target: 'storefront',
    projectId: 'prj_test_storefront',
    configTargets: ['admin'],
  })

  expect(result.status).toBe(1)
  expect(result.stderr).toContain(
    'MAP024_VERCEL_CONFIG_REFUSAL: no reviewed artifact config exists for target "storefront"',
  )
})

/**
 * The file the provider actually reads.
 *
 * `vercel.storefront.json` and `vercel.admin.json` are reviewed artifacts.
 * Vercel supports either static `vercel.json` or programmatic `vercel.ts`; the
 * root TypeScript config selects the exact reviewed artifact for the attached
 * project. These assertions pin the provider-recognized entrypoint because the
 * artifact tests above cannot catch its absence.
 */
test('the provider-supported root vercel.ts selects a complete target config', () => {
  for (const entry of [
    { target: 'storefront', projectId: 'prj_ULQ5zbR7zDaFCMlXVjlrZxj9sXsL', apiRoute: '/api/storefront/:route*', appRoute: '/catalog' },
    { target: 'admin', projectId: 'prj_hPWQKCjIQRuKB3LLlbCmlGNHjL3x', apiRoute: '/api/admin/:route*', appRoute: '/admin-portal-k2-secure' },
  ]) {
    const result = runRootVercelConfig(entry)
    expect(result.status, result.stderr).toBe(0)
    const config = JSON.parse(result.stdout)
    const sources = config.rewrites.map((rule) => rule.source)
    expect(sources).toContain(entry.apiRoute)
    expect(sources).toContain(entry.appRoute)
    expect(sources).not.toContain('/(.*)')

    const headers = globalHeaders(config)
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Content-Security-Policy-Report-Only']).toContain("frame-ancestors 'none'")
    expect(headers['Content-Security-Policy']).toBeUndefined()
    expect(headers['Strict-Transport-Security']).toBeUndefined()
    expect(JSON.stringify(config)).not.toContain('X-XSS-Protection')

    const assets = config.headers.find((rule) => rule.source === '/assets/(.*)')
    expect(assets.headers[0].value).toBe('public, max-age=31536000, immutable')
  }
})

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

test('staff deployment documentation matches the enforced Vercel environment contract', async () => {
  const documents = await Promise.all([
    readFile(new URL('../docs/DEPLOYMENT.md', import.meta.url), 'utf8'),
    readFile(new URL('../docs/INTEGRATIONS.md', import.meta.url), 'utf8'),
  ])
  const combined = documents.join('\n')

  for (const required of [
    'K2_GUEST_BFF_SECRET',
    'K2_TURNSTILE_SECRET_KEY',
    'K2_SESSION_COOKIE_KEY',
    'K2_ADMIN_BFF_REQUEST_SECRET',
    'SUPABASE_PUBLISHABLE_KEY',
  ]) {
    expect(combined).toContain(required)
  }
  for (const forbidden of [
    'K2_GUEST_GRANT_SECRET',
    'CLOUDFLARE_TURNSTILE_SECRET_KEY',
    'K2_ADMIN_COOKIE_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]) {
    expect(combined).not.toContain(forbidden)
  }
})

test('each Vercel artifact declares one exact consolidated BFF entrypoint and only known app rewrites', async () => {
  const [storefront, admin, storefrontEntrypoint, adminEntrypoint] = await Promise.all([
    readJson('../vercel.storefront.json'),
    readJson('../vercel.admin.json'),
    readFile(new URL('../api/storefront/index.js', import.meta.url), 'utf8'),
    readFile(new URL('../api/admin/index.js', import.meta.url), 'utf8'),
  ])

  // Rewrite order is load-bearing. The filesystem serves generated product
  // HTML before higher-level rewrites; the product rule recovers only a
  // missing/unpublished SKU in the client. There is deliberately no global
  // catch-all: other unmatched requests retain a host 404.
  expect(Object.keys(storefront.functions)).toEqual(['api/storefront/index.js'])
  expect(storefront.rewrites).toEqual([
    { source: '/api/storefront/:route*', destination: '/api/storefront?route=:route*' },
    { source: '/product/:sku', destination: '/index.html' },
    ...STOREFRONT_SPA_PATHS.map(source => ({ source, destination: '/index.html' })),
  ])
  expect(Object.keys(admin.functions)).toEqual(['api/admin/index.js'])
  expect(admin.rewrites).toEqual([
    { source: '/api/admin/:route*', destination: '/api/admin?route=:route*' },
    { source: '/admin-portal-k2-secure', destination: '/index.html' },
  ])

  for (const artifact of [storefront, admin]) {
    expect(artifact.rewrites.some(rule => rule.source === '/(.*)')).toBe(false)
  }
  expect(storefrontEntrypoint).toContain("process.env.K2_STOREFRONT_BFF_ENABLED === 'true'")
  expect(storefrontEntrypoint).not.toContain('admin-bff')
  expect(adminEntrypoint).toContain("process.env.K2_ADMIN_BFF_ENABLED === 'true'")
  expect(adminEntrypoint).not.toContain('storefront-bff')
})

test('Vite config loads only the exact browser-safe environment inputs it consumes', async () => {
  const source = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8')

  // An empty prefix imports every local server secret into Vite's resolved
  // config object; `vite --debug` then prints those values to the terminal.
  expect(source).not.toContain("loadEnv(mode, projectRoot, '')")
  expect(source).toContain('loadEnv(mode, projectRoot, VITE_CONFIG_ENV_KEYS)')
  expect(source).toContain('envPrefix: BROWSER_ENV_KEYS')
  for (const name of [
    'K2_DEPLOYMENT_TARGET',
    'VITE_IS_ADMIN_DEPLOYMENT',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
  ]) {
    expect(source).toContain(`'${name}'`)
  }
})
