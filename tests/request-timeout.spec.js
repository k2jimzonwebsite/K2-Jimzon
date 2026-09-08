import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { fetchReadWithRetry, fetchWithTimeout } from '../src/lib/fetchWithTimeout.js'

test('deadline includes a stalled response body and never retries a write', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async (_input, init) => {
    calls += 1
    return new Response(new ReadableStream({
      start(controller) {
        init.signal.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')), { once: true })
      },
    }))
  }
  try {
    await expect(fetchWithTimeout('/command', { method: 'POST' }, 100)).rejects.toMatchObject({ name: 'RequestTimeoutError' })
    expect(calls).toBe(1)
  } finally { globalThis.fetch = originalFetch }
})

test('a complete response retains its payload and HTTP metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response('{"ok":true}', { status: 202, headers: { 'Content-Type': 'application/json', 'X-Receipt': 'fixture' } })
  try {
    const response = await fetchWithTimeout('/complete', {}, 100)
    expect(response.status).toBe(202)
    expect(response.headers.get('X-Receipt')).toBe('fixture')
    expect(await response.json()).toEqual({ ok: true })
  } finally { globalThis.fetch = originalFetch }
})

test('caller cancellation during body download stays an abort', async () => {
  const originalFetch = globalThis.fetch
  const caller = new AbortController()
  let bodyStarted
  const started = new Promise(resolve => { bodyStarted = resolve })
  globalThis.fetch = async (_input, init) => new Response(new ReadableStream({
    start(controller) {
      init.signal.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')), { once: true })
      bodyStarted()
    },
  }))
  try {
    const pending = fetchWithTimeout('/body', { signal: caller.signal }, 1000)
    await started
    caller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  } finally { globalThis.fetch = originalFetch }
})

test('bodyless responses remain valid', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response(null, { status: 204 })
  try {
    const response = await fetchWithTimeout('/empty', {}, 100)
    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
  } finally { globalThis.fetch = originalFetch }
})

test('request timeout aborts a stalled fetch with a stable error', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (_input, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
  })
  try {
    await expect(fetchWithTimeout('/stalled', {}, 100)).rejects.toMatchObject({
      name: 'RequestTimeoutError', message: 'REQUEST_TIMEOUT',
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('caller cancellation remains distinct from a request timeout', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (_input, init) => new Promise((_resolve, reject) => {
    if (init.signal.aborted) reject(new DOMException('aborted', 'AbortError'))
    else init.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
  })
  const controller = new AbortController()
  controller.abort()
  try {
    await expect(fetchWithTimeout('/cancelled', { signal: controller.signal }, 1000)).rejects.toMatchObject({ name: 'AbortError' })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('safe reads retry transient responses with capped exponential jitter', async () => {
  const originalFetch = globalThis.fetch
  const statuses = [503, 502, 200]
  let calls = 0
  globalThis.fetch = async () => new Response('{}', { status: statuses[calls++] })
  try {
    const response = await fetchReadWithRetry('/safe-read', {}, {
      timeoutMs: 1000, baseDelayMs: 1, maxDelayMs: 2, random: () => 0,
    })
    expect(response.status).toBe(200)
    expect(calls).toBe(3)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('safe reads retry transient network failures without exposing provider details', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    if (calls === 1) throw new TypeError('private network diagnostic')
    return new Response('{}', { status: 200 })
  }
  try {
    const response = await fetchReadWithRetry('/network-recovery', {}, {
      timeoutMs: 1000, baseDelayMs: 1, maxDelayMs: 1, random: () => 0,
    })
    expect(response.status).toBe(200)
    expect(calls).toBe(2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('safe-read retries reject commands and do not retry ordinary client errors', async () => {
  await expect(fetchReadWithRetry('/unsafe', { method: 'POST' })).rejects.toThrow('READ_RETRY_METHOD_UNSAFE')

  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return new Response('{}', { status: 404 })
  }
  try {
    const response = await fetchReadWithRetry('/missing', {}, {
      timeoutMs: 1000, baseDelayMs: 1, maxDelayMs: 1,
    })
    expect(response.status).toBe(404)
    expect(calls).toBe(1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('large Retry-After responses return immediately for explicit user recovery', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return new Response('{}', { status: 429, headers: { 'Retry-After': '60' } })
  }
  try {
    const response = await fetchReadWithRetry('/rate-limited', {}, {
      timeoutMs: 1000, baseDelayMs: 1, maxDelayMs: 10,
    })
    expect(response.status).toBe(429)
    expect(calls).toBe(1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('caller cancellation interrupts read backoff and prevents another attempt', async () => {
  const originalFetch = globalThis.fetch
  const controller = new AbortController()
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return new Response('{}', { status: 503 })
  }
  try {
    const pending = fetchReadWithRetry('/cancel-backoff', { signal: controller.signal }, {
      timeoutMs: 1000, baseDelayMs: 100, maxDelayMs: 100,
    })
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toBe(1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('browser API boundaries use explicit deadlines and do not auto-retry commands', async () => {
  const [guest, admin, auth] = await Promise.all([
    readFile(new URL('../src/services/guestCommerceService.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/services/adminBffService.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/context/useAdminAuthRuntime.js', import.meta.url), 'utf8'),
  ])
  expect(guest).toContain('fetchWithTimeout(endpoint')
  expect(guest).toContain('}, 15000)')
  expect(admin).toContain("method === 'GET'")
  expect(admin).toContain('fetchReadWithRetry(path, requestInit, { timeoutMs: 10000 })')
  expect(admin).toContain('timeoutMs = 15000')
  expect(admin).toContain('fetchWithTimeout(path, requestInit, timeoutMs)')
  expect(admin).toContain("timeoutMs: body.action === 'start' ? 125000 : 15000")
  expect(admin).toContain('}, 30000)')
  expect(auth).toContain('}, 15000)')
  for (const source of [guest, admin, auth]) {
    expect(source).not.toMatch(/for\s*\([^)]*attempt/i)
    expect(source).not.toMatch(/while\s*\([^)]*retry/i)
  }
})
