import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const migrationPath = 'supabase/migrations/20260916_order_and_pasabuy_conversation_seed.sql'
const rollbackPath = 'supabase/migrations/20260916_order_and_pasabuy_conversation_seed_rollback.sql'

test('migration seeds initial support conversation and message for orders and pasabuy requests', async () => {
  const sql = await readFile(migrationPath, 'utf8')

  // Both functions are updated
  expect(sql).toContain('create or replace function public.submit_order_request_v2')
  expect(sql).toContain('create or replace function public.submit_pasabuy_request')

  // Both seed conversations with unread_count and 4-hour SLA
  expect(sql).toContain("'order_request'")
  expect(sql).toContain("'pasabuy_request'")
  expect(sql).toContain("'Website'")
  expect(sql).toContain("'Pasabuy'")
  expect(sql).toContain("'Open'")
  expect(sql).toContain("'normal'")
  expect(sql).toContain('unread_count = 1')
  expect(sql).toContain("response_due_at = now() + interval '4 hours'")

  // Idempotency early-return happens before seeding in submit_order_request_v2
  const orderIdempotencyIdx = sql.indexOf('if found then')
  const orderSeedIdx = sql.indexOf("'order_request'")
  expect(orderIdempotencyIdx).toBeGreaterThan(0)
  expect(orderIdempotencyIdx).toBeLessThan(orderSeedIdx)

  // Message insertion is guarded against double execution
  expect(sql).toContain('guest-order-seed:')
  expect(sql).toContain('guest-pasabuy-seed:')
  expect(sql).toMatch(/where not exists \(\s*select 1 from public\.messages/i)

  // Revokes default public execution grant to comply with security surface audit
  expect(sql).toContain('revoke all on function public.submit_order_request_v2')
})

test('seeded copy contains clear staff instructions without promising response time', async () => {
  const sql = await readFile(migrationPath, 'utf8')

  // Order seed copy
  expect(sql).toContain('Staff review stock, delivery charge and total, then reply here.')
  expect(sql).toContain('This message was recorded automatically when the order was placed.')

  // Pasabuy seed copy
  expect(sql).toContain('Staff research availability in Italy and reply here with a quote.')
  expect(sql).toContain('This message was recorded automatically when the request was submitted.')

  // No promise of fast speed or exact duration
  const orderCopyMatch = sql.match(/'Order ' \|\| v_order\.public_reference[^;]+;/)?.[0] || ''
  expect(orderCopyMatch).not.toMatch(/immediately|quickly|guaranteed|within 1 hour|within 10 minutes/i)
})

test('rollback restores functions without inline conversation seeding', async () => {
  const rollbackSql = await readFile(rollbackPath, 'utf8')

  expect(rollbackSql).toContain('create or replace function public.submit_order_request_v2')
  expect(rollbackSql).toContain('create or replace function public.submit_pasabuy_request')

  // Rollback does not perform conversation insertion
  expect(rollbackSql).not.toContain('insert into public.conversations')
  expect(rollbackSql).not.toContain('insert into public.messages')
})
