import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import * as service from '../src/services/adminBffService.js'

/**
 * MAP-019 / MAP-028 H-002 for mutation owners outside the Inbox.
 *
 * A staff retry after a lost response must reach the server as the same logical
 * operation, or the idempotency mechanism cannot deduplicate it and the stock or
 * money effect can be applied twice.
 */

function fixtureTransport() {
  const calls = []
  let failNext = false
  return {
    calls,
    failOnce() { failNext = true },
    send: async (payload, key) => {
      calls.push({ payload, key })
      if (failNext) { failNext = false; return { ok: false, code: 'ADMIN_SERVICE_UNAVAILABLE' } }
      return { ok: true }
    },
  }
}

test('a retained operation session replays one logical operation until it resolves', async () => {
  const transport = fixtureTransport()
  const session = service.createRetainedOperationSession(transport.send)
  const payload = { kind: 'extend', reservationId: 'r-1', minutes: 60 }

  transport.failOnce()
  expect((await session.run(payload)).ok).toBe(false)
  expect(session.unresolvedCount()).toBe(1)

  expect((await session.run(payload)).ok).toBe(true)
  expect(transport.calls[1].key).toBe(transport.calls[0].key)
  expect(session.unresolvedCount()).toBe(0)

  // A deliberate repeat of the same change after success is a new operation.
  expect((await session.run(payload)).ok).toBe(true)
  expect(transport.calls[2].key).not.toBe(transport.calls[1].key)
})

test('different payloads stay separate operations and concurrent identical calls share one request', async () => {
  const transport = fixtureTransport()
  const session = service.createRetainedOperationSession(transport.send)

  await session.run({ kind: 'extend', reservationId: 'r-1', minutes: 60 })
  await session.run({ kind: 'extend', reservationId: 'r-1', minutes: 240 })
  expect(transport.calls[1].key).not.toBe(transport.calls[0].key)

  const [first, second] = await Promise.all([
    session.run({ kind: 'release', limit: 500 }),
    session.run({ kind: 'release', limit: 500 }),
  ])
  expect(first).toEqual(second)
  expect(transport.calls).toHaveLength(3)
})

test('a disposed session refuses new work and reports nothing unresolved', async () => {
  const transport = fixtureTransport()
  const session = service.createRetainedOperationSession(transport.send)
  transport.failOnce()
  await session.run({ kind: 'release', limit: 500 })
  expect(session.unresolvedCount()).toBe(1)
  session.dispose()
  expect(session.unresolvedCount()).toBe(0)
  expect((await session.run({ kind: 'release', limit: 500 })).ok).toBe(false)
  expect(transport.calls).toHaveLength(1)
})

test('stock holds retry as one operation and report unconfirmed outcomes distinctly', async () => {
  const source = await readFile(new URL('../src/views/admin/ReservationHolds.jsx', import.meta.url), 'utf8')

  expect(source).toContain('createRetainedOperationSession')
  expect(source).toContain('commandOutcomeIsUncertain')
  expect(source).toContain('UNCERTAIN_COMMAND_NOTICE')
  // No caller may mint a fresh identity per attempt any more.
  expect(source).not.toContain('}, operationKey())')
})

test('delivery rate commands retry as one operation and report unconfirmed outcomes distinctly', async () => {
  const source = await readFile(new URL('../src/views/admin/DeliveryRateControl.jsx', import.meta.url), 'utf8')

  expect(source).toContain('createRetainedOperationSession')
  expect(source).toContain('commandOutcomeIsUncertain')
  expect(source).toContain('UNCERTAIN_COMMAND_NOTICE')
  expect(source).not.toContain('}, operationKey())')
})

test('consignment commands keep the slot-bound identity they already had', async () => {
  const source = await readFile(new URL('../src/views/admin/ConsignmentManager.jsx', import.meta.url), 'utf8')

  // This screen already retains a key per command slot until its fingerprint
  // changes or the operation completes. The contract pins that, so a later
  // refactor cannot silently reduce it to one key per attempt.
  expect(source).toContain('existing?.fingerprint === fingerprint')
  expect(source).toContain('const completeOperation = slot => commandKeysRef.current.delete(slot)')
})
