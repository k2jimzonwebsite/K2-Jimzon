import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_ADMIN_BASE_URL || 'http://localhost:5180'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 45000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: {
    command: 'npx vite --mode combined --port 5180 --configLoader runner',
    env: { VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' },
    url: 'http://localhost:5180',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
