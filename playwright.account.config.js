import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests', fullyParallel: false, timeout: 45000,
  forbidOnly: !!process.env.CI, retries: 0, workers: 1, reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_ACCOUNT_BASE_URL || 'http://127.0.0.1:5181',
    ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 },
    trace: 'on-first-retry',
  },
})

