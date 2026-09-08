import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { normalizeAdminConversation } from '../src/lib/adminInboxNormalization.js'

test('drafts remain bound to the customer when switching channels', async ({ page }) => {
  await page.goto('/tests/fixtures/inbox-harness.html')
  await page.getByLabel('Internal note or response draft').fill('Maria private draft')
  await page.getByRole('button', { name: /Elena Website/i }).click()
  await expect(page.getByLabel('Customer-visible website reply')).toHaveValue('')
  await page.getByLabel('Customer-visible website reply').fill('Elena reply')
  await page.getByRole('button', { name: /Maria Santos/i }).click()
  await expect(page.getByLabel('Internal note or response draft')).toHaveValue('Maria private draft')
})

test('pending note save preserves edits made after submission', async ({ page }) => {
  await page.goto('/tests/fixtures/inbox-harness.html?delaySave=1')
  const draft = page.getByLabel('Internal note or response draft')
  await draft.fill('Submitted note')
  await page.getByRole('button', { name: 'Save internal note', exact: true }).click()
  await draft.fill('New unsent note')
  await expect(page.getByText('Internal note saved. It was not sent externally.')).toBeVisible()
  await expect(draft).toHaveValue('New unsent note')
})

test('late note completion cannot clear another customer draft or show its success there', async ({ page }) => {
  await page.goto('/tests/fixtures/inbox-harness.html?delaySave=1')
  await page.getByLabel('Internal note or response draft').fill('Submitted Maria note')
  await page.getByRole('button', { name: 'Save internal note', exact: true }).click()
  await page.getByRole('button', { name: /Elena Website/i }).click()
  await page.getByLabel('Customer-visible website reply').fill('Elena unsent reply')
  await expect(page.getByRole('button', { name: /Maria Santos/i })).toContainText('Submitted Maria note')
  await expect(page.getByLabel('Customer-visible website reply')).toHaveValue('Elena unsent reply')
  await expect(page.getByText('Internal note saved. It was not sent externally.')).toHaveCount(0)
  await page.getByRole('button', { name: /Maria Santos/i }).click()
  await expect(page.getByLabel('Internal note or response draft')).toHaveValue('')
})

test('workflow reason retains keyboard focus through multiple characters', async ({ page }) => {
  await page.goto('/tests/fixtures/inbox-harness.html')
  const workflow = page.getByRole('complementary', { name: 'Conversation workflow' })
  await workflow.getByLabel('Status').selectOption('Resolved')
  const reason = workflow.getByLabel('Reason (required)')
  await reason.pressSequentially('Verified through the approved channel')
  await expect(reason).toHaveValue('Verified through the approved channel')
  await expect(reason).toBeFocused()
})

test('staff switching discards the prior actor draft and late notice', async ({ page }) => {
  await page.goto('/tests/fixtures/inbox-harness.html?delaySave=1&switchActor=1')
  const draft = page.getByLabel('Internal note or response draft')
  await draft.fill('Old staff submitted note')
  await page.getByRole('button', { name: 'Save internal note', exact: true }).click()
  await draft.fill('Old staff private unsent text')
  await page.getByRole('button', { name: 'Switch fixture staff' }).click()
  await expect(draft).toHaveValue('')
  await expect(page.getByRole('button', { name: /Maria Santos/i })).toContainText('Old staff submitted note')
  await expect(draft).toHaveValue('')
  await expect(page.getByText('Internal note saved. It was not sent externally.')).toHaveCount(0)
})

for (const returnToMaria of [false, true]) {
  test(`delayed history cannot replace the current ${returnToMaria ? 'return visit' : 'customer'}`, async ({ page }) => {
    await page.goto('/tests/fixtures/inbox-harness.html?delayHistory=1')
    // The same timeline renders in the desktop aside and the phone disclosure,
    // so these assertions name the one this viewport actually shows.
    const timeline = page.getByRole('complementary', { name: 'Conversation workflow' })
    await page.getByRole('button', { name: /Elena Website/i }).click()
    await expect(timeline.getByText('Elena history', { exact: true })).toBeVisible()
    if (returnToMaria) {
      await page.getByRole('button', { name: /Maria Santos/i }).click()
      await expect(timeline.getByText('Latest Maria history', { exact: true })).toBeVisible()
    }
    await page.getByRole('button', { name: 'Release old history' }).click()
    await expect(page.getByRole('button', { name: 'Old history released' })).toBeVisible()
    await expect(timeline.getByText(returnToMaria ? 'Latest Maria history' : 'Elena history', { exact: true })).toBeVisible()
    await expect(page.getByText('Older Maria history', { exact: true })).toHaveCount(0)
  })
}

test('delayed website reply preserves newer text', async ({ page }) => {
  await page.goto('/tests/fixtures/inbox-harness.html?delaySave=1')
  await page.getByRole('button', { name: /Elena Website/i }).click()
  const draft = page.getByLabel('Customer-visible website reply')
  await draft.fill('Submitted website reply')
  await page.getByRole('button', { name: 'Send to website customer' }).click()
  await draft.fill('New website reply')
  await expect(page.getByText('Sent. The reply is now visible in the customer’s website chat.')).toBeVisible()
  await expect(draft).toHaveValue('New website reply')
})

test('phone navigation preserves each customer draft', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/tests/fixtures/inbox-harness.html')
  await page.getByRole('button', { name: /Maria Santos/i }).click()
  await page.getByLabel('Internal note or response draft').fill('Phone Maria draft')
  await page.getByRole('button', { name: 'Back to conversation list' }).click()
  await page.getByRole('button', { name: /Elena Website/i }).click()
  await expect(page.getByLabel('Customer-visible website reply')).toHaveValue('')
  await page.getByLabel('Customer-visible website reply').fill('Phone Elena draft')
  await page.getByRole('button', { name: 'Back to conversation list' }).click()
  await page.getByRole('button', { name: /Maria Santos/i }).click()
  await expect(page.getByLabel('Internal note or response draft')).toHaveValue('Phone Maria draft')
})

test.describe('Phase 2 unified inbox contract', () => {
  test('migration models workflow, delivery truth, and immutable events', async () => {
    const sql = await readFile(new URL('../supabase/migrations/20260803_phase_2_unified_inbox.sql', import.meta.url), 'utf8')

    for (const column of ['assigned_to', 'priority', 'unread_count', 'response_due_at', 'resolved_at']) {
      expect(sql).toContain(`add column if not exists ${column}`)
    }
    expect(sql).toContain('create table if not exists public.conversation_events')
    expect(sql).toContain('create or replace function public.mark_conversation_read')
    expect(sql).toContain('create or replace function public.update_conversation_workflow')
    expect(sql).toContain('create or replace function public.route_pasabuy_request_to_inbox')
    expect(sql).toContain('create trigger pasabuy_request_inbox_route')
    expect(sql).toContain("'pasabuy_request'")
    expect(sql).toContain("'internal_only', auth.uid()")
    expect(sql).toContain("raise exception 'Conversation event history is append-only'")
    expect(sql).toContain('grant select on public.conversation_events to authenticated')
    expect(sql).not.toContain('grant insert on public.conversation_events')
    expect(sql).not.toMatch(/,\s*;/)
  })

  test('admin inbox runtime normalizes snake_case and camelCase unread state independently from status', async () => {
    const source = await readFile(new URL('../src/context/useAdminInboxRuntime.js', import.meta.url), 'utf8')

    expect(source).toContain("supabase.rpc('mark_conversation_read'")
    expect(source).toContain("supabase.rpc('update_conversation_workflow'")
    expect(source).not.toContain("unread: c.status === 'Open'")
    expect(source).not.toContain('INITIAL_CONVERSATIONS')

    const normalize = (value) => {
      const normalized = normalizeAdminConversation(value)
      return { unreadCount: normalized.unreadCount, unread: normalized.unread, status: normalized.status }
    }

    // Direct Supabase snake_case records
    expect(normalize({ unread_count: 5, status: 'Open' })).toEqual({ unreadCount: 5, unread: true, status: 'Open' })
    expect(normalize({ unread_count: 0, status: 'Open' })).toEqual({ unreadCount: 0, unread: false, status: 'Open' })
    expect(normalize({ unread_count: 2, status: 'Resolved' })).toEqual({ unreadCount: 2, unread: true, status: 'Resolved' })

    // BFF API camelCase records
    expect(normalize({ unreadCount: 3, status: 'Open' })).toEqual({ unreadCount: 3, unread: true, status: 'Open' })
    expect(normalize({ unreadCount: 0, status: 'Open' })).toEqual({ unreadCount: 0, unread: false, status: 'Open' })
    expect(normalize({ unreadCount: 1, status: 'Closed' })).toEqual({ unreadCount: 1, unread: true, status: 'Closed' })

    // Missing / null count fallback
    expect(normalize({ status: 'Open' })).toEqual({ unreadCount: 0, unread: false, status: 'Open' })
    expect(normalize({ unread_count: null, status: 'Open' })).toEqual({ unreadCount: 0, unread: false, status: 'Open' })
    expect(normalize({ unread_count: 'not-a-number', status: 'Resolved' })).toEqual({ unreadCount: 0, unread: false, status: 'Resolved' })
    expect(normalize({ unreadCount: -4, status: 'Closed' })).toEqual({ unreadCount: 0, unread: false, status: 'Closed' })

    expect(normalizeAdminConversation({
      customerName: 'Website customer', platform: 'Virtual Store', sourceKind: 'virtual_store_message',
    }).sourceKind).toBe('virtual_store_message')
    expect(normalizeAdminConversation({
      customer_name: 'Website customer', platform: 'Website', source_kind: 'website_message',
    }).sourceKind).toBe('website_message')
  })

  test('admin inbox labels internal notes and disconnected delivery truthfully', async () => {
    const source = await readFile(new URL('../src/views/admin/Inbox.jsx', import.meta.url), 'utf8')

    expect(source).toContain('external sending is not connected')
    expect(source).toContain('Internal only, not sent')
    expect(source).toContain('Copy for external reply')
    expect(source).toContain('Save workflow')
    expect(source).toContain('Response deadline')
    expect(source).toContain('min-h-11')
    expect(source).toContain('focus-visible:ring-2')
  })
})

test.describe('Phase 2 inbox interactions', () => {
  test('desktop queue saves internal notes and controlled workflow changes', async ({ page }) => {
    await page.goto('/tests/fixtures/inbox-harness.html')

    await expect(page.getByRole('heading', { name: 'Unified message control' })).toBeVisible()
    await expect(page.getByText('Maria Santos').first()).toBeVisible()
    await expect(page.getByText(/overdue$/).first()).toBeVisible()
    await expect(page.getByText(/external sending is not connected/i)).toBeVisible()

    const note = page.getByLabel('Internal note or response draft')
    await note.fill('Staff verified the request details; external response still pending.')
    await page.getByRole('button', { name: 'Save internal note' }).click()
    await expect(page.getByText('Internal note saved. It was not sent externally.')).toBeVisible()
    await expect(page.getByText('Staff verified the request details; external response still pending.').last()).toBeVisible()
    await expect(page.getByText('Internal only, not sent').last()).toBeVisible()

    const workflow = page.getByRole('complementary', { name: 'Conversation workflow' })
    await workflow.getByLabel('Status').selectOption('Resolved')
    await workflow.getByLabel('Reason (required)').fill('Customer question was completed through the verified channel.')
    await workflow.getByRole('button', { name: 'Save workflow' }).click()
    await expect(page.getByText('Workflow updated and added to the immutable event history.')).toBeVisible()
    const chatHeader = page.getByRole('heading', { name: 'Maria Santos' }).locator('..')
    await expect(chatHeader.getByText('Resolved', { exact: true })).toBeVisible()
  })

  test('mobile queue opens one conversation at a time with a usable back action', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/tests/fixtures/inbox-harness.html')

    await expect(page.getByLabel('Search conversations')).toBeVisible()
    await page.getByRole('button', { name: /Maria Santos/i }).click()
    await expect(page.getByRole('button', { name: 'Back to conversation list' })).toBeVisible()
    await expect(page.getByLabel('Internal note or response draft')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save internal note' })).toBeVisible()
    await page.getByRole('button', { name: 'Back to conversation list' }).click()
    await expect(page.getByLabel('Search conversations')).toBeVisible()

    await page.setViewportSize({ width: 844, height: 390 })
    await expect(page.getByLabel('Search conversations')).toBeVisible()
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    expect(hasHorizontalOverflow).toBe(false)
  })

  test('virtual-store website chat is unmistakable and sends a customer-visible reply', async ({ page }) => {
    await page.goto('/tests/fixtures/inbox-harness.html')

    await page.getByRole('button', { name: /Elena Website/i }).click()
    await expect(page.getByText('LIVE WEBSITE CHAT · VIRTUAL STORE')).toBeVisible()
    await expect(page.getByText('Replies appear in the customer’s website chat')).toBeVisible()

    const reply = page.getByLabel('Customer-visible website reply')
    await reply.fill('The coffee shelf includes whole beans and ground options. Which brewer do you use?')
    await page.getByRole('button', { name: 'Send to website customer' }).click()

    await expect(page.getByText('Sent. The reply is now visible in the customer’s website chat.')).toBeVisible()
    await expect(page.locator('p.whitespace-pre-wrap').filter({ hasText: 'The coffee shelf includes whole beans and ground options. Which brewer do you use?' })).toBeVisible()
    await expect(page.getByText('Visible in website chat')).toBeVisible()
  })
})

test.describe('Inbox polling ownership and canonical unread', () => {
  test('background polling yields to hidden tabs, in-flight reads, and disabled sessions', async () => {
    const { shouldStartPoll } = await import('../src/context/adminInboxPolling.js')

    expect(shouldStartPoll({ enabled: true, hidden: false, inFlight: false })).toBe(true)
    expect(shouldStartPoll({ enabled: true, hidden: true, inFlight: false })).toBe(false)
    expect(shouldStartPoll({ enabled: true, hidden: false, inFlight: true })).toBe(false)
    expect(shouldStartPoll({ enabled: false, hidden: false, inFlight: false })).toBe(false)
  })

  test('a superseded read response can never repopulate the queue', async () => {
    const { isCurrentGeneration } = await import('../src/context/adminInboxPolling.js')

    expect(isCurrentGeneration(4, 4)).toBe(true)
    expect(isCurrentGeneration(3, 4)).toBe(false)
    expect(isCurrentGeneration(5, 4)).toBe(false)
  })

  test('a failed background poll keeps the loaded queue and marks it stale', async () => {
    const { resolveRefreshFailure, STALE_QUEUE_NOTICE } = await import('../src/context/adminInboxPolling.js')

    expect(resolveRefreshFailure({ background: true, hasExistingQueue: true, error: 'Inbox is unavailable.' }))
      .toEqual({ keepQueue: true, stale: true, error: STALE_QUEUE_NOTICE })
    expect(resolveRefreshFailure({ background: true, hasExistingQueue: false, error: 'Inbox is unavailable.' }))
      .toEqual({ keepQueue: false, stale: false, error: 'Inbox is unavailable.' })
    expect(resolveRefreshFailure({ background: false, hasExistingQueue: true, error: 'Inbox is unavailable.' }))
      .toEqual({ keepQueue: false, stale: false, error: 'Inbox is unavailable.' })
  })

  test('a replayed read receipt cannot clear a message that arrived after it', async () => {
    const { applyReadReceipt } = await import('../src/context/adminInboxPolling.js')

    const readAt = '2026-09-05T02:00:00.000Z'
    const older = { id: 'c1', unread: true, unreadCount: 2, lastInboundAt: '2026-09-05T01:59:00.000Z' }
    const newer = { id: 'c2', unread: true, unreadCount: 1, lastInboundAt: '2026-09-05T02:00:30.000Z' }

    expect(applyReadReceipt(older, readAt)).toEqual({
      id: 'c1', unread: false, unreadCount: 0, lastInboundAt: '2026-09-05T01:59:00.000Z', lastReadAt: readAt,
    })
    expect(applyReadReceipt(newer, readAt)).toEqual(newer)
    expect(applyReadReceipt({ id: 'c3', unread: true, unreadCount: 1, lastInboundAt: null }, readAt).unread).toBe(false)
  })

  test('the Inbox tells staff when the visible queue is stale rather than live', async ({ page }) => {
    await page.goto('/tests/fixtures/inbox-harness.html?staleQueue=1')
    await expect(page.getByRole('status').filter({ hasText: /Live updates paused/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Maria Santos/i })).toBeVisible()
  })

  test('the inbox runtime owns its polling instead of resetting the queue every interval', async () => {
    const source = await readFile(new URL('../src/context/useAdminInboxRuntime.js', import.meta.url), 'utf8')

    expect(source).toContain("from './adminInboxPolling'")
    expect(source).toContain('shouldStartPoll')
    expect(source).toContain('resolveRefreshFailure')
    expect(source).toContain('applyReadReceipt')
    expect(source).toContain('AbortController')
    expect(source).toContain('visibilitychange')
    expect(source).not.toContain('window.setInterval(fetchConversations, 8_000)')
  })
})

test.describe('Inbox event history parity and failure states', () => {
  test('a failed history read is distinguishable from an empty one and can be retried', async ({ page }) => {
    await page.goto('/tests/fixtures/inbox-harness.html?historyError=1')
    const aside = page.getByRole('complementary', { name: 'Conversation workflow' })
    await expect(aside.getByText('Event history could not be loaded.')).toBeVisible()
    await expect(aside.getByText('No Phase 2 workflow events recorded yet.')).toHaveCount(0)
    await aside.getByRole('button', { name: 'Retry event history' }).click()
    await expect(aside.getByText('Recovered Maria history', { exact: true })).toBeVisible()
    await expect(aside.getByText('Event history could not be loaded.')).toHaveCount(0)
  })

  test('event history is reachable on a phone, not only on wide desktops', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/tests/fixtures/inbox-harness.html?history=1')
    await page.getByRole('button', { name: /Maria Santos/i }).click()
    const disclosure = page.locator('details').filter({ has: page.getByText('Event history', { exact: true }) })
    await expect(disclosure).toBeVisible()
    await disclosure.getByText('Event history', { exact: true }).click()
    await expect(disclosure.getByText('Latest Maria history', { exact: true })).toBeVisible()
  })

  test('the runtime reports a failed history read instead of an empty timeline', async () => {
    const source = await readFile(new URL('../src/context/useAdminInboxRuntime.js', import.meta.url), 'utf8')
    expect(source).toContain('return { ok: result.ok, events: result.ok ? result.events : [] }')
    expect(source).not.toContain('return result.ok ? result.events : []')
  })
})

test.describe('Inbox ambiguous command reconciliation', () => {
  test('an unconfirmed command is shown as unknown, not as a clean failure', async ({ page }) => {
    await page.goto('/tests/fixtures/inbox-harness.html?uncertainSave=1')
    await page.getByLabel('Internal note or response draft').fill('Note with a lost response')
    await page.getByRole('button', { name: 'Save internal note', exact: true }).click()
    const warning = page.getByRole('alert').filter({ hasText: /did not confirm/i })
    await expect(warning).toBeVisible()
    await expect(page.getByText('The internal note could not be saved.')).toHaveCount(0)
    await expect(page.getByText('Internal note saved. It was not sent externally.')).toHaveCount(0)
    // The unsent text is preserved so staff can reconcile before resending it.
    await expect(page.getByLabel('Internal note or response draft')).toHaveValue('Note with a lost response')
  })

  test('the runtime distinguishes an unconfirmed command from a rejected one', async () => {
    const source = await readFile(new URL('../src/context/useAdminInboxRuntime.js', import.meta.url), 'utf8')
    expect(source).toContain('commandOutcomeIsUncertain')
    expect(source).toContain('uncertain: true')
  })

  test('leaving the page with an unresolved command is guarded, because a reload discards its identity', async () => {
    const source = await readFile(new URL('../src/context/useAdminInboxRuntime.js', import.meta.url), 'utf8')
    expect(source).toContain("window.addEventListener('beforeunload', warnOnUnresolved)")
    expect(source).toContain('session.unresolvedCount() === 0')
    expect(source).toContain("window.removeEventListener('beforeunload', warnOnUnresolved)")
  })
})
