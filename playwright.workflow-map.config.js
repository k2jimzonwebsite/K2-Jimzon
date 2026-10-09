import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests', testMatch: 'workflow-map-ui.spec.js', workers: 1, timeout: 30000,
  reporter: 'list', use: { baseURL: 'http://localhost:5196', viewport: { width: 1440, height: 1000 } },
  webServer: {
    command: 'npx vite --mode combined --port 5196 --strictPort --configLoader runner --config tests/fixtures/workflow-map-vite.config.js',
    env: { VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture_workflow_map' },
    url: 'http://localhost:5196', reuseExistingServer: false, timeout: 120000,
  },
})
