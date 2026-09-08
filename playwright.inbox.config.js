import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'inbox-phase2.spec.js',
  fullyParallel: false,
  timeout: 120000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5193',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --mode combined --host 127.0.0.1 --port 5193 --strictPort --configLoader runner',
    url: 'http://127.0.0.1:5193',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
