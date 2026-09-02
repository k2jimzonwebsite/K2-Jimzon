import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// MAP-023 / IDEA-20260902-04. OWNER-002 records the hold as starting "when the
// customer clicks purchase". These contracts pin the migration that finally
// makes that true, because the failure they prevent is silent: a submission
// that claims nothing looks identical to one that claims correctly, right up
// until two customers have paid for the same unit.

const MIGRATION = 'supabase/migrations/20260902_purchase_time_reservation.sql'

const migration = () => readFile(MIGRATION, 'utf8')

test('purchase takes the hold, rather than leaving it to staff confirmation', async () => {
  const sql = await migration()

  // The submission path must claim stock before it returns.
  expect(sql).toContain('perform public.reserve_order_request_lots_v1(v_order.id, \'purchase\')')
  // And confirmation must reuse the same claim instead of taking a second one.
  expect(sql).toContain('perform public.reserve_order_request_lots_v1(v_order.id, p_reason)')
})

test('the hold is idempotent, so no path can claim the same units twice', async () => {
  const sql = await migration()

  expect(sql).toContain("where order_request_id = v_order.id and status = 'active'")
  expect(sql).toMatch(/if v_existing > 0 then return 0; end if;/)
})

test('there is exactly one definition of what claiming stock means', async () => {
  const sql = await migration()

  // The FEFO selection is the rule that decides who gets the last unit. A second
  // copy is how the two callers drift apart and start overselling, so the
  // reservation loop must appear once, inside the shared function only.
  const fefoOccurrences = sql.split('order by coalesce(expiry_date, best_before_date), created_at').length - 1
  expect(fefoOccurrences).toBe(1)

  const reservationInserts = sql.split('insert into public.inventory_reservations').length - 1
  expect(reservationInserts).toBe(1)
})

test('an unfillable purchase aborts instead of recording an order nobody can fill', async () => {
  const sql = await migration()

  // The raise is inside the reservation function, which submit_order_request_v2
  // calls without trapping, so the whole submission transaction rolls back.
  expect(sql).toContain('Insufficient sellable lot stock')
  expect(sql).toContain("using errcode = 'K2STK'")
  expect(sql).not.toContain('exception when others')
})

test('the migration is additive and refuses to apply out of order', async () => {
  const sql = await migration()

  expect(sql).not.toMatch(/\bdrop table\b/i)
  expect(sql).not.toMatch(/\bdrop column\b/i)
  expect(sql).not.toMatch(/\btruncate\b/i)
  expect(sql).not.toMatch(/\bdelete from\b/i)

  // It depends on the expiry policy migration for hold_minutes/expires_at and
  // the deadline trigger, and says so rather than half-applying.
  expect(sql).toContain('20260902_reservation_expiry_policy.sql first')
  expect(sql).toContain("column_name = 'expires_at'")
  expect(sql).toContain('begin;')
  expect(sql).toContain('commit;')
})

test('the shared hold is not reachable by browser roles', async () => {
  const sql = await migration()

  expect(sql).toContain(
    'revoke all on function public.reserve_order_request_lots_v1(uuid,text) from public, anon, authenticated',
  )
})

test('replacing the order function does not reopen direct anonymous submission', async () => {
  const sql = await migration()

  // 20260812_guest_submission_cutover.sql revoked anon execute on
  // submit_order_request_v2 so every customer order goes through the signed
  // guest boundary. `create or replace function` preserves the ACL, so a grant
  // restated here would be a silent regression rather than a no-op — and the
  // first draft of this migration did exactly that, which the security surface
  // audit caught.
  expect(sql).not.toMatch(
    /grant\s+execute\s+on\s+function\s+public\.submit_order_request_v2[^;]*\banon\b/i,
  )
})

test('confirmation keeps the behavior that is not about stock', async () => {
  const sql = await migration()

  // Coupon redemption, the legacy orders row, the staff gate, and the status
  // transition are unchanged. Losing any of them silently would be worse than
  // the bug this migration fixes.
  expect(sql).toContain('if not public.is_staff() then raise exception \'Staff access required\'; end if;')
  expect(sql).toContain('update public.coupons set redemption_count = redemption_count + 1')
  expect(sql).toContain('insert into public.coupon_redemptions')
  expect(sql).toContain('insert into public.orders (')
  expect(sql).toContain("set status = 'confirmed', confirmed_by = auth.uid(), confirmed_at = now()")
})

test('the rehearsal that proves this exists and is wired to a command', async () => {
  const [runner, packageJson] = await Promise.all([
    readFile('scripts/rehearse-purchase-time-reservation.mjs', 'utf8'),
    readFile('package.json', 'utf8'),
  ])

  expect(JSON.parse(packageJson).scripts['rehearse:purchase-hold'])
    .toBe('node scripts/rehearse-purchase-time-reservation.mjs')

  // The rehearsal must actually race a second buyer and assert the loser leaves
  // nothing behind; a rehearsal that only submits once proves nothing.
  expect(runner).toContain('a second buyer for the last unit is refused at purchase')
  expect(runner).toContain('the refused purchase leaves no order behind')
  expect(runner).toContain('confirming a purchase-held order does not claim the units twice')
  expect(runner).toContain('an order created before the hold still reserves at confirm')
  expect(runner).toContain('the hold carries the OWNER-002 30-minute deadline')
})
