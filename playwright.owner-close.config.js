import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 120000,
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5183',
    ...devices['Desktop Chrome'],
    viewport: { width: 375, height: 812 },
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --mode combined --host 127.0.0.1 --port 5183 --configLoader runner',
    env: { VITE_ADMIN_BFF_ENABLED: 'true', VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' },
    url: 'http://127.0.0.1:5183',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
