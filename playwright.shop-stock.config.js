import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests', testMatch: 'shop-stock-ui.spec.js', workers: 1, timeout: 45000,
  reporter: 'list', use: { baseURL: 'http://localhost:5194' },
  webServer: {
    command: 'npx vite --mode combined --port 5194 --strictPort --configLoader runner --config tests/fixtures/shop-stock-vite.config.js',
    env: { VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture_shop_stock' },
    url: 'http://localhost:5194', reuseExistingServer: false, timeout: 120000,
  },
})
