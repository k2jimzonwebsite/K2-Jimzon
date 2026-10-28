import test from 'node:test'
import assert from 'node:assert/strict'
import { withAuthorityScope } from '../server/privacy-authority/bounds.js'

const refuses = promise => assert.rejects(promise, error => error.code === 'AUTHORITY_PENDING')
test('elapsed synchronous adapter time cannot permit another I/O before the timer runs', async () => {
  let later = 0
  await refuses(withAuthorityScope(async scope => {
    await scope.io(() => { const end = performance.now() + 45; while (performance.now() < end) {} })
    await scope.io(() => { later++ })
  }, { deadlineMs: 10 }))
  assert.equal(later, 0)
})

test('a microtask chain cannot defer the elapsed deadline until after later I/O', async () => {
  let later = 0
  await refuses(withAuthorityScope(async scope => {
    await scope.io(async () => { const end = performance.now() + 35; while (performance.now() < end) await Promise.resolve() })
    await scope.io(() => { later++ })
  }, { deadlineMs: 10 }))
  assert.equal(later, 0)
})

test('nested authority scopes inherit the original absolute deadline and expose checked remaining time', async () => {
  await withAuthorityScope(async parent => {
    assert.equal(typeof parent.remainingMs, 'function')
    const end = performance.now() + 25; while (performance.now() < end) {}
    await withAuthorityScope(async child => {
      assert.equal(child.deadlineAt, parent.deadlineAt)
      assert.ok(child.remainingMs() < 80)
      assert.ok(child.remainingMs() <= parent.remainingMs() + 1)
    }, { deadlineMs: 9000, signal: parent.signal, deadlineAt: parent.deadlineAt })
  }, { deadlineMs: 100 })
})
