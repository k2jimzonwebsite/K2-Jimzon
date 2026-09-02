import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 15000,
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: 'list',
})
