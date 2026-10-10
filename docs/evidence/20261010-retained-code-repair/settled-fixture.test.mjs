// MAP-018 / IDEA-20261010-08: coordinator mechanics, not native repair evidence.
import test from 'node:test'
import assert from 'node:assert/strict'

const load = async () => {
  try { return await import('./settled-fixture.mjs') }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') return {}
    throw error
  }
}
const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const state = Buffer.from('complete private snapshot\n')
const stopped = { authStopped: true, restStopped: true, activeWriters: 0 }

test('waits for every pending request and rejects new requests before capture', async () => {
  const { createSettledFixture } = await load()
  assert.equal(typeof createSettledFixture, 'function', 'settled fixture boundary missing')
  const fixture = createSettledFixture(), pending = deferred(), entered = deferred()
  const request = fixture.request(async () => { entered.resolve(); await pending.promise })
  await entered.promise
  let stopCalls = 0, repairs = 0
  const capture = fixture.capture({
    stopBackground: async () => { stopCalls++; return stopped },
    readState: async () => state,
    repair: async () => { repairs++ },
    resumeBackground: async () => {},
  })
  await assert.rejects(fixture.request(async () => assert.fail('must not execute')), /SEALED/)
  assert.equal(stopCalls, 0)
  pending.resolve()
  await request
  const result = await capture
  assert.equal(stopCalls, 1)
  assert.equal(repairs, 1)
  assert.equal(result.conserved, true)
  assert.match(result.stateSha256, /^[a-f0-9]{64}$/)
  await fixture.request(async () => {})
})

test('a pending failure drains other requests and refuses repair', async () => {
  const { createSettledFixture } = await load()
  assert.equal(typeof createSettledFixture, 'function', 'settled fixture boundary missing')
  const fixture = createSettledFixture(), one = deferred(), two = deferred()
  const first = fixture.request(() => one.promise)
  const second = fixture.request(() => two.promise)
  const failed = assert.rejects(first, /REQUEST_FAILED/)
  let stopCalls = 0
  const capture = fixture.capture({ stopBackground: async () => { stopCalls++; return stopped } })
  const refused = assert.rejects(capture, /REQUEST_FAILED/)
  one.reject(Error('REQUEST_FAILED'))
  await failed
  assert.equal(stopCalls, 0)
  two.resolve()
  await second
  await refused
  await assert.rejects(fixture.request(async () => {}), /SEALED/)
})

for (const [name, witness] of [
  ['Auth still running', { ...stopped, authStopped: false }],
  ['PostgREST still running', { ...stopped, restStopped: false }],
  ['active database writer', { ...stopped, activeWriters: 1 }],
  ['missing stop witness', undefined],
]) test(name + ' refuses capture and repair', async () => {
  const { createSettledFixture } = await load()
  assert.equal(typeof createSettledFixture, 'function', 'settled fixture boundary missing')
  const fixture = createSettledFixture()
  await assert.rejects(fixture.capture({
    stopBackground: async () => witness,
    readState: async () => assert.fail('must not capture'),
    repair: async () => assert.fail('must not repair'),
  }), /BACKGROUND_NOT_SETTLED/)
})

for (const when of ['before', 'after']) test(when + ' state drift refuses success and resumption', async () => {
  const { createSettledFixture } = await load()
  assert.equal(typeof createSettledFixture, 'function', 'settled fixture boundary missing')
  const fixture = createSettledFixture()
  let captures = 0, repairs = 0
  await assert.rejects(fixture.capture({
    stopBackground: async () => stopped,
    readState: async () => (++captures === (when === 'before' ? 2 : 3) ? Buffer.from('changed') : state),
    repair: async () => { repairs++ },
    resumeBackground: async () => assert.fail('must not resume'),
  }), /STATE_CHANGED/)
  assert.equal(repairs, when === 'before' ? 0 : 1)
  await assert.rejects(fixture.request(async () => {}), /SEALED/)
})

test('repair failure stays sealed for explicit fixture recovery', async () => {
  const { createSettledFixture } = await load()
  assert.equal(typeof createSettledFixture, 'function', 'settled fixture boundary missing')
  const fixture = createSettledFixture()
  await assert.rejects(fixture.capture({
    stopBackground: async () => stopped,
    readState: async () => state,
    repair: async () => { throw Error('REPAIR_REFUSED') },
    resumeBackground: async () => assert.fail('must not resume'),
  }), /REPAIR_REFUSED/)
  await assert.rejects(fixture.request(async () => {}), /SEALED/)
})

test('failed service resumption cannot reopen request admission', async () => {
  const { createSettledFixture } = await load()
  assert.equal(typeof createSettledFixture, 'function', 'settled fixture boundary missing')
  const fixture = createSettledFixture()
  await assert.rejects(fixture.capture({
    stopBackground: async () => stopped,
    readState: async () => state,
    repair: async () => {},
    resumeBackground: async () => { throw Error('SERVICE_NOT_HEALTHY') },
  }), /SERVICE_NOT_HEALTHY/)
  await assert.rejects(fixture.request(async () => {}), /SEALED/)
})
