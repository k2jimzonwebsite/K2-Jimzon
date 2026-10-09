import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests', testMatch: 'order-receipt-direct-ui.spec.js',
  workers: 1, timeout: 120000, reporter: 'list',
  use: { baseURL: 'http://localhost:5208', ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
  webServer: {
    command: 'npx vite --config tests/fixtures/storefront-recovery-vite.config.js --mode storefront --port 5208 --strictPort --configLoader runner',
    url: 'http://localhost:5208/src/index.css', reuseExistingServer: false, timeout: 120000,
    env: { VITE_SUPABASE_URL: 'http://localhost:5208', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture', VITE_GUEST_BFF_ENABLED: 'false' },
  },
})
