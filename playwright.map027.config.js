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
    url: 'http://localhost:5192',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
})
