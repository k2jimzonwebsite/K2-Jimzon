import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests',
  // These journeys require environment contracts that intentionally conflict
  // with the shared combined server. `npm test` runs each one through its
  // dedicated config after this base suite completes.
  testIgnore: [
    'admin.spec.js',
    'admin-dashboard-redesign.spec.js',
    'admin-product-master-ui.spec.js',
    'buyer.spec.js',
    'customer-account-ui.spec.js',
    'owner-count-close-ui.spec.js',
    'smoke.spec.js',
    'storefront-mobile.spec.js',
    'storefront-motion.spec.js',
    'storefront-selling-surfaces.spec.js',
    'storefront-theme.spec.js',
    'wholesale-inquiry-ui.spec.js',
  ],
  fullyParallel: false,
  // A cold combined-mode Vite transform can take about a minute on the Windows
  // workstation. Keep product assertions bounded while allowing that first
  // compile the same budget as the dedicated browser suites.
  timeout: 120000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: {
    // The full suite contains both Storefront and Admin journeys. Use the
    // workstation-only combined entry here; production boundary checks still
    // build and inspect the two target-specific applications separately.
    command: 'npx vite --mode combined --port 5173 --configLoader runner',
    env: { VITE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' },
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
