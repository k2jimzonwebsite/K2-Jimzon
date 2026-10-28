import test from 'node:test'
import assert from 'node:assert/strict'
import { stopLocalRuntime } from '../scripts/lib/local-worker-runtime.mjs'
import * as runtimeTools from '../scripts/lib/local-worker-runtime.mjs'

test('failed startup still disposes its owned runtime and preserves the missing-port evidence', async () => {
  let disposed = false
  const result = await stopLocalRuntime({ ready: Promise.reject(new Error('startup failed')), dispose: async () => { disposed = true } })
  assert.equal(disposed, true); assert.equal(result.disposed, true); assert.equal(result.readyObserved, false)
  assert.equal(result.portRefused, false); assert.equal(result.ok, false)
})

test('hung startup is bounded and cannot prevent the disposal attempt or receipt', async () => {
  let disposed = false
  const result = await stopLocalRuntime({ ready: new Promise(() => {}), dispose: async () => { disposed = true } }, { timeoutMs: 15 })
  assert.equal(disposed, true); assert.equal(result.disposed, true); assert.equal(result.ok, false)
})

test('failed or hung disposal does not claim a successful stop', async () => {
  for (const dispose of [async () => { throw new Error('dispose failed') }, () => new Promise(() => {})]) {
    const result = await stopLocalRuntime({ ready: Promise.resolve(new URL('http://127.0.0.1:12345')), dispose }, { timeoutMs: 15 })
    assert.equal(result.disposed, false); assert.equal(result.ok, false); assert.equal(result.portRefused, false)
  }
})

test('successful disposal requires an observed owned-loopback port and refusal probe', async () => {
  let probed
  const result = await stopLocalRuntime({ ready: Promise.resolve(new URL('http://127.0.0.1:12345')), dispose: async () => {} }, {
    probe: async (host, port) => { probed = { host, port } },
  })
  assert.deepEqual(probed, { host: '127.0.0.1', port: 12345 }); assert.equal(result.ok, true); assert.equal(result.portRefused, true)
})

test('untrusted or invalid ready URLs cannot redirect the shutdown probe', async () => {
  for (const url of ['http://unrelated.example:12345', 'http://127.0.0.1']) {
    let disposed = false, probed = false
    const result = await stopLocalRuntime({ ready: Promise.resolve(new URL(url)), dispose: async () => { disposed = true } }, { probe: async () => { probed = true } })
    assert.equal(disposed, true); assert.equal(probed, false); assert.equal(result.ok, false)
  }
})
test('a hung startup reaches owned disposal without entering its operation', async () => {
  let disposed = 0, entered = 0, shutdown
  const owned = { ready: new Promise(() => {}), async dispose() { disposed++ } }
  await assert.rejects(runtimeTools.withLocalRuntimeReady(owned, async () => { entered++ },
    { timeoutMs: 15, onStop: result => { shutdown = result } }))
  assert.equal(disposed, 1); assert.equal(entered, 0)
  assert.equal(shutdown.disposed, true); assert.equal(shutdown.ok, false); assert.equal(shutdown.portRefused, false)
})

test('an operation failure still verifies owned shutdown and preserves the original error', async () => {
  let disposed = 0, shutdown
  const owned = { ready: Promise.resolve('http://127.0.0.1:12222'), async dispose() { disposed++ } }
  await assert.rejects(runtimeTools.withLocalRuntimeReady(owned, async () => { throw new Error('SYNTHETIC_OPERATION_FAILURE') },
    { timeoutMs: 15, probe: async () => {}, onStop: result => { shutdown = result } }), /SYNTHETIC_OPERATION_FAILURE/)
  assert.equal(disposed, 1); assert.equal(shutdown.ok, true)
})

test('hung fixture I/O reaches verified runtime cleanup without advancing the operation', async () => {
  let disposed = 0, advanced = false, shutdown
  const owned = { ready: Promise.resolve('http://127.0.0.1:12222'), async dispose() { disposed++ } }
  await assert.rejects(runtimeTools.withLocalRuntimeReady(owned, async () => {
    await runtimeTools.localRuntimeIo(() => new Promise(() => {}), { timeoutMs: 15 })
    advanced = true
  }, { timeoutMs: 15, probe: async () => {}, onStop: result => { shutdown = result } }),
  error => error.code === 'AUTHORITY_PENDING')
  assert.equal(advanced, false); assert.equal(disposed, 1); assert.equal(shutdown.ok, true)
})
