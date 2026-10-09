import baseConfig from '../../vite.config.js'

export default environment => {
  const config = baseConfig(environment)
  return { ...config, cacheDir: 'node_modules/.vite-workflow-map-fixture',
    server: { watch: null },
    optimizeDeps: { noDiscovery: true, include: ['react', 'react-dom/client', '@supabase/supabase-js'] },
  }
}
