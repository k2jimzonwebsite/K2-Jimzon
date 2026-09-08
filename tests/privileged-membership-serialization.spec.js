import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

/**
 * MAP-028 H-014. The final-Admin invariant is a property of the Admin *set*, so
 * a per-row lock cannot hold it. Every path that changes privileged membership
 * must take the same transaction-scoped guard before it counts.
 *
 * The behavioural proof is `npm run rehearse:final-admin`, which reproduces the
 * lost invariant and then shows it held. This contract stops a later edit from
 * quietly dropping the guard from one path.
 */

const migration = () => readFile(
  new URL('../supabase/migrations/20260905_privileged_membership_serialization.sql', import.meta.url), 'utf8',
)

test('the guard exists, is private, and is transaction scoped', async () => {
  const sql = await migration()
  expect(sql).toContain('create or replace function k2_private.lock_privileged_membership()')
  expect(sql).toContain('pg_catalog.pg_advisory_xact_lock(4823, 1)')
  expect(sql).toContain("set search_path = ''")
  expect(sql).toContain('revoke all on function k2_private.lock_privileged_membership() from public, anon, authenticated;')
})

test('every membership-changing path takes the guard before counting Admins', async () => {
  const sql = await migration()

  // Both rebuilt functions must call it, and each call must precede that
  // function's Admin count.
  for (const [name, marker] of [
    ['set_user_role', 'create or replace function public.set_user_role('],
    ['staff access command', 'create or replace function public.execute_admin_staff_access_command_v1('],
  ]) {
    const start = sql.indexOf(marker)
    expect(start, `${name} is rebuilt in this migration`).toBeGreaterThan(-1)
    const body = sql.slice(start, sql.indexOf('$$;', start))
    const lockAt = body.indexOf('lock_privileged_membership()')
    // Specifically the Admin-set count. The staff command also counts command
    // receipts for its rate limit, and that count legitimately precedes the lock.
    const countAt = body.indexOf('v_admin_count from public.user_profiles')
    expect(lockAt, `${name} takes the guard`).toBeGreaterThan(-1)
    expect(countAt, `${name} counts Admins`).toBeGreaterThan(-1)
    expect(lockAt, `${name} locks before counting`).toBeLessThan(countAt)
  }
})

test('the rebuilt staff command keeps its existing boundary behaviour', async () => {
  const sql = await migration()
  for (const marker of [
    'K2_ADMIN_REQUIRED', 'K2_ADMIN_REQUEST_REPLAYED', 'K2_ADMIN_IDEMPOTENCY_CONFLICT',
    'K2_ADMIN_COMMAND_IN_PROGRESS', 'K2_ADMIN_RATE_LIMITED', 'K2_ADMIN_FINAL_ADMIN',
    'k2_private.staff_access_events', 'admin_command_receipts',
  ]) {
    expect(sql, `${marker} is preserved`).toContain(marker)
  }
  // No new writable role source was introduced.
  expect(sql).not.toContain('create table')
})

test('the concurrency rehearsal is registered and reproduces before it proves', async () => {
  const [pkg, runner] = await Promise.all([
    readFile(new URL('../package.json', import.meta.url), 'utf8'),
    readFile(new URL('../scripts/rehearse-final-admin-concurrency.mjs', import.meta.url), 'utf8'),
  ])
  expect(pkg).toContain('rehearse:final-admin')
  expect(runner).toContain('DEFECT_NOT_REPRODUCED')
  expect(runner).toContain('RECOVERY_INVARIANT_BROKEN')
  expect(runner).toContain('EXPECTED_ONE_CLEAR_REFUSAL')
  expect(runner).toContain('PARTIAL_STATE_COMMITTED')
})
