import base from './playwright.product-master.config.js'
export default {
  ...base,
  webServer: { ...base.webServer, command: base.webServer.command.replace('admin-product-master-vite.config.js', 'admin-sheet-reference-vite.config.js'), env: { ...base.webServer.env, VITE_SUPABASE_PUBLIC_KEY: 'synthetic-public-fixture-key' } },
}
