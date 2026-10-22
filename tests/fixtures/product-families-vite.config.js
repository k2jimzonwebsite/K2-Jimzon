import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  envDir: false, cacheDir: 'node_modules/.vite-product-families',
  server: { watch: null },
  resolve: { alias: { '@k2-lazy-supabase-client': fileURLToPath(new URL('../../src/lib/supabaseClient.js', import.meta.url)) } },
  plugins: [react(), tailwindcss(), { name: 'family-fixture-routes', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (/^\/(product\/|catalog(?:\?|$)|checkout(?:\?|$))/.test(req.url || '')) req.url = '/tests/fixtures/product-families.html'
      next()
    })
  } }],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://fixture.supabase.co'),
    'import.meta.env.VITE_SUPABASE_PUBLIC_KEY': JSON.stringify('synthetic-public-key'),
    'import.meta.env.VITE_GUEST_BFF_ENABLED': JSON.stringify('true'),
    'import.meta.env.VITE_ADMIN_BFF_ENABLED': JSON.stringify('true'),
  },
  optimizeDeps: { noDiscovery: true, entries: ['tests/fixtures/product-families.html'], include: ['react', 'react-dom/client', '@supabase/supabase-js', 'motion/react'] },
})
