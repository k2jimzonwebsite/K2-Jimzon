import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', testMatch: 'product-families-ui.spec.js', workers: 1, timeout: 45000, reporter: 'list',
  outputDir: '.tools/product-families-ui-results',
  use: { baseURL: 'http://127.0.0.1:5219', viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' },
  webServer: {
    command: 'npx vite --config tests/fixtures/product-families-vite.config.js --host 127.0.0.1 --port 5219 --strictPort --configLoader runner',
    url: 'http://127.0.0.1:5219/tests/fixtures/product-families.html', reuseExistingServer: false, timeout: 120000,
  },
})
