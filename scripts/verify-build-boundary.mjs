import fs from 'node:fs'
import path from 'node:path'

const distDir = path.resolve('dist')
const targetFile = path.join(distDir, 'k2-build-target.json')
const manifestFile = path.join(distDir, '.vite', 'manifest.json')
const expectedTarget = process.argv[2] || 'auto'

if (!fs.existsSync(targetFile) || !fs.existsSync(manifestFile)) {
  throw new Error('Build boundary verification requires a completed Vite build with a manifest.')
}

const { target } = JSON.parse(fs.readFileSync(targetFile, 'utf8'))
const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
const modules = Object.keys(manifest)

if (!['storefront', 'admin'].includes(target)) {
  throw new Error(`Production build target must be storefront or admin; received "${target}".`)
}

if (expectedTarget !== 'auto' && target !== expectedTarget) {
  throw new Error(`Expected a ${expectedTarget} build but Vite produced ${target}.`)
}

const forbiddenPatterns = target === 'storefront'
  ? [/src\/AdminApp\.jsx$/i, /src\/views\/admin\//i]
  : [
      /src\/StorefrontApp\.jsx$/i,
      /src\/views\/(Home|Catalog|Checkout|Confirmation|MasterProduct|Pasabuy|ProductDetail|Wholesale)\.jsx$/i,
    ]

const violations = modules.filter((moduleName) => forbiddenPatterns.some((pattern) => pattern.test(moduleName)))

if (violations.length > 0) {
  throw new Error(`${target} build crossed the deployment boundary:\n${violations.join('\n')}`)
}

console.log(`Verified ${target} production boundary (${modules.length} manifest modules).`)
