import baseConfig from '../../vite.config.js'

export default (environment) => {
  const config = baseConfig(environment)
  return {
    ...config,
    cacheDir: 'node_modules/.vite-storefront-recovery-fixture',
    server: { watch: null },
    optimizeDeps: {
      noDiscovery: true,
      include: ['react', 'react-dom/client', 'react-helmet-async', '@supabase/supabase-js'],
    },
  }
}
