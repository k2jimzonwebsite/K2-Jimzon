import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests', testMatch: 'storefront-recovery-ui.spec.js',
  workers: 1, timeout: 180000, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5207', viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' },
  webServer: {
    command: 'npx vite --mode storefront --host 127.0.0.1 --port 5207 --strictPort --configLoader runner',
    url: 'http://127.0.0.1:5207', reuseExistingServer: false,
    env: { VITE_SUPABASE_URL: 'http://127.0.0.1:5207', VITE_SUPABASE_PUBLIC_KEY: 'sb_publishable_synthetic_fixture',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_synthetic_fixture', VITE_GUEST_BFF_ENABLED: 'true', VITE_TURNSTILE_SITE_KEY: 'synthetic-site-key' },
  },
})
