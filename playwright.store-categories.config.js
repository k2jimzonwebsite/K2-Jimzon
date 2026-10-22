import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests', testMatch: 'store-categories-ui.spec.js', workers: 1, timeout: 30000, reporter: 'list',
  outputDir: '.tools/store-categories-ui-results',
  use: { baseURL: 'http://127.0.0.1:5221', viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' },
  webServer: {
    command: 'npx vite --config tests/fixtures/store-categories-vite.config.js --host 127.0.0.1 --port 5221 --strictPort --configLoader runner',
    url: 'http://127.0.0.1:5221/tests/fixtures/store-categories.html', reuseExistingServer: false, timeout: 120000,
  },
})
