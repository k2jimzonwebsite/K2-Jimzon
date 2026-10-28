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
