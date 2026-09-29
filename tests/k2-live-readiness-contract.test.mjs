import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const scriptPath = path.join(root, 'scripts', 'k2-live-readiness.mjs')
const source = fs.readFileSync(scriptPath, 'utf8')

// This gate is the one script allowed to read live production SQL on demand.
// Its safety is entirely in the source, so the source is what gets asserted:
// every statement must be a SELECT, the guard must exist, and the request must
// stay read_only. A future edit that smuggles in a write fails here rather than
// against K2.

const WRITE_VERB = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|vacuum|analyze)\b/i

test('the gate keeps the read-only guard in front of every query', () => {
  assert.match(source, /function assertReadOnly\(sql\)/)
  assert.match(source, /must begin with SELECT/)
  assert.match(source, /contains a write verb/)
  assert.match(source, /assertReadOnly\(sql\)\s*\n/)
})

test('the production query is declared read_only', () => {
  assert.match(source, /read_only:\s*true/)
})

test('every SQL template literal is a SELECT with no write verb', () => {
  // Only literals that carry SQL shape. The guard's own refusal message also
  // mentions SELECT, so key off a FROM clause instead of the keyword.
  const templates = (source.match(/`[^`]*\bselect\b[^`]*`/gi) ?? [])
    .filter((literal) => /\bfrom\b/i.test(literal))
  // Floor at the four known reads (ledger, absent tables, grants, facts) so an
  // added read query does not fail here. The per-literal checks are the point.
  assert.ok(templates.length >= 4, `expected the gate's read queries, found ${templates.length}`)
  for (const sql of templates) {
    const stripped = sql.replace(/\$\{[^}]*\}/g, '?').replace(/--[^\n]*/g, '')
    assert.match(stripped.trim(), /^`?\s*select\b/i, `not a SELECT: ${stripped.slice(0, 60)}`)
    const withoutStringLiterals = stripped.replace(/'[^']*'/g, "''")
    assert.doesNotMatch(withoutStringLiterals, WRITE_VERB, `write verb in: ${stripped.slice(0, 80)}`)
  }
})

test('the gate reports provider surfaces as blocked instead of assuming them', () => {
  assert.match(source, /'vercel-preview', 'connector', 'connector'/)
  assert.match(source, /'cloudflare-gate', 'connector', 'connector'/)
  assert.match(source, /proves preconditions only/)
})

test('the gate refuses to send a query before identity passes', () => {
  const identityIndex = source.indexOf('verifyK2SupabaseProject(')
  const firstQueryIndex = source.indexOf('await query(')
  assert.ok(identityIndex > 0 && firstQueryIndex > identityIndex)
})
