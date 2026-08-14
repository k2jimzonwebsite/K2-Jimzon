import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 15000,
  workers: 1,
  reporter: 'list',
})
