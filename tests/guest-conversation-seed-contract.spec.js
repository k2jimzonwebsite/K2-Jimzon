import { test, expect } from '@playwright/test'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { generateGuestSeedRecovery } from '../scripts/guest-seed-recovery.mjs'

test('guest seed recovery cannot be generated without exact complete target captures', () => {
  expect(() => generateGuestSeedRecovery(null, null)).toThrow('GUEST_SEED_DATABASE_MISMATCH')
  expect(() => generateGuestSeedRecovery({ database: 'local', systemIdentifier: 'fixture', functions: [] }, { database: 'local', systemIdentifier: 'fixture', functions: [] }))
    .toThrow('GUEST_SEED_CAPTURE_REQUIRED')
})

const migration = 'supabase/migrations/20260912_guest_order_conversation_seed.sql'

async function migrationSources() {
  const dir = 'supabase/migrations'
  const files = await readdir(dir)
  const bodies = []
  for (const file of files.filter((name) => name.endsWith('.sql'))) {
    bodies.push(await readFile(path.join(dir, file), 'utf8'))
  }
  return bodies.join('\n')
}

test('order and pasabuy submissions seed the conversation instead of opening an empty thread', async () => {
  const sql = await readFile(migration, 'utf8')
  for (const key of ['guest-order-seed:', 'guest-pasabuy-seed:']) {
    expect(sql, `migration must seed with guarded key ${key}`).toContain(key)
  }
  // Replay safety has two independent layers: the existing idempotency
  // early-return runs before any seed, and the seed itself is guarded.
  for (const key of ['guest-order-seed:', 'guest-pasabuy-seed:']) {
    expect(sql.indexOf('IDEMPOTENCY_CONFLICT'), 'replay must return before seeding').toBeLessThan(sql.indexOf(key))
  }
  expect(sql).toMatch(/where not exists \(\s*select 1 from public\.messages/)
  // The seed raises the same unread + 4-hour response-due signal as the
  // contact path, never a success or speed promise.
  expect(sql).toMatch(/unread_count = 1/)
  expect(sql).toMatch(/response_due_at = now\(\) \+ interval '4 hours'/)
})

test('seeded columns exist in the canonical table definitions', async () => {
  const schema = await migrationSources()
  for (const column of ['unread_count', 'last_inbound_at', 'response_due_at', 'last_message_at']) {
    expect(schema, `conversations must define ${column}`).toMatch(new RegExp(`${column}[^,)]*`))
  }
  for (const column of ['sender_type', 'provider_event_key', 'direction', 'delivery_status', 'is_draft']) {
    expect(schema, `messages must define ${column}`).toMatch(new RegExp(`${column}[^,)]*`))
  }
})

test('seeded copy states the reference and next step without promising speed', async () => {
  const sql = await readFile(migration, 'utf8')
  expect(sql).toContain('Staff review stock, delivery charge and total, then reply here.')
  expect(sql).toContain('Staff research availability in Italy and reply here with a quote.')
  const copies = sql.match(/'((?:[^']|'')*reply here(?:[^']|'')*)'/g) || []
  expect(copies.length).toBeGreaterThan(0)
  for (const copy of copies) {
    expect(copy, 'seeded copy must not promise a response time').not.toMatch(/hour|minute|day|quickly|soon|24\/7/i)
  }
})

test('the seeding migration preserves the anonymous submission grants', async () => {
  const sql = await readFile(migration, 'utf8')
  // create or replace keeps ACLs; no grant statement may narrow or widen them.
  expect(sql).not.toMatch(/revoke|grant execute/i)
})

test('seed recovery refuses a broad replay of the older security boundary', async () => {
  const sql = await readFile('supabase/guest_order_conversation_seed_rollback.sql', 'utf8')
  expect(sql).toContain('\\set ON_ERROR_STOP on')
  expect(sql).toContain("raise exception 'K2_GUEST_SEED_CAPTURED_RECOVERY_REQUIRED'")
  expect(sql).not.toMatch(/^\\ir\s/m)
})
