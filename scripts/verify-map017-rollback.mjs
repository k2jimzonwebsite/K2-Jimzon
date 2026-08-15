import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rollbackSql = readFileSync(
  path.join(rootDir, 'supabase', 'map017_public_write_boundary_rollback.sql'),
  'utf8',
)
const executableSql = rollbackSql
  .replace(/--.*$/gm, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')

assert.match(executableSql, /MAP017_ROLLBACK_NOT_IMPLEMENTED/)
assert.match(executableSql, /raise\s+exception/i)
assert.doesNotMatch(executableSql, /grant\s+(all|insert|update|delete)[\s\S]+\b(public|anon)\b/i)
assert.doesNotMatch(executableSql, /create\s+policy[\s\S]+using\s*\(\s*true\s*\)/i)
assert.doesNotMatch(executableSql, /\bcascade\b/i)
assert.doesNotMatch(executableSql, /drop\s+(table|schema)/i)
assert.doesNotMatch(executableSql, /\btruncate\b/i)

console.log('MAP-017 rollback refusal guard passed; a real captured-baseline inverse migration remains required.')
