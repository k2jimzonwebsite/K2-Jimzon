import baseConfig from '../../vite.config.js'
import { readFileSync } from 'node:fs'

export default (environment) => {
  const config = baseConfig(environment)
  const original = process.env.K2_SHOP_STOCK_ORIGINAL === 'true'
  return {
    ...config,
    cacheDir: 'node_modules/.vite-shop-stock-fixture',
    server: { watch: null },
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', '@supabase/supabase-js'] },
    plugins: [
      ...(original ? [{
        name: 'shop-stock-original-regression', enforce: 'pre',
        load(id) {
          if (id.split('?')[0].replaceAll('\\', '/').endsWith('/src/views/admin/ShopAllocationManager.jsx')) {
            return readFileSync('docs/design-checkpoints/20261002-shop-stock/ShopAllocationManager.jsx', 'utf8')
          }
        },
      }] : []),
      ...config.plugins,
    ],
  }
}
