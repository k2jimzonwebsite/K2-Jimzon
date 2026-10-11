import productMasterConfig from './admin-product-master-vite.config.js'
export default environment => {
  const config = productMasterConfig(environment)
  return { ...config, cacheDir: 'node_modules/.vite-admin-sheet-reference-fixture', optimizeDeps: { ...config.optimizeDeps, include: [...config.optimizeDeps.include, 'react-barcode'] } }
}
