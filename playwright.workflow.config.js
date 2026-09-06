import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', testMatch: 'workflow-api-ui.spec.js', workers: 1,
  forbidOnly: !!process.env.CI, timeout: 120000, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5197', viewport: { width: 1280, height: 900 } },
  webServer: {
    command: 'npx vite --mode combined --host 127.0.0.1 --port 5197 --strictPort --configLoader runner',
    url: 'http://127.0.0.1:5197', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_ADMIN_BFF_ENABLED: 'true' },
  },
})
