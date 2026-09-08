import { expect, test } from '@playwright/test'
import * as service from '../src/services/adminBffService.js'

for (const kind of ['mark-read', 'workflow']) {
  test(`${kind} caller replays a lost response with the same operation identity`, async () => {
    const originalFetch = globalThis.fetch
    const originalDocument = globalThis.document
    globalThis.document = { cookie: '' }
    const requests = []
    globalThis.fetch = async (path, init) => {
      requests.push({ path, key: init.headers['X-K2-Idempotency-Key'], body: JSON.parse(init.body) })
      if (requests.length === 1) throw new TypeError('Fixture response lost after submission')
      return new Response('{"ok":true}')
    }
    const session = service.createInboxCommandSession()
    const conversationId = '11111111-1111-4111-8111-111111111111'
    const invoke = () => kind === 'mark-read'
      ? service.markConversationReadBff(conversationId, session)
      : service.updateConversationWorkflowBff({ conversationId, status: 'resolved', reason: 'Fixture review' }, session)
    try {
      expect((await invoke()).ok).toBe(false)
      expect(requests).toHaveLength(1)
      expect((await invoke()).ok).toBe(true)
      expect(requests[1]).toEqual(requests[0])
      expect((await invoke()).ok).toBe(true)
      expect(requests[2].key).not.toBe(requests[1].key)
      session.dispose()
      expect((await invoke()).ok).toBe(false)
      expect(requests).toHaveLength(3)
    } finally {
      session.dispose()
      globalThis.fetch = originalFetch
      if (originalDocument === undefined) delete globalThis.document
      else globalThis.document = originalDocument
    }
  })
}

test('workflow retries preserve separate payloads and concurrent calls share one request', async () => {
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  globalThis.document = { cookie: '' }
  const requests = []
  const finish = []
  globalThis.fetch = (_path, init) => {
    requests.push({ key: init.headers['X-K2-Idempotency-Key'], body: JSON.parse(init.body) })
    return new Promise(resolve => finish.push(resolve))
  }
  const session = service.createInboxCommandSession()
  const original = { conversationId: 'fixture', status: 'open', reason: 'Fixture original' }
  const changed = { ...original, status: 'resolved', reason: 'Fixture revised' }
  try {
    const first = service.updateConversationWorkflowBff(original, session)
    const duplicate = service.updateConversationWorkflowBff(original, session)
    const revision = service.updateConversationWorkflowBff(changed, session)
    expect(requests).toHaveLength(2)
    expect(requests[0].key).not.toBe(requests[1].key)
    finish[0](new Response('{"error":{"code":"COMMAND_IN_PROGRESS"}}', { status: 409 }))
    finish[1](new Response('{"ok":true}'))
    expect((await first).ok).toBe(false)
    expect((await duplicate).ok).toBe(false)
    expect((await revision).ok).toBe(true)
    const retry = service.updateConversationWorkflowBff(original, session)
    expect(requests[2]).toEqual(requests[0])
    session.dispose()
    finish[2](new Response('{"ok":true}'))
    expect((await retry).ok).toBe(false)
  } finally {
    session.dispose()
    finish.forEach(resolve => resolve(new Response('{"ok":true}')))
    globalThis.fetch = originalFetch
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
  }
})

test('Inbox retries retain identity until success and then start a new operation', async () => {
  expect(typeof service.createInboxCommandSession).toBe('function')
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  globalThis.document = { cookie: '' }
  const keys = []
  globalThis.fetch = async (_path, init) => {
    keys.push(init.headers['X-K2-Idempotency-Key'])
    return new Response(keys.length === 1 ? '{"error":{"code":"COMMAND_IN_PROGRESS"}}' : '{"ok":true}', { status: keys.length === 1 ? 409 : 200 })
  }
  try {
    const session = service.createInboxCommandSession()
    const body = { conversationId: '11111111-1111-4111-8111-111111111111', content: 'Fixture only' }
    expect((await session.run('send-reply', body)).ok).toBe(false)
    expect((await session.run('send-reply', body)).ok).toBe(true)
    expect((await session.run('send-reply', body)).ok).toBe(true)
    expect(keys[0]).toBe(keys[1])
    expect(keys[2]).not.toBe(keys[1])
    session.dispose()
    expect((await session.run('send-reply', body)).ok).toBe(false)
    expect(keys).toHaveLength(3)
  } finally {
    globalThis.fetch = originalFetch
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
  }
})

test('concurrent identical submissions share one request, different content stays distinct', async () => {
  expect(typeof service.createInboxCommandSession).toBe('function')
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  globalThis.document = { cookie: '' }
  const keys = []
  const finish = []
  globalThis.fetch = (_path, init) => {
    keys.push(init.headers['X-K2-Idempotency-Key'])
    return new Promise(resolve => finish.push(() => resolve(new Response('{"ok":true}'))))
  }
  try {
    const session = service.createInboxCommandSession()
    const first = session.run('internal-note', { conversationId: 'fixture', content: 'A' })
    const repeat = session.run('internal-note', { conversationId: 'fixture', content: 'A' })
    const other = session.run('internal-note', { conversationId: 'fixture', content: 'B' })
    expect(keys).toHaveLength(2)
    expect(keys[0]).not.toBe(keys[1])
    finish.forEach(resolve => resolve())
    expect((await Promise.all([first, repeat, other])).every(result => result.ok)).toBe(true)
    session.dispose()
  } finally {
    finish.forEach(resolve => resolve())
    globalThis.fetch = originalFetch
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
  }
})

test('completion after session disposal cannot report success to the old runtime', async () => {
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  globalThis.document = { cookie: '' }
  let finish
  globalThis.fetch = () => new Promise(resolve => { finish = resolve })
  try {
    const session = service.createInboxCommandSession()
    const pending = session.run('internal-note', { conversationId: 'fixture', content: 'Old staff request' })
    session.dispose()
    finish(new Response('{"ok":true}'))
    expect((await pending).ok).toBe(false)
  } finally {
    globalThis.fetch = originalFetch
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
  }
})

test('a lost or unavailable response is reported as uncertain, not as a clean failure', async () => {
  const { commandOutcomeIsUncertain } = service

  expect(commandOutcomeIsUncertain({ ok: false, code: 'REQUEST_TIMEOUT' })).toBe(true)
  expect(commandOutcomeIsUncertain({ ok: false, code: 'ADMIN_SERVICE_UNAVAILABLE' })).toBe(true)
  expect(commandOutcomeIsUncertain({ ok: false, code: 'REQUEST_INVALID' })).toBe(false)
  expect(commandOutcomeIsUncertain({ ok: false, code: 'SESSION_EXPIRED' })).toBe(false)
  expect(commandOutcomeIsUncertain({ ok: true })).toBe(false)
  expect(commandOutcomeIsUncertain(undefined)).toBe(false)
})

test('the command session reports how many operations are still unresolved', async () => {
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  globalThis.document = { cookie: '' }
  let attempts = 0
  globalThis.fetch = async () => {
    attempts += 1
    if (attempts === 1) throw new TypeError('Fixture response lost after submission')
    return new Response('{"ok":true}')
  }
  const session = service.createInboxCommandSession()
  try {
    expect(session.unresolvedCount()).toBe(0)
    expect((await service.markConversationReadBff('11111111-1111-4111-8111-111111111111', session)).ok).toBe(false)
    expect(session.unresolvedCount()).toBe(1)
    expect((await service.markConversationReadBff('11111111-1111-4111-8111-111111111111', session)).ok).toBe(true)
    expect(session.unresolvedCount()).toBe(0)
    session.dispose()
    expect(session.unresolvedCount()).toBe(0)
  } finally {
    session.dispose()
    globalThis.fetch = originalFetch
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
  }
})
