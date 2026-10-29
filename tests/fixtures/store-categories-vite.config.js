import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  envDir: false, cacheDir: 'node_modules/.vite-store-categories', server: { watch: null },
  resolve: { alias: { '@k2-lazy-supabase-client': fileURLToPath(new URL('../../src/lib/supabaseClient.js', import.meta.url)) } },
  plugins: [react(), tailwindcss(), { name: 'category-fixture-route', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (/^\/catalog(?:\?|$)/.test(req.url || '')) req.url = '/tests/fixtures/store-categories.html'
      next()
    })
  } }],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://fixture.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLIC_KEY': JSON.stringify('synthetic-public-key'),
    'import.meta.env.VITE_GUEST_BFF_ENABLED': JSON.stringify('true'),
    'import.meta.env.VITE_ADMIN_BFF_ENABLED': JSON.stringify('true'),
  },
  optimizeDeps: { noDiscovery: true, entries: ['tests/fixtures/store-categories.html'], include: ['react', 'react-dom/client', '@supabase/supabase-js', 'motion/react', 'papaparse', 'react-barcode'] },
})
