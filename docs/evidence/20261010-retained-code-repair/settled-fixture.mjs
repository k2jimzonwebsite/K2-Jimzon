// MAP-018 / IDEA-20261010-08. Disposable witness coordination only.
// Native adapters must prove process stop/writer absence and supply the existing
// full physical snapshot SQL. This module cannot establish those facts itself.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

export function createSettledFixture() {
  let sealed = false
  const pending = new Set()
  return {
    async request(operation) {
      if (sealed) throw Error('K2_RETAINED_FIXTURE_SEALED')
      const task = Promise.resolve().then(operation)
      pending.add(task)
      try { return await task }
      finally { pending.delete(task) }
    },
    async capture({ stopBackground, readState, repair, resumeBackground }) {
      if (sealed) throw Error('K2_RETAINED_FIXTURE_SEALED')
      sealed = true
      // Drain every admitted request, including refresh/session/observer work.
      // A failed request must not short-circuit waiting for the other writers.
      const results = await Promise.allSettled([...pending])
      const failed = results.find(result => result.status === 'rejected')
      if (failed) throw failed.reason
      const stopped = await stopBackground()
      assert.ok(stopped?.authStopped === true && stopped.restStopped === true &&
        stopped.activeWriters === 0, 'K2_RETAINED_BACKGROUND_NOT_SETTLED')
      const read = async () => {
        const bytes = await readState()
        assert.ok(Buffer.isBuffer(bytes) && bytes.length > 0,
          'K2_RETAINED_PRIVATE_SNAPSHOT_REQUIRED')
        return Buffer.from(bytes)
      }
      const before = await read()
      assert.ok(before.equals(await read()), 'K2_RETAINED_STATE_CHANGED_BEFORE_REPAIR')
      await repair()
      assert.ok(before.equals(await read()), 'K2_RETAINED_STATE_CHANGED_AFTER_REPAIR')
      // Failed repair/capture/resumption stays sealed for explicit cleanup.
      await resumeBackground()
      sealed = false
      return { conserved: true,
        stateSha256: createHash('sha256').update(before).digest('hex') }
    },
  }
}
