import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests', testMatch: 'security-check-recovery.spec.js',
  outputDir: '.tools/security-check-regression-results',
  forbidOnly: !!process.env.CI, workers: 1, timeout: 30000, reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5218', viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' },
  webServer: {
    command: 'npx vite --config tests/fixtures/security-check-vite.config.js --mode storefront --host 127.0.0.1 --port 5218 --strictPort --configLoader runner',
    url: 'http://127.0.0.1:5218/src/index.css', reuseExistingServer: false, timeout: 240000,
    env: { VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' },
  },
})
