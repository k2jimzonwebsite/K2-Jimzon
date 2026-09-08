import { expect, test } from '@playwright/test'
import { INBOX_READ_LIMITS, readAdminInbox } from '../server/admin-bff/inbox.js'

/**
 * MAP-028 H-007. The secure Inbox read is bounded, and it must stay bounded.
 * What it may not do is present a truncated projection as if it were the whole
 * record: staff need to know that older conversations exist beyond this page and
 * that a long thread is showing a sample rather than its full history.
 */

function fakeClient({ conversations, messages, staff = [], websiteReply = true }) {
  const calls = { conversationLimit: null, messageLimit: null }
  const table = (rows, sink) => {
    const builder = {
      select: () => builder,
      in: () => builder,
      order: () => builder,
      limit: (value) => {
        if (sink) calls[sink] = value
        return Promise.resolve({ data: rows.slice(0, value), error: null })
      },
      then: (resolve) => resolve({ data: rows, error: null }),
    }
    return builder
  }
  return {
    calls,
    from(name) {
      if (name === 'conversations') return table(conversations, 'conversationLimit')
      if (name === 'messages') return table(messages, 'messageLimit')
      return table(staff)
    },
    rpc: async () => ({ data: websiteReply, error: null }),
  }
}

function conversationRows(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `c-${index}`,
    customer_name: `Customer ${index}`,
    platform: 'Website',
    status: 'Open',
    priority: 'normal',
    unread_count: 0,
    last_message_at: new Date(Date.now() - index * 60_000).toISOString(),
  }))
}

function messageRows(conversationId, count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${conversationId}-m-${index}`,
    conversation_id: conversationId,
    sender_type: 'Customer',
    content: `message ${index}`,
    created_at: new Date(Date.now() - index * 1_000).toISOString(),
  }))
}

test('the read declares its own bounds', () => {
  expect(INBOX_READ_LIMITS.conversations).toBeGreaterThan(0)
  expect(INBOX_READ_LIMITS.messages).toBeGreaterThan(0)
  expect(INBOX_READ_LIMITS.messagesPerConversation).toBeGreaterThan(0)
  expect(INBOX_READ_LIMITS.messagesPerConversation).toBeLessThan(INBOX_READ_LIMITS.messages)
})

test('a full page of conversations is reported as possibly incomplete', async () => {
  const limit = INBOX_READ_LIMITS.conversations
  const result = await readAdminInbox(fakeClient({
    conversations: conversationRows(limit),
    messages: [],
  }))

  expect(result.conversations).toHaveLength(limit)
  expect(result.completeness.conversations).toEqual({
    returned: limit, limit, truncated: true,
  })
})

test('a short page is reported as complete, not merely unlabelled', async () => {
  const result = await readAdminInbox(fakeClient({
    conversations: conversationRows(3),
    messages: messageRows('c-0', 2),
  }))

  expect(result.completeness.conversations.truncated).toBe(false)
  expect(result.completeness.messages.truncated).toBe(false)
})

test('one busy thread cannot spend the message allowance of every other thread', async () => {
  const perConversation = INBOX_READ_LIMITS.messagesPerConversation
  const result = await readAdminInbox(fakeClient({
    conversations: conversationRows(3),
    messages: [
      ...messageRows('c-0', perConversation + 25),
      ...messageRows('c-1', 2),
      ...messageRows('c-2', 1),
    ],
  }))

  const [busy, quiet, quieter] = result.conversations
  expect(busy.messages).toHaveLength(perConversation)
  expect(busy.messagesTruncated).toBe(true)
  // The quiet threads keep every message they have.
  expect(quiet.messages).toHaveLength(2)
  expect(quiet.messagesTruncated).toBe(false)
  expect(quieter.messages).toHaveLength(1)
})

test('the newest messages are the ones kept when a thread is sampled', async () => {
  const perConversation = INBOX_READ_LIMITS.messagesPerConversation
  const rows = messageRows('c-0', perConversation + 10)
  const result = await readAdminInbox(fakeClient({
    conversations: conversationRows(1),
    messages: rows,
  }))

  const kept = new Set(result.conversations[0].messages.map((message) => message.id))
  expect(kept.has('c-0-m-0')).toBe(true) // newest
  expect(kept.has(`c-0-m-${perConversation + 9}`)).toBe(false) // oldest
})

test('the message read stays bounded — the fix is labelling, not unbounded fetching', async () => {
  const client = fakeClient({ conversations: conversationRows(5), messages: messageRows('c-0', 10) })
  await readAdminInbox(client)

  expect(client.calls.conversationLimit).toBe(INBOX_READ_LIMITS.conversations)
  expect(client.calls.messageLimit).toBe(INBOX_READ_LIMITS.messages)
})

test('the client carries and shows the bounded-sample labels', async () => {
  const { readFile } = await import('node:fs/promises')
  const normalization = await readFile(new URL('../src/lib/adminInboxNormalization.js', import.meta.url), 'utf8')
  const runtime = await readFile(new URL('../src/context/useAdminInboxRuntime.js', import.meta.url), 'utf8')
  const view = await readFile(new URL('../src/views/admin/Inbox.jsx', import.meta.url), 'utf8')

  expect(normalization).toContain('messagesTruncated')
  expect(runtime).toContain('completeness')
  // Staff must be told, not just the payload.
  expect(view).toContain('messagesTruncated')
  expect(view).toContain('older messages')
  expect(view).toContain('queueTruncated')
})
