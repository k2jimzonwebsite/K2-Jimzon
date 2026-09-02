import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { findSensitiveFiles, sensitiveFileReason, enumerateSourceFiles } from './sensitive-file-policy.mjs'

const blocked = [
  '.env', '.env.production', 'config/.env.local', '.npmrc', 'auth.json',
  'credentials.json', 'service-account.json', 'private.pem', 'signing.key',
  'identity.p12', 'identity.pfx', 'production.dump', 'backup.sql.gz',
]

for (const file of blocked) {
  assert.notEqual(sensitiveFileReason(file), '', `${file} should be blocked`)
}

for (const file of ['.env.example', 'examples/.env.example', 'docs/credentials.md', 'schema.sql']) {
  assert.equal(sensitiveFileReason(file), '', `${file} should be allowed`)
}

assert.equal(findSensitiveFiles(blocked).length, blocked.length)

// Deployment-source inventory (MAP-024). A Vercel checkout has no git, so the
// tracked check cannot run there; this path must be stricter, never a bypass.
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'k2-source-inventory-'))
fs.mkdirSync(path.join(fixture, 'src'), { recursive: true })
fs.mkdirSync(path.join(fixture, 'node_modules', 'pkg'), { recursive: true })
fs.writeFileSync(path.join(fixture, 'src', 'app.js'), 'export default 1\n')
fs.writeFileSync(path.join(fixture, '.env.example'), 'PUBLIC=1\n')
fs.writeFileSync(path.join(fixture, '.env.local'), 'SECRET=1\n')
fs.writeFileSync(path.join(fixture, 'deploy.pem'), 'key\n')
fs.writeFileSync(path.join(fixture, 'node_modules', 'pkg', 'vendor.pem'), 'vendor\n')

const inventory = enumerateSourceFiles(fixture)

// Untracked files still ship, so the inventory must see them.
assert.ok(inventory.includes('.env.local'), 'inventory must include untracked env files')
assert.ok(inventory.includes('deploy.pem'), 'inventory must include untracked keys')
assert.ok(inventory.includes('src/app.js'), 'inventory must include ordinary source')

// Vendor code is governed by the dependency policy, not this gate.
assert.ok(
  !inventory.some(file => file.startsWith('node_modules/')),
  'inventory must skip node_modules',
)

// Paths are repo-relative with forward slashes so both modes feed the policy
// identically shaped input.
const BACKSLASH = String.fromCharCode(92)
assert.ok(
  !inventory.some(file => file.includes(BACKSLASH)),
  'inventory paths must use forward slashes',
)

const sourceFindings = findSensitiveFiles(inventory)
assert.deepEqual(
  sourceFindings.map(entry => entry.file).sort(),
  ['.env.local', 'deploy.pem'],
  'source inventory must flag exactly the shippable secrets',
)

fs.rmSync(fixture, { recursive: true, force: true })

console.log('Sensitive-file policy tests passed (13 blocked, 4 allowed, and the source inventory).')
