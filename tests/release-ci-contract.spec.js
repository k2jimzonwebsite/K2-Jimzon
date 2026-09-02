import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')

test('remote CI runs the complete local acceptance command without skipping protected Admin fixtures', async () => {
  const [workflow, packageSource, adminConfig, adminDashboard, adminAuth, accountHarness, accountSpec] = await Promise.all([
    read('.github/workflows/ci.yml'),
    read('package.json'),
    read('playwright.admin.config.js'),
    read('tests/admin-dashboard-redesign.spec.js'),
    read('tests/admin.spec.js'),
    read('scripts/test-customer-account-ui.mjs'),
    read('tests/customer-account-ui.spec.js'),
  ])
  const packageJson = JSON.parse(packageSource)

  expect(packageJson.dependencies?.dotenv).toBeUndefined()
  expect(packageJson.devDependencies?.dotenv).toBeUndefined()

  for (const suite of [
    'test:base',
    'test:storefront-ui',
    'test:admin-ui',
    'test:admin-product-master-ui',
    'test:owner-count-close-ui',
    'test:customer-account-ui',
    'test:selling-surfaces',
  ]) {
    expect(packageJson.scripts.test).toContain(`npm run ${suite}`)
  }

  expect(workflow).toMatch(/^\s*run:\s*npm test\s*$/m)
  expect(workflow).toContain("CI: 'true'")
  expect(workflow).not.toContain('VITE_SUPABASE_URL')
  expect(adminConfig).toContain("VITE_SUPABASE_URL: 'https://fixture.supabase.co'")
  expect(adminDashboard).toContain("const supabaseUrl = 'https://fixture.supabase.co'")
  expect(adminDashboard).not.toContain('test.skip(!supabaseUrl')
  expect(adminAuth).toContain("page.route('https://fixture.supabase.co/auth/v1/**'")
  expect(accountHarness).toContain("const supabaseProjectRef = 'fixture'")
  expect(accountHarness).toContain("VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture-publishable-key'")
  expect(accountHarness).not.toContain('pixplcjqivlfflickobf')
  expect(accountSpec).not.toContain('pixplcjqivlfflickobf')
  expect(accountSpec).toContain("page.route('https://fixture.supabase.co/**'")
  expect(workflow).toContain('test-results/')
})

test('the shared Playwright server cannot be reused by a CI run', async () => {
  const config = await read('playwright.config.js')

  expect(config).toContain('reuseExistingServer: !process.env.CI')
  expect(config).toContain("'owner-count-close-ui.spec.js'")
})

test('every Playwright runner rejects accidental focused tests in CI', async () => {
  const configs = await Promise.all([
    'playwright.config.js',
    'playwright.account.config.js',
    'playwright.admin.config.js',
    'playwright.api.config.js',
    'playwright.map027.config.js',
    'playwright.owner-close.config.js',
    'playwright.product-master.config.js',
    'playwright.selling.config.js',
  ].map(async path => ({ path, source: await read(path) })))

  for (const config of configs) {
    expect(config.source, config.path).toMatch(/forbidOnly:\s*(?:!!|Boolean\()?process\.env\.CI/)
  }
})

test('Playwright web servers use cross-platform commands on the Ubuntu CI runner', async () => {
  const configs = await Promise.all([
    'playwright.config.js',
    'playwright.admin.config.js',
    'playwright.map027.config.js',
    'playwright.owner-close.config.js',
    'playwright.product-master.config.js',
    'playwright.selling.config.js',
  ].map(async path => ({ path, source: await read(path) })))

  for (const config of configs) {
    expect(config.source, config.path).not.toMatch(/\b(?:npm|npx)\.cmd\b/i)
  }
})
