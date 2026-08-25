#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
const failures = []

if (lock.lockfileVersion !== 3) failures.push(`lockfileVersion must be 3, received ${lock.lockfileVersion}`)
const rootLock = lock.packages?.[''] || {}
for (const field of ['dependencies', 'devDependencies']) {
  const expected = manifest[field] || {}
  const actual = rootLock[field] || {}
  if (JSON.stringify(expected) !== JSON.stringify(actual)) failures.push(`${field} differs between package.json and package-lock.json`)
}

const allowedLicenses = new Set([
  '0BSD', 'Apache-2.0', 'Apache-2.0 AND LGPL-3.0-or-later',
  'Apache-2.0 AND LGPL-3.0-or-later AND MIT', 'BSD-2-Clause', 'BSD-3-Clause',
  'CC-BY-4.0', 'ISC', 'LGPL-3.0-or-later', 'MIT', 'MPL-2.0',
])
const allowedInstallScripts = new Set([
  'node_modules/esbuild',
  'node_modules/fsevents',
  'node_modules/vite/node_modules/fsevents',
])
const licenseCounts = new Map()
const installScripts = []

for (const [packagePath, entry] of Object.entries(lock.packages || {})) {
  if (!packagePath) continue
  if (entry.resolved && !entry.resolved.startsWith('https://registry.npmjs.org/')) {
    failures.push(`${packagePath} resolves outside the npm registry`)
  }
  if (entry.resolved && !entry.integrity) failures.push(`${packagePath} has no integrity hash`)
  const license = entry.license || 'UNKNOWN'
  licenseCounts.set(license, (licenseCounts.get(license) || 0) + 1)
  if (!allowedLicenses.has(license) && !(license === 'UNKNOWN' && packagePath === 'node_modules/webgl-constants')) {
    failures.push(`${packagePath} has unreviewed license ${license}`)
  }
  if (entry.hasInstallScript) installScripts.push(packagePath)
}

try {
  const webglLicense = await readFile(path.join(root, 'node_modules', 'webgl-constants', 'LICENSE'), 'utf8')
  if (!webglLicense.startsWith('MIT License')) failures.push('webgl-constants license exception is no longer MIT')
} catch {
  failures.push('webgl-constants license file is unavailable for its reviewed MIT exception')
}

for (const packagePath of installScripts) {
  if (!allowedInstallScripts.has(packagePath)) failures.push(`${packagePath} has an unreviewed install script`)
}
for (const packagePath of allowedInstallScripts) {
  if (!installScripts.includes(packagePath)) failures.push(`${packagePath} reviewed install-script entry is missing; update the policy deliberately`)
}

if (failures.length) {
  console.error('Dependency policy failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  const directCount = Object.keys(manifest.dependencies || {}).length + Object.keys(manifest.devDependencies || {}).length
  const packageCount = Math.max(0, Object.keys(lock.packages || {}).length - 1)
  console.log(`Dependency policy passed (${directCount} direct, ${packageCount} locked packages, ${installScripts.length} reviewed install scripts).`)
  console.log(`Reviewed licenses: ${[...licenseCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([license, count]) => `${license}=${count}`).join(', ')}`)
}
