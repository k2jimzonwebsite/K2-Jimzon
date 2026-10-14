import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', testMatch: 'admin-auth-recovery.spec.js', timeout: 90000,
  workers: 1, reporter: 'list', use: { baseURL: 'http://localhost:5187', viewport: { width: 375, height: 812 } },
  webServer: {
    command: 'npx vite --mode admin --port 5187 --configLoader runner',
    env: { K2_ACCEPTANCE_NO_WATCH: 'true', VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'fixture-public-key', VITE_ADMIN_BFF_ENABLED: 'true', VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' },
    url: 'http://localhost:5187', reuseExistingServer: false,
  },
})
