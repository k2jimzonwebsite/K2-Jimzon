import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://localhost:5191'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 120000,
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 900 },
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --mode storefront --port 5191 --configLoader runner',
    env: {
      // Keep this browser contract hermetic: every Supabase request is fulfilled
      // by the test route handlers instead of touching a configured project.
      VITE_SUPABASE_URL: baseURL,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'selling-surface-public-key',
      VITE_GUEST_BFF_ENABLED: 'true',
      VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000,
  },
})
