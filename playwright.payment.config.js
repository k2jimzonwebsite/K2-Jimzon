import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', testMatch: ['payment-recovery-ui.spec.js', 'coupon-recovery-ui.spec.js', 'wholesale-recovery-ui.spec.js', 'media-recovery-ui.spec.js'], workers: 1,
  timeout: 120000, reporter: 'list',
  forbidOnly: !!process.env.CI,
  use: { baseURL: 'http://127.0.0.1:5195', viewport: { width: 1280, height: 900 } },
  webServer: {
    command: 'npx vite --mode combined --host 127.0.0.1 --port 5195 --strictPort --configLoader runner',
    url: 'http://127.0.0.1:5195', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_ADMIN_BFF_ENABLED: 'true' },
  },
})
