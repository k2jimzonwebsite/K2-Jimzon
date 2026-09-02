import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 120000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_PRODUCT_MASTER_BASE_URL || 'http://localhost:5181',
    viewport: { width: 375, height: 812 },
    trace: 'on-first-retry',
  },
  projects: [{
    name: 'chromium',
    use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
  }],
  webServer: {
    command: 'npx vite --mode combined --port 5181 --configLoader runner',
    env: {
      VITE_ADMIN_BFF_ENABLED: 'true',
      VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
    },
    url: 'http://localhost:5181',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
