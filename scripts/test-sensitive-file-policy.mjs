import assert from 'node:assert/strict'
import { findSensitiveFiles, sensitiveFileReason } from './sensitive-file-policy.mjs'

const blocked = [
  '.env', '.env.production', 'config/.env.local', '.npmrc', 'auth.json',
  'credentials.json', 'service-account.json', 'private.pem', 'signing.key',
  'identity.p12', 'identity.pfx', 'production.dump', 'backup.sql.gz',
]

for (const file of blocked) {
  assert.notEqual(sensitiveFileReason(file), '', `${file} should be blocked`)
}

for (const file of ['.env.example', '_globe_resources/.env.example', 'docs/credentials.md', 'schema.sql']) {
  assert.equal(sensitiveFileReason(file), '', `${file} should be allowed`)
}

assert.equal(findSensitiveFiles(blocked).length, blocked.length)
console.log('Sensitive-file policy tests passed (13 blocked and 4 allowed fixtures).')

