import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { normalizeAdminConversation } from '../src/lib/adminInboxNormalization.js'

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
})
