import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', testMatch: 'store-orientation-ui.spec.js', workers: 1,
  timeout: 120000, reporter: 'list', forbidOnly: !!process.env.CI,
  use: { baseURL: 'http://127.0.0.1:5298' },
  webServer: {
    command: 'npx vite --mode storefront --host 127.0.0.1 --port 5298 --strictPort --configLoader runner',
    url: 'http://127.0.0.1:5298/src/index.css', reuseExistingServer: false, timeout: 120000,
    env: { VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture-publishable-key' },
  },
})
