import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', testMatch: 'intake-ai-ui.spec.js', workers: 1, timeout: 120000, reporter: 'list', forbidOnly: !!process.env.CI,
  use: { baseURL: 'http://127.0.0.1:5198', viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' },
  webServer: {
    command: 'npx vite --mode combined --host 127.0.0.1 --port 5198 --strictPort --configLoader runner',
    url: 'http://127.0.0.1:5198', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_ADMIN_BFF_ENABLED: 'true' },
  },
})
