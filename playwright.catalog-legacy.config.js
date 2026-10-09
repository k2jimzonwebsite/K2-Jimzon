import { defineConfig } from '@playwright/test'
import paymentConfig from './playwright.payment.config.js'
export default defineConfig({
  ...paymentConfig,
  testMatch: ['catalog-import-legacy-ui.spec.js'],
  webServer: {
    ...paymentConfig.webServer,
    env: { ...paymentConfig.webServer.env, VITE_ADMIN_BFF_ENABLED: 'false' },
  },
})
