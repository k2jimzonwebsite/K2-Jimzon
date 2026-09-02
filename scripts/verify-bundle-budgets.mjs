import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

const target = process.argv[2]
if (!['storefront', 'admin'].includes(target)) {
  throw new Error('Usage: node scripts/verify-bundle-budgets.mjs <storefront|admin>')
}

const distDir = path.resolve('dist')
const manifestPath = path.join(distDir, '.vite', 'manifest.json')
if (!fs.existsSync(manifestPath)) throw new Error('Build manifest is missing. Run the target build first.')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

function artifactBytes(file) {
  const fullPath = path.resolve(distDir, file)
  if (!fullPath.startsWith(`${distDir}${path.sep}`) || !fs.existsSync(fullPath)) {
    throw new Error(`Budget artifact is missing: ${file}`)
  }
  return fs.readFileSync(fullPath)
}

function collectStaticEntries(startKeys) {
  const visited = new Set()
  const visit = (key) => {
    if (visited.has(key)) return
    const entry = manifest[key]
    if (!entry) throw new Error(`Budget manifest entry is missing: ${key}`)
    visited.add(key)
    for (const imported of entry.imports || []) visit(imported)
  }
  for (const key of startKeys) visit(key)
  return [...visited].map(key => manifest[key])
}

function gzipTotal(entries) {
  const files = new Set(entries.map(entry => entry.file).filter(file => file?.endsWith('.js')))
  return [...files].reduce((sum, file) => sum + gzipSync(artifactBytes(file)).byteLength, 0)
}

function cssGzipTotal(entries) {
  const files = new Set(entries.flatMap(entry => entry.css || []))
  return [...files].reduce((sum, file) => sum + gzipSync(artifactBytes(file)).byteLength, 0)
}

function format(bytes) {
  return `${(bytes / 1000).toFixed(2)} kB`
}

if (target === 'storefront') {
  const landing = collectStaticEntries(['index.html', 'src/views/Home.jsx'])
  const js = gzipTotal(landing)
  const css = cssGzipTotal(landing)
  if (js > 150_000 || css > 30_000) {
    throw new Error(`Storefront landing budget exceeded: JS ${format(js)}/150.00 kB gzip; CSS ${format(css)}/30.00 kB gzip.`)
  }
  console.log(`Storefront landing budget passed: JS ${format(js)}/150.00 kB gzip; CSS ${format(css)}/30.00 kB gzip.`)
} else {
  const admin = manifest['src/views/admin/Admin.jsx']
    || Object.values(manifest).find(entry => entry.name === 'Admin')
  if (!admin) throw new Error('Admin budget manifest entry is missing: src/views/admin/Admin.jsx')
  const bytes = artifactBytes(admin.file).byteLength
  if (bytes > 300_000) {
    throw new Error(`Admin application chunk exceeds budget: ${format(bytes)}/300.00 kB minified.`)
  }
  console.log(`Admin application budget passed: ${format(bytes)}/300.00 kB minified.`)
}
