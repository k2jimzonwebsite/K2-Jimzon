import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 120000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5192',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --mode storefront --port 5192 --strictPort --configLoader runner',
    // The HTML shell is available before Vite finishes the cold Tailwind
    // transform. Wait for the stylesheet so the first journey owns no startup work.
    url: 'http://localhost:5192/src/index.css',
    reuseExistingServer: false,
    timeout: 240000,
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
    },
  },
})
